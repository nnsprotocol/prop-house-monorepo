import classes from './RoundsFeed.module.css';
import { RoundWithHouse, usePropHouse } from '@prophouse/sdk-react';
import React, { useEffect, useState } from 'react';
import { Col, Row } from 'react-bootstrap';
import JumboRoundCard from '../JumboRoundCard';
import LoadingIndicator from '../LoadingIndicator';
import Button, { ButtonColor } from '../Button';
import { useAccount } from 'wagmi';
import { getFavoriteCommunities } from '../../hooks/useFavoriteCommunities';
import { RoundsFilter, useRoundsFilter } from '../../hooks/useRoundsFilter';
import { GiSurprisedSkull } from 'react-icons/gi';
import { FaRegSurprise } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const RoundsFeed: React.FC<{}> = () => {
  const propHouse = usePropHouse();
  const { address: account } = useAccount();
  const navigate = useNavigate();
  const favorites = getFavoriteCommunities();
  // eslint-disable-next-line
  const { roundsFilter, updateRoundsFilter } = useRoundsFilter();

  const [rounds, setRounds] = useState<RoundWithHouse[]>();
  const [fetchingRounds, setFetchingRounds] = useState(true);
  const [fetchNewRounds, setFetchNewRounds] = useState(true);
  const [noMoreRounds, setNoMoreRounds] = useState(false);
  const [pageIndex, setPageIndex] = useState(1);

  useEffect(() => {
    if (!fetchNewRounds) return;

    const _fetchRounds = async () => {
      try {
        setFetchingRounds(true);
        setFetchNewRounds(false);

        const queryParams = {
          page: pageIndex,
          perPage: 6,
        };
        const query =
          roundsFilter === RoundsFilter.Relevant && !account
            ? propHouse.query.getRoundsWithHouseInfo(queryParams)
            : roundsFilter === RoundsFilter.Relevant && account
            ? propHouse.query.getRoundsWithHouseInfoRelevantToAccount(account, queryParams)
            : roundsFilter === RoundsFilter.Favorites
            ? propHouse.query.getRoundsWithHouseInfo({
                ...queryParams,
                where: {
                  house_in: favorites,
                },
              })
            : propHouse.query.getRoundsWithHouseInfo(queryParams);

        const fetchedRounds = await query;

        setFetchingRounds(false);

        if (fetchedRounds.length === 0) {
          setNoMoreRounds(false);
          return;
        }

        setPageIndex(prev => prev + 1);
        setRounds(prev => {
          if (prev) return [...prev, ...fetchedRounds];
          return fetchedRounds;
        });
      } catch (e) {
        console.log(e);
        setFetchNewRounds(false);
        setFetchingRounds(false);
      }
    };
    _fetchRounds();
  }, [
    pageIndex,
    fetchingRounds,
    fetchNewRounds,
    propHouse.query,
    rounds,
    account,
    favorites,
    roundsFilter,
  ]);

  return (
    <>
      {fetchingRounds && !rounds ? (
        <LoadingIndicator />
      ) : roundsFilter === RoundsFilter.Favorites && favorites.length === 0 ? (
        <div className={classes.emptyContentContainer}>
          <GiSurprisedSkull size={100} />
          <p>You haven't added any communities to your favorites. </p>
          <Button
            text="Add one now"
            bgColor={ButtonColor.Pink}
            onClick={() => navigate('/communities')}
          />
        </div>
      ) : roundsFilter === RoundsFilter.Favorites &&
        favorites.length > 0 &&
        rounds?.length === 0 ? (
        <div>
          <FaRegSurprise />
          <div>Your favorite communites haven't run any rounds yet... awkward.</div>
        </div>
      ) : (
        <>
          <Row>
            {rounds &&
              rounds.map((round, i) => {
                return (
                  <Col xl={12} key={i}>
                    <JumboRoundCard round={round} house={round.house} />
                  </Col>
                );
              })}
          </Row>
          <Row>
            <Col>
              <Button
                bgColor={ButtonColor.PurpleLight}
                text={
                  noMoreRounds
                    ? 'No more rounds available'
                    : fetchingRounds
                    ? 'Loading...'
                    : 'Load more rounds'
                }
                classNames={classes.loadMoreBtn}
                onClick={() => setFetchNewRounds(true)}
                disabled={noMoreRounds || fetchingRounds}
              />
            </Col>
          </Row>
        </>
      )}
    </>
  );
};
export default RoundsFeed;
