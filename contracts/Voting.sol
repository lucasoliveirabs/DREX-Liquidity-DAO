// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Voting {

    address public centralBank;
    mapping(address => bool) public registeredBanks;

    uint256 public topicId;
    mapping (uint256 => Topic) public topics;
    
    uint256 public votingId;
    mapping (uint256 => VotingData) public votings;

    enum TopicStatus {
        IDLE, 
        APPROVED,
        DENIED
    }

    struct Topic {
        uint256 topicId;
        address requester;
        Subject subject;
        string objective;
        string description;
        uint256 proposedValue;
        TopicStatus status;
        string denialRemark;
        uint256 creationDate;
        uint256 endDate;
        uint256 votingId;
    }

    enum Subject {
        LiquitidyInjection,
        InterestRate
    }    

    enum VoteDecision {
        EMPTY,
        POSITIVE,   //INFAVOR, INCREASE
        NEGATIVE,   //AGAINST, DECREASE
        NEUTRAL,    //MAINTAIN
        ABSTENTION  
   }

    struct Vote {
        address voter;
        VoteDecision voteDecision;
        string voteDescription;
        uint256 opinativeValueSuggestion;
        uint256 voteTimestamp;
   }

    struct VotingData {
        uint256 topicId;
        uint256 votingDeadline;
        Vote[] votes;
        uint8 finalResult;
    }

    event TopicCreated(address indexed requester, uint256 indexed topicId, Subject subject, uint256 topicCreationTimestamp);
    event TopicClosed(address indexed requester, uint256 indexed topicId, Subject subject, bool isApproved, string denialRemark, uint256 topicClosureTimestamp);
    event VotingCreated(address indexed requester, uint256 indexed votingId, uint256 indexed topicId, uint256 votingCreationTimestamp);
    event VotingClosed(uint256 indexed votingId, uint8 finalResult, uint256 votingClosureTimestamp);
    event VoteRegistered(uint256 indexed votingId, uint256 voteIndex, uint256 voteTimestamp);

    modifier onlyCentralBank() {
        require(msg.sender == centralBank, "Only Central Bank");
        _;
    }

    modifier onlyRegisteredBanks() {
        require(msg.sender == centralBank || registeredBanks[msg.sender], "Only registered banks");
        _;
    }

    modifier onlyExistingVotingId(uint256 _votingId){
        require(_votingId <= votingId, "Inexistent votingId");
        _;
    }

    modifier onlyExistingTopicId(uint256 _topicId){
        require(_topicId <= topicId, "Inexistent topicId");
        _;
    }

    constructor() {
        centralBank = msg.sender;
    }

    //TODO: CV
    function registerBank(address _bank) external onlyCentralBank {
        registeredBanks[_bank] = true;
    }

    function deregisterBank(address _bank) external onlyCentralBank {
        registeredBanks[_bank] = false;
    }

    function createTopic(Subject _subject, string memory _objective, string calldata _description, uint256 _proposedValue) external onlyRegisteredBanks {
        Topic memory topic = Topic({
            topicId: ++topicId,
            requester: msg.sender,
            subject: _subject,
            objective: _objective,
            description: _description,
            proposedValue: _proposedValue,
            status: TopicStatus.IDLE,
            denialRemark: 'N/A',
            creationDate: block.timestamp,
            endDate: 0,
            votingId: 0
        });

        topics[topicId] = topic;
        emit TopicCreated(topic.requester, topicId, topic.subject, topic.creationDate);
    }

    function denyTopic(uint256 _topicId, string calldata _denialRemark) external onlyCentralBank onlyExistingTopicId(_topicId) {
        Topic memory topic = topics[_topicId];
        require(topic.creationDate > 0, "Nonexistent topic");
        require(topic.status == TopicStatus.IDLE, "Only IDLE topics are eligible");

        topic.denialRemark = _denialRemark;
        topic.status = TopicStatus.DENIED;
        topic.endDate = block.timestamp;
        topics[_topicId] = topic;
        emit TopicClosed(topics[_topicId].requester, topics[_topicId].topicId, topics[_topicId].subject, false, topics[_topicId].denialRemark, topics[_topicId].endDate);
    }

    function createVoting(uint256 _topicId, uint256 _votingDeadline) external onlyCentralBank onlyExistingTopicId(_topicId){
        Topic memory topic = topics[_topicId];
        require(topic.creationDate > 0, "Nonexistent topic");
        require(topic.status == TopicStatus.IDLE, "Only IDLE topics are eligible");
        require(block.timestamp < _votingDeadline, "Voting deadline has been reached");

        VotingData storage newVoting = votings[++votingId];
        newVoting.votingDeadline = _votingDeadline;
        newVoting.topicId = topic.topicId;

        topic.votingId = votingId;
        topic.status = TopicStatus.APPROVED;
        topic.endDate = block.timestamp;

        emit VotingCreated(topic.requester, topic.topicId, votingId, block.timestamp);
        emit TopicClosed(topic.requester, topic.topicId, topic.subject, true, topic.denialRemark, topic.endDate);
    }

    //TODO: CV
    function vote(uint256 _votingId, VoteDecision _voteDecision, string calldata _voteDescription, uint256 _opinativeValueSuggestion) external onlyRegisteredBanks onlyExistingVotingId(_votingId) {
        require(_voteDecision != VoteDecision.EMPTY, "Vote cannot be EMPTY");

        VotingData memory votingData = votings[_votingId];
        require(block.timestamp < votingData.votingDeadline, "Voting deadline has been reached");

        Vote[] memory votes = votingData.votes;
        for (uint16 i=0; i<votes.length; i++){
            require(votes[i].voter != msg.sender, "The participant has already voted");
        }

        Vote memory newVote = Vote({
            voter: msg.sender,
            voteDecision: _voteDecision,
            voteDescription: _voteDescription,
            opinativeValueSuggestion: _opinativeValueSuggestion,
            voteTimestamp: block.timestamp
        });
        votings[_votingId].votes.push(newVote);
        
        uint256 newLastIndex; unchecked {
            newLastIndex = votes.length-1;
        }
        emit VoteRegistered(votingId, newLastIndex, block.timestamp);
    }

    function closeVoting(uint256 _votingId) external onlyCentralBank onlyExistingVotingId(_votingId) returns(uint8 finalResult){
        VotingData storage votingData = votings[_votingId];
        require(block.timestamp > votingData.votingDeadline, "Voting deadline must have been reached for closure");
        
        uint16 positive = 0;
        uint16 negative = 0;
        uint16 maintain = 0;
        uint16 abstentions = 0;

        for (uint16 i=0; i<votingData.votes.length; i++) {
            if (votingData.votes[i].voteDecision == VoteDecision.POSITIVE){
                positive++;
            } else if (votingData.votes[i].voteDecision == VoteDecision.NEGATIVE) {
                negative++;
            } else if (votingData.votes[i].voteDecision == VoteDecision.NEUTRAL){
                maintain++;
            } else {
                abstentions++;
            }
        }

        if(positive > negative && positive > maintain) {
            finalResult = uint8(VoteDecision.POSITIVE);
        } else if (negative > positive && negative > maintain) {
            finalResult = uint8(VoteDecision.NEGATIVE);
        } else if (maintain > positive && maintain > negative) {
            finalResult = uint8(VoteDecision.NEUTRAL);
        }

        votingData.finalResult = finalResult;
        emit VotingClosed(_votingId, finalResult, block.timestamp);
        return finalResult;
    }

    function getNumberOfVotes(uint256 _votingId) external view onlyRegisteredBanks onlyExistingVotingId(_votingId) returns (uint256) {
        return votings[_votingId].votes.length;
    }

    function getVote(uint256 _votingId, uint256 _voteIndex) external view onlyRegisteredBanks onlyExistingVotingId(_votingId) returns (Vote memory fetchedVote) {
        VotingData memory votingData = votings[_votingId];
        require(_voteIndex < votingData.votes.length, "Vote index out of bounds");

        fetchedVote = votingData.votes[_voteIndex];
        require(msg.sender == fetchedVote.voter, "Only the voter is allowed");

        return fetchedVote;
    }
}