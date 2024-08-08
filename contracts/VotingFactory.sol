// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./VotingBankRegistry.sol";

contract VotingFactory is VotingBankRegistry {

    mapping (uint256 => Topic) public topics;
    mapping (uint256 => address) public votings;
    uint256 public topicOrder;
    uint256 public votingOrder;

    enum VotingSubject {
        EconomicStimulus,
        InterestRate
    }

    enum Status {
        IDLE, 
        VOTING,
        APPROVED,
        DENIED
    }

    struct Topic {
        uint256 topicId;
        address owner;
        VotingSubject subject;
        string description;
        Status status;
        uint256 creationDate;
        uint256 startDate;
        uint256 endDate;
    }

    struct Voting {
        uint256 votingId;
    }

    event TopicCreated(address indexed owner, uint256 indexed topicId, VotingSubject subject, uint256 creationDate);
    event TopicRemoved(address indexed owner, uint256 indexed topicId, VotingSubject subject, uint256 removalTimestamp);
    event VotingCreated(address indexed owner, uint256 indexed votingId, address indexed contractAddress, uint256 timestamp);

    function createTopic(VotingSubject _votingSubject, string calldata _description) external onlyRegisteredBanks {
        Topic memory topic = Topic({
            topicId: ++topicOrder,
            owner: msg.sender,
            subject: _votingSubject,
            description: _description,
            status: Status.IDLE,
            creationDate: block.timestamp,
            startDate: 0,
            endDate: 0
        });

        topics[topic.topicId] =  topic;
        emit TopicCreated(topic.owner, topic.topicId, topic.subject, topic.creationDate);
    }

    function removeTopic(uint256 _topicId) external onlyCentralBank {
        Topic memory topic = topics[_topicId];
        require(topic.creationDate > 0, "Nonexistent topic");
        require(topic.status == Status.IDLE, "Only IDLE topics are removable");

        emit TopicRemoved(topic.owner, topic.topicId, topic.subject, block.timestamp);
        delete topics[_topicId];
    }

    //function createVoting() external onlyCentralBank {}
}