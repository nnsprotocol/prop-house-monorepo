import classes from './IndividualAwards.module.css';
import Text from '../Text';
import Group from '../Group';
import { NewRound } from '../../../state/slices/round';
import { useDispatch } from 'react-redux';
import { AssetType } from '@prophouse/sdk-react';
import Button, { ButtonColor } from '../../Button';
import { Award, NewAward, erc20TokenAddresses } from '../AssetSelector';
import { SetStateAction, useState } from 'react';
import Modal from '../../Modal';
import { useAppSelector } from '../../../hooks';
import { getERC20Image } from '../../../utils/getERC20Image';
import AwardWithPlace from '../AwardWithPlace';
import AddAward from '../AddAward';
import getNumberWithOrdinal from '../../../utils/getNumberWithOrdinal';
import AwardRow from '../AwardRow';
import { getTokenIdImage } from '../../../utils/getTokenIdImage';
import { saveRound } from '../../../state/thunks';
import { v4 as uuidv4 } from 'uuid';
import { useEthersProvider } from '../../../hooks/useEthersProvider';

/**
 * @see editMode is used to determine whether or not we're editing from Step 6,
 * in which case we don't want to dispatch the saveRound thunk, rather we want to
 * track the changes in the parent component and dispatch the saveRound thunk
 * when the user clicks "Save Changes"
 */

const IndividualAwards: React.FC<{
  editMode?: boolean;
  awards: Award[];
  setAwards: React.Dispatch<SetStateAction<Award[]>>;
  editedRound?: NewRound;
  setEditedRound?: React.Dispatch<React.SetStateAction<NewRound>>;
}> = props => {
  const { editMode, awards, setAwards, editedRound, setEditedRound } = props;

  const [showIndividualAwardModal, setShowIndividualAwardModal] = useState(false);
  const [award, setAward] = useState({ ...NewAward, type: AssetType.ERC20 });
  const [awardIdx, setAwardIdx] = useState(0);

  const provider = useEthersProvider();
  const dispatch = useDispatch();
  const round = useAppSelector(state => state.round.round);

  const isDuplicate = awards.some(a => a.address === award.address && a.tokenId === award.tokenId);

  const handleSaveAward = async () => {
    let image_url = null;

    if (isDuplicate) {
      setAward({
        ...award,
        state: 'error',
        error: `An award with ${award.name} #${award.tokenId} already exists`,
      });
      return;
    }

    // We need to fetch the image for ERC721 and ERC1155 tokens if the user does not blur the input, which also fetches the image
    if (award.type === AssetType.ERC721 || (award.type === AssetType.ERC1155 && !award.image)) {
      try {
        const { image } = await getTokenIdImage(award.address, award.tokenId!, provider);
        image_url = image;
      } catch (error) {
        console.error('Error fetching image', error);
      }
    }

    let updated: Partial<Award>;

    updated = {
      address:
        award.selectedAsset === null ? award.address : erc20TokenAddresses[award.selectedAsset],
      amount: award.amount,
      id: award.id,
      image:
        award.selectedAsset === null
          ? award.type === AssetType.ERC721 || award.type === AssetType.ERC1155
            ? image_url
            : award.image
          : getERC20Image(award.selectedAsset!),
      name: award.name,
      price: award.price,
      selectedAsset: award.selectedAsset,
      state: 'success',
      symbol: award.symbol,
      tokenId: award.tokenId,
      type: award.type,
    };

    const updatedAwards = awards.map(a => {
      if (a.id === award.id) {
        return { ...a, ...updated };
      } else {
        return { ...a };
      }
    });

    if (editMode) {
      const filteredAwards = updatedAwards.filter(award => award.state === 'success');
      setEditedRound!({
        ...editedRound!,
        numWinners: filteredAwards.length,
        awards: filteredAwards,
      });
    } else {
      setAwards(updatedAwards);
      dispatch(
        saveRound({
          ...round,
          numWinners: updatedAwards.length,
          awards: updatedAwards,
        }),
      );
    }

    setAwardIdx(0);
    setShowIndividualAwardModal(false);
  };

  const handleModalClose = () => {
    setAwardIdx(0);
    setShowIndividualAwardModal(false);
  };

  const addNewAward = () => {
    const updatedAwards = [...awards, { ...NewAward, id: uuidv4() }];

    if (editMode) {
      setEditedRound!({
        ...editedRound!,
        splitAwards: false,
        numWinners: updatedAwards.length,
        awards: updatedAwards,
      });
    } else {
      setAwards(updatedAwards);
    }
  };

  const removeAward = (id: string) => {
    let updated: Award[] = awards.filter(award => award.id !== id);

    if (editMode) {
      const filteredAwards = updated.filter(award => award.state === 'success');

      setEditedRound!({
        ...editedRound!,
        splitAwards: false,
        numWinners: filteredAwards.length,
        awards: filteredAwards,
      });
    } else {
      dispatch(saveRound({ ...round, numWinners: updated.length, awards: updated }));
      setAwards(updated);
    }
  };

  const isDisabled = () => {
    if (award.state !== 'success') {
      return true;
    }

    if (award.type === AssetType.ERC20) {
      return award.amount <= 0 || award.selectedAsset === null;
    } else if (award.type === AssetType.ERC1155 || award.type === AssetType.ERC721) {
      return award.tokenId === '';
    }
  };

  return (
    <>
      {showIndividualAwardModal && (
        <Modal
          modalProps={{
            title:
              award.state === 'success'
                ? `Edit ${getNumberWithOrdinal(awardIdx)} place`
                : 'Add award',
            subtitle: '',
            handleClose: handleModalClose,
            body: <AddAward award={award} setAward={setAward} />,
            button: (
              <Button
                text={'Save Changes'}
                bgColor={ButtonColor.Purple}
                onClick={handleSaveAward}
                disabled={isDisabled()}
              />
            ),
            setShowModal: setShowIndividualAwardModal,
          }}
        />
      )}
      <Group gap={16}>
        {awards.map((award, idx) => {
          const isSaved = editMode
            ? awards.some(
                savedAward => savedAward.id === award.id && savedAward.state === 'success',
              )
            : round.awards.some(
                savedAward => savedAward.id === award.id && savedAward.state === 'success',
              );

          return (
            <Group key={award.id} gap={8}>
              <AwardWithPlace place={idx + 1} />
              <Group row gap={8}>
                {isSaved ? (
                  <>
                    <AwardRow award={award} />
                    <Button
                      text="Edit"
                      classNames={classes.awardBtn}
                      bgColor={ButtonColor.White}
                      onClick={() => {
                        setAwardIdx(idx + 1);
                        setShowIndividualAwardModal(true);
                        setAward(awards[idx]);
                      }}
                    />
                  </>
                ) : (
                  <Button
                    text="Add award"
                    bgColor={ButtonColor.White}
                    classNames={classes.awardBtn}
                    onClick={() => {
                      setShowIndividualAwardModal(true);
                      setAward(awards[idx]);
                    }}
                  />
                )}
                {idx !== 0 && (
                  <Button
                    text="Remove"
                    bgColor={ButtonColor.White}
                    onClick={() => removeAward(award.id)}
                  />
                )}
              </Group>
            </Group>
          );
        })}
        <Text type="link" onClick={addNewAward}>
          Add more awards
        </Text>
      </Group>
    </>
  );
};

export default IndividualAwards;
