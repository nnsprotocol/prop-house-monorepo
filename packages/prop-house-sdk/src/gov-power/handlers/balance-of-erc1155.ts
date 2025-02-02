import { JsonRpcProvider } from '@ethersproject/providers';
import { BalanceOfERC1155Config, ChainConfig, GovPowerStrategyType, GovPowerConfig, AccountField } from '../../types';
import { ChainId } from '@prophouse/protocol';
import { SingleSlotProofHandler } from './base';
import { encoding, splitUint256, storageProofs } from '../../utils';
import { BigNumber } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { BALANCE_OF_SLOT_QUERY_ADDRESS, BALANCE_OF_ERC1155_FUNC, BALANCE_OF_ERC1155_SLOT_TRACER } from '../../constants';
import { Call } from 'starknet';
import { Zero } from '@ethersproject/constants';

export class BalanceOfERC1155Handler extends SingleSlotProofHandler<BalanceOfERC1155Config> {
  // prettier-ignore
  private readonly _traceRpcs: Record<number, string> = {
    [ChainId.EthereumGoerli]: 'https://goerli.blockpi.network/v1/rpc/756ed7f20b1fcbed679bc9384c021a69ffd59cfc',
    [ChainId.EthereumMainnet]: 'https://ethereum.blockpi.network/v1/rpc/515fa4f00418c429db4f81cda04b628e7ecc7191',
    [ChainId.EthereumHardhat]: 'https://localhost:8545/',
  };
  private readonly _traceProvider: JsonRpcProvider;

  /**
   * Returns a `BalanceOfERC1155Handler` instance for the provided chain configuration
   * @param config The chain config
   */
  public static for(config: ChainConfig) {
    return new BalanceOfERC1155Handler(config);
  }

  /**
   * The governance power strategy type
   */
  public get type() {
    return GovPowerStrategyType.BALANCE_OF_ERC1155;
  }

  /**
   * The governance power strategy address
   */
  public get address() {
    return this._addresses.starknet.govPower.balanceOfErc1155;
  }

  /**
   * @param config The chain config
   */
  constructor(config: ChainConfig) {
    super(config);

    if (!this._traceRpcs[this._evmChainId]) {
      throw new Error(`No trace provider available for chain with ID: ${this._evmChainId}`);
    }
    this._traceProvider = new JsonRpcProvider(this._traceRpcs[this._evmChainId]);
  }

  /**
   * @notice Get the governance power strategy params that will be shared amongst all users
   * @param strategy The governance power strategy information
   */
  public async getStrategyParams(strategy: BalanceOfERC1155Config): Promise<string[]> {
    const { slotIndex } = await storageProofs.getSlotIndexOfQueriedMapping(
      this._traceProvider,
      strategy.address,
      BALANCE_OF_ERC1155_SLOT_TRACER,
      BALANCE_OF_ERC1155_FUNC,
      'balanceOf',
      [BALANCE_OF_SLOT_QUERY_ADDRESS, Zero],
    );
    if (strategy.multiplier && BigNumber.from(strategy.multiplier).gt(1)) {
      return [strategy.address, slotIndex, strategy.tokenId, strategy.multiplier.toString()];
    }
    return [strategy.address, slotIndex, strategy.tokenId];
  }

  public async getUserParams(account: string, timestamp: string, strategyId: string) {
    const strategy = await this.getStrategyAddressAndParams(strategyId);
    const [contractAddress, slotIndex, tokenId] = strategy.params;

    const slotKey = encoding.getNestedSlotKey([account, tokenId], slotIndex);
    const slotKeyU256 = splitUint256.SplitUint256.fromHex(slotKey);

    const block = await this.getBlockNumberForTimestamp(timestamp);
    const proofInputs = await this.fetchProofInputs(contractAddress, slotKey, block);
    return [
      // Storage Key (u256)
      slotKeyU256.low,
      slotKeyU256.high,
      // Storage Proof
      `0x${proofInputs.storageProofSubArrayLength.toString(16)}`,
      ...proofInputs.storageProof,
    ]
  }

  public async getStrategyPreCalls(
    account: string,
    timestamp: string,
    strategyId: string,
  ): Promise<Call[]> {
    const strategy = await this.getStrategyAddressAndParams(strategyId);
    const [contractAddress, slotIndex, tokenId] = strategy.params;

    const slotKey = encoding.getNestedSlotKey([account, tokenId], slotIndex);

    const block = await this.getBlockNumberForTimestamp(timestamp);
    const storageHash = await this.getStorageHash(contractAddress, block);

    // We only need to prove the account if the storage hash hasn't been populated.
    if (storageHash.isZero()) {
      const [proofInputs, processBlockInputs] = await Promise.all([
        this.fetchProofInputs(contractAddress, slotKey, block),
        storageProofs.getProcessBlockInputsForBlockNumber(
          this.provider,
          block,
          this._evmChainId,
        ),
      ]);
      return [
        {
          contractAddress: this._addresses.starknet.herodotus.factRegistry,
          entrypoint: 'prove_account',
          calldata: [
            // Account Fields
            1,
            AccountField.StorageHash,
            // Block Header RLP
            processBlockInputs.headerInts.length,
            ...processBlockInputs.headerInts,
            // Account
            contractAddress,
            // Proof
            proofInputs.accountProofSubArrayLength,
            ...proofInputs.accountProof,
          ],
        },
      ];
    }
    return [];
  }

  /**
   * Get the total governance power for the provided config
   * @param config The governance power strategy config information
   */
  public async getPower(config: GovPowerConfig): Promise<BigNumber> {
    const block = await this.getBlockNumberForTimestamp(config.timestamp);
    const token = BigNumber.from(config.params[0]).toHexString();
    const balance = await this.contractFor(token).balanceOf(config.user, config.params[2], {
      blockTag: block,
    });
    return balance.mul(config.params?.[3] ?? 1);
  }

  /**
   * Returns a contract instance for the provided token address
   * @param token The token address
   */
  private contractFor(token: string) {
    return new Contract(token, [BALANCE_OF_ERC1155_FUNC], this._evm);
  }
}
