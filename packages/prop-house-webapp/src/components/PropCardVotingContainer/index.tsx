import { Row, Col } from "react-bootstrap";
import classes from "./PropCardVotingContainer.module.css";
import { ProposalCardStatus } from "../../utils/cardStatus";
import { VoteAllotment, votesForProp } from "../../utils/voteAllotment";
import { StoredProposal } from "@nouns/prop-house-wrapper/dist/builders";
import Button, { ButtonColor } from "../Button";

interface PropCardVotingContainerProps {
  proposal: StoredProposal;
  cardStatus: ProposalCardStatus;
  votesFor: number;
  voteAllotments: VoteAllotment[];
  canAllotVotes: () => boolean;
  handleVoteAllotment: (proposalId: number, support: boolean) => void;
}

const PropCardVotingContainer: React.FC<{
  props: PropCardVotingContainerProps;
}> = (props) => {
  const {
    proposal,
    cardStatus,
    votesFor,
    voteAllotments,
    canAllotVotes,
    handleVoteAllotment,
  } = props.props;

  const allotedVotesForProp = votesForProp(voteAllotments, proposal.id);

  const handleClick = (e: any, direction: boolean) => {
    e.stopPropagation();
    handleVoteAllotment(proposal.id, direction);
  };

  return (
    <Row>
      <Col
        xs={12}
        className={classes.bottomContainer}
        onClick={(e: any) => e.stopPropagation()}
      >
        <div className={classes.votesCopyContainer}>
          {cardStatus === ProposalCardStatus.Voting && (
            <div className={classes.yourVotesCopy}>Votes: {votesFor}</div>
          )}
        </div>
        <div className={classes.votesButtonContainer}>
          <Button
            text="↓"
            bgColor={ButtonColor.Yellow}
            classNames={classes.voteBtn}
            // @ts-ignore
            onClick={(e) => handleClick(e, false)}
            disabled={allotedVotesForProp === 0}
          />
          <div className={classes.votesAllotedDisplay}>
            {allotedVotesForProp}
          </div>
          <Button
            text="↑"
            bgColor={ButtonColor.Yellow}
            classNames={classes.voteBtn}
            // @ts-ignore
            onClick={(e) => handleClick(e, true)}
            disabled={!canAllotVotes()}
          />
        </div>
      </Col>
    </Row>
  );
};

export default PropCardVotingContainer;
