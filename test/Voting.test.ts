import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("Voting", function () {

    async function deployFixture() {

      const [owner, addr1, addr2] = await ethers.getSigners();
      const Voting = await ethers.getContractFactory("Voting");

      const votingContract = await Voting.deploy();

      return { votingContract, owner, addr1, addr2 };
    }

    describe("registerBank", async function(){ 
      it("Should register a bank address - happy path", async function() {
        const {votingContract, addr1, addr2} = await loadFixture(deployFixture);
        const centralBankSigner = await ethers.getSigner(await votingContract.centralBank());
  
        await votingContract.connect(centralBankSigner).registerBank(addr1);
        expect(await votingContract.registeredBanks(addr1)).to.be.true;      
  
        await votingContract.connect(centralBankSigner).registerBank(addr2);
        expect(await votingContract.registeredBanks(addr2)).to.be.true;      
      });
  
      it("Should revert in case of msg.sender as not centralBank", async function() {
        const {votingContract, addr1, addr2} = await loadFixture(deployFixture);
  
        expect(votingContract.connect(addr1).registerBank(addr2)).to.be.revertedWith("Only Central Bank");
        expect(votingContract.connect(addr2).registerBank(addr1)).to.be.revertedWith("Only Central Bank");
      });
    });
    
    describe("deregisterBank", async function(){
      it("Should deregister a bank address - happy path", async function() { 
        const {votingContract, addr1, addr2} = await loadFixture(deployFixture);
        const centralBankSigner = await ethers.getSigner(await votingContract.centralBank());
  
        await votingContract.connect(centralBankSigner).registerBank(addr1);
        expect(await votingContract.registeredBanks(addr1)).to.be.true;      
        await votingContract.connect(centralBankSigner).deregisterBank(addr1);
        expect(await votingContract.registeredBanks(addr1)).to.be.false;      
  
        await votingContract.connect(centralBankSigner).registerBank(addr2);
        expect(await votingContract.registeredBanks(addr2)).to.be.true;      
        await votingContract.connect(centralBankSigner).deregisterBank(addr2);
        expect(await votingContract.registeredBanks(addr2)).to.be.false;      
      });
  
      it("Should revert in case of msg.sender as not centralBank", async function() {
        const {votingContract, addr1, addr2} = await loadFixture(deployFixture);
        const centralBankSigner = await ethers.getSigner(await votingContract.centralBank());
      
        votingContract.connect(centralBankSigner).registerBank(addr1);
        expect(votingContract.connect(addr1).deregisterBank(addr1)).to.be.revertedWith("Only Central Bank");
  
        votingContract.connect(centralBankSigner).registerBank(addr2);
        expect(votingContract.connect(addr1).deregisterBank(addr2)).to.be.revertedWith("Only Central Bank");
      });
    });

    describe("createTopic", async function(){
      it("Should create multiple topics - happy path", async function() {
        const {votingContract, addr1, addr2} = await loadFixture(deployFixture);
        const centralBankSigner = await ethers.getSigner(await votingContract.centralBank());

        //bank1
        await votingContract.connect(centralBankSigner).registerBank(addr1);
        expect(await votingContract.registeredBanks(addr1)).to.be.true;

        let transactionResponse = await votingContract.connect(addr1).createTopic(0, "Topic1 objective", "Test1 description", 100000000);
        const topic1 = await votingContract.topics(1);
        expect(topic1.description).to.equal("Test1 description");
        expect(topic1.topicId).to.equal(1);
        expect(topic1.subject).to.equal(0);
        let latestBlockTimestamp = (await ethers.provider.getBlock('latest'))?.timestamp;
        await expect(transactionResponse).to.emit(votingContract, "TopicCreated").withArgs(addr1, 1, 0, latestBlockTimestamp);

        //bank2
        await votingContract.connect(centralBankSigner).registerBank(addr2);
        expect(await votingContract.registeredBanks(addr2)).to.be.true;

        transactionResponse = await votingContract.connect(addr2).createTopic(1, "Topic2 objective", "Test2 description", 200000000);
        const topic2 = await votingContract.topics(2);
        expect(topic2.description).to.equal("Test2 description");
        expect(topic2.topicId).to.equal(2);
        expect(topic2.subject).to.equal(1);
        latestBlockTimestamp = (await ethers.provider.getBlock('latest'))?.timestamp;
        await expect(transactionResponse).to.emit(votingContract, "TopicCreated").withArgs(addr2, 2, 1, latestBlockTimestamp);

        //centralBank
        transactionResponse = await votingContract.connect(centralBankSigner).createTopic(1, "Topic3 objective", "Test3 description", 300000000);
        const topic3 = await votingContract.topics(3);
        expect(topic3.description).to.equal("Test3 description");
        expect(topic3.topicId).to.equal(3);
        expect(topic3.subject).to.equal(1);
        latestBlockTimestamp = (await ethers.provider.getBlock('latest'))?.timestamp;
        await expect(transactionResponse).to.emit(votingContract, "TopicCreated").withArgs(centralBankSigner, 3, 1, latestBlockTimestamp);
      });

      it("Should revert in case of msg.sender as unregistered bank", async function() {
        const {votingContract, addr1, addr2} = await loadFixture(deployFixture);
        expect(votingContract.connect(addr1).createTopic(0, "Topic1 objective", "Topic1 description", 100000000)).to.be.revertedWith("Only registered banks");
        expect(votingContract.connect(addr2).createTopic(1, "Topic2 objective", "Topic2 description", 200000000)).to.be.revertedWith("Only registered banks");
      });
    });

    describe("denyTopic", async function(){
      it("Should deny multiple topics - happy path", async function() {
        const {votingContract, addr1, addr2} = await loadFixture(deployFixture);
        const centralBankSigner = await ethers.getSigner(await votingContract.centralBank());

        await votingContract.connect(centralBankSigner).registerBank(addr1);
        await votingContract.connect(centralBankSigner).registerBank(addr2);

        await votingContract.connect(addr1).createTopic(0, "Topic1 objective", "Topic1 description", 100000000);
        let transactionResponse = await votingContract.connect(centralBankSigner).denyTopic(1, "Remark1");
        let latestBlockTimestamp = (await ethers.provider.getBlock('latest'))?.timestamp;
        await expect(transactionResponse).to.emit(votingContract, "TopicClosed").withArgs(addr1, 1, 0, false, "Remark1", latestBlockTimestamp);

        await votingContract.connect(addr2).createTopic(1, "Topic2 objective", "Topic2 description", 200000000);
        transactionResponse = await votingContract.connect(centralBankSigner).denyTopic(2, "Remark2");
        latestBlockTimestamp = (await ethers.provider.getBlock('latest'))?.timestamp;
        await expect(transactionResponse).to.emit(votingContract, "TopicClosed").withArgs(addr2, 2, 1, false, "Remark2", latestBlockTimestamp);
      });

      it("Should revert in case of msg.sender as not centralBank", async function() {
        const {votingContract, addr1, addr2} = await loadFixture(deployFixture);

        await votingContract.registerBank(addr1);
        await votingContract.connect(addr1).createTopic(0, "Topic1 objective", "Topic1 description", 100000000);
        expect(votingContract.connect(addr1).denyTopic(1, "Remark1")).to.be.revertedWith("Only regitered banks");
        
        await votingContract.registerBank(addr2);
        await votingContract.connect(addr2).createTopic(1, "Topic2 objective", "Topic2 description", 200000000);
        expect(votingContract.connect(addr2).denyTopic(2, "Remark2")).to.be.revertedWith("Only regitered banks");
      });

      it("Should revert in case of nonexistent topic", async function() {
        const {votingContract} = await loadFixture(deployFixture);
        const centralBankSigner = await ethers.getSigner(await votingContract.centralBank());

        expect(votingContract.connect(centralBankSigner).denyTopic(3, "Remark3")).to.be.revertedWith("Nonexistent topic");
        expect(votingContract.connect(centralBankSigner).denyTopic(4, "Remark4")).to.be.revertedWith("Nonexistent topic");
      });

      it("Should revert in case of non IDLE status", async function() {
        const {votingContract, addr1, addr2} = await loadFixture(deployFixture);
        const centralBankSigner = await ethers.getSigner(await votingContract.centralBank());

        //TopicStatus.DENIED
        await votingContract.registerBank(addr1);
        await votingContract.connect(addr1).createTopic(0, "Topic1 objective", "Topic1 description", 100000000);
        let topic = await votingContract.topics(1);

        await votingContract.connect(centralBankSigner).denyTopic(topic.topicId, "Remark1");  
        expect(votingContract.connect(centralBankSigner).denyTopic(topic.topicId, "Remark1")).to.be.revertedWith("Only IDLE topics are eligible");

        //TopicStatus.APPROVED
        await votingContract.registerBank(addr2);
        await votingContract.connect(addr2).createTopic(1, "Topic2 objective", "Topic2 description", 200000000);
        topic = await votingContract.topics(2);
        votingContract.connect(centralBankSigner).createVoting(topic.topicId, 1723744292);  
        expect(votingContract.connect(centralBankSigner).denyTopic(2, "Remark2")).to.be.revertedWith("Only IDLE topics are eligible");   
      });

      it("Should revert in case of nonexisting topicId", async function() {
        const {votingContract, addr1, addr2} = await loadFixture(deployFixture);
        const centralBankSigner = await ethers.getSigner(await votingContract.centralBank());

        await votingContract.registerBank(addr1);
        await votingContract.connect(addr1).createTopic(0, "Topic1 objective", "Topic1 description", 100000000);
        await votingContract.connect(addr2).createTopic(1, "Topic2 objective", "Topic2 description", 100000000);
        
        expect(votingContract.connect(centralBankSigner).denyTopic(2, "Remark1")).to.be.revertedWith("Inexistent topicId");
        expect(votingContract.connect(centralBankSigner).denyTopic(5, "Remark2")).to.be.revertedWith("Inexistent topicId");
      });
    });

    describe("createVoting", function(){
      it("Should create multiple voting - happy path", async function() {
        const {votingContract, owner, addr1, addr2} = await loadFixture(deployFixture);
        const centralBankSigner = await ethers.getSigner(await votingContract.centralBank());

        //create voting - bank 1
        await votingContract.connect(centralBankSigner).registerBank(addr1);
        expect(await votingContract.registeredBanks(addr1)).to.be.true;
        await votingContract.connect(addr1).createTopic(0, "Topic1 objective", "Test1 description", 100000000);
        let topic = await votingContract.topics(1);
        let transactionResponse = await votingContract.connect(centralBankSigner).createVoting(topic.topicId, 1723744292);
        let latestBlockTimestamp = (await ethers.provider.getBlock('latest'))?.timestamp;
        await expect(transactionResponse).to.emit(votingContract, "VotingCreated").withArgs(addr1.address, topic.topicId, votingContract.votingId(), latestBlockTimestamp);
        await expect(transactionResponse).to.emit(votingContract, "TopicClosed").withArgs(addr1.address, topic.topicId, topic.subject, true, topic.denialRemark, latestBlockTimestamp);

        //create voting - bank 2
        await votingContract.connect(centralBankSigner).registerBank(addr2);
        expect(await votingContract.registeredBanks(addr2)).to.be.true;
        await votingContract.connect(addr2).createTopic(1, "Topic2 objective", "Test2 description", 200000000);
        topic = await votingContract.topics(2);
        transactionResponse = await votingContract.connect(centralBankSigner).createVoting(topic.topicId, 1723744292);
        latestBlockTimestamp = (await ethers.provider.getBlock('latest'))?.timestamp;
        await expect(transactionResponse).to.emit(votingContract, "VotingCreated").withArgs(addr2.address, topic.topicId, votingContract.votingId(), latestBlockTimestamp);
        await expect(transactionResponse).to.emit(votingContract, "TopicClosed").withArgs(addr2.address, topic.topicId, topic.subject, true, topic.denialRemark, latestBlockTimestamp);

        //create voting - centralBank
        expect(await votingContract.centralBank()).to.be.equal(owner.address);
        await votingContract.connect(centralBankSigner).createTopic(1, "Topic3 objective", "Test3 description", 300000000);
        topic = await votingContract.topics(3);
        transactionResponse = await votingContract.connect(centralBankSigner).createVoting(topic.topicId, 1723744292);
        latestBlockTimestamp = (await ethers.provider.getBlock('latest'))?.timestamp;
        await expect(transactionResponse).to.emit(votingContract, "VotingCreated").withArgs(owner.address, topic.topicId, votingContract.votingId(), latestBlockTimestamp);
        await expect(transactionResponse).to.emit(votingContract, "TopicClosed").withArgs(owner.address, topic.topicId, topic.subject, true, topic.denialRemark, latestBlockTimestamp);
      });

      it("Should revert in case of msg.sender as not centralBank", async function() {
        const {votingContract, addr1, addr2} = await loadFixture(deployFixture);
        const centralBankSigner = await ethers.getSigner(await votingContract.centralBank());
        
        await votingContract.connect(centralBankSigner).registerBank(addr1);
        await votingContract.connect(addr1).createTopic(0, "Topic1 objective", "Topic1 description", 100000000);
        let topic = await votingContract.topics(1);
        expect(votingContract.connect(addr1).createVoting(topic.topicId, 1723744292)).to.be.revertedWith("Only regitered banks");

        await votingContract.connect(centralBankSigner).registerBank(addr2);
        await votingContract.connect(addr2).createTopic(1, "Topic2 objective", "Topic2 description", 200000000);
        topic = await votingContract.topics(2);
        expect(votingContract.connect(addr2).createVoting(topic.topicId, 1723744292)).to.be.revertedWith("Only regitered banks");
      });

      it("Should revert in case of nonexistent topic", async function() {
        const {votingContract, addr1, addr2} = await loadFixture(deployFixture);
        const centralBankSigner = await ethers.getSigner(await votingContract.centralBank());

        expect(votingContract.connect(centralBankSigner).createVoting(1, 1723744292)).to.be.revertedWith("Nonexistent topic");
        expect(votingContract.connect(centralBankSigner).createVoting(2, 1723744292)).to.be.revertedWith("Nonexistent topic");
      });

      it("Should revert in case of non IDLE topics", async function() {
        const {votingContract, addr1, addr2} = await loadFixture(deployFixture);
        const centralBankSigner = await ethers.getSigner(await votingContract.centralBank());
        
        await votingContract.connect(centralBankSigner).registerBank(addr1);
        await votingContract.connect(addr1).createTopic(0, "Topic1 objective", "Topic1 description", 100000000);
        let topic = await votingContract.topics(1);
        await votingContract.connect(centralBankSigner).denyTopic(topic.topicId, "Remark1");
        expect(votingContract.connect(centralBankSigner).createVoting(topic.topicId, 1723744292)).to.be.revertedWith("Only IDLE topics are eligible");

        await votingContract.connect(centralBankSigner).registerBank(addr2);
        await votingContract.connect(addr2).createTopic(1, "Topic2 objective", "Topic2 description", 200000000);
        topic = await votingContract.topics(2);
        await votingContract.connect(centralBankSigner).denyTopic(topic.topicId, "Remark1");
        expect(votingContract.connect(centralBankSigner).createVoting(topic.topicId, 1723744292)).to.be.revertedWith("Only IDLE topics are eligible");
      });

      it("Should revert in case of deadline reached", async function() {
        const {votingContract, addr1, addr2} = await loadFixture(deployFixture);
        const centralBankSigner = await ethers.getSigner(await votingContract.centralBank());

        await votingContract.connect(centralBankSigner).registerBank(addr1);
        await votingContract.connect(addr1).createTopic(0, "Topic1 objective", "Topic1 description", 100000000);
        let topic = await votingContract.topics(1);
        expect(votingContract.connect(centralBankSigner).createVoting(topic.topicId, 1723181300)).to.be.revertedWith("Voting deadline has been reached"); //past timestamp

        await votingContract.connect(centralBankSigner).registerBank(addr2);
        await votingContract.connect(centralBankSigner).createTopic(1, "Topic2 objective", "Topic2 description", 200000000);
        topic = await votingContract.topics(2);
        expect(votingContract.connect(addr2).createVoting(topic.topicId, 1723181300)).to.be.revertedWith("Voting deadline has been reached"); //past timestamp
      });

      it("Should revert in case of nonexisting topicId", async function() {
        const {votingContract, addr1, addr2} = await loadFixture(deployFixture);
        const centralBankSigner = await ethers.getSigner(await votingContract.centralBank());

        await votingContract.connect(centralBankSigner).registerBank(addr1);
        expect(votingContract.connect(centralBankSigner).createVoting(2, 1723181300)).to.be.revertedWith("Inexistent topicId");
        expect(votingContract.connect(centralBankSigner).createVoting(5, 1723181300)).to.be.revertedWith("Inexistent topicId");
      });
    });

    describe("vote", function(){
        enum VoteDecision {
          EMPTY,
          POSITIVE,   //INFAVOR, INCREASE
          NEGATIVE,   //AGAINST, DECREASE
          NEUTRAL,    //MAINTAIN
          ABSTENTION  
        }
      it("Should vote - happy path", async function(){
        const {votingContract, addr1, addr2} = await loadFixture(deployFixture);
        const centralBankSigner = await ethers.getSigner(await votingContract.centralBank());

        await votingContract.connect(centralBankSigner).createTopic(0, "Topic1 objective", "Test1 description", 100000000);
        let topic = await votingContract.topics(1);
        let votingDeadline = 1723744292;

        await votingContract.connect(centralBankSigner).createVoting(topic.topicId, votingDeadline);
        let votingId = await votingContract.votingId();
        let votingData = await votingContract.votings(votingId);

        //vote - bank 1
        await votingContract.connect(centralBankSigner).registerBank(addr1);
        expect(await votingContract.registeredBanks(addr1)).to.be.true;

        let previousNumberOfVotes = await votingContract.getNumberOfVotes(votingId);
        let transactionResponse = await votingContract.connect(addr1).vote(await votingContract.votingId(), VoteDecision.POSITIVE, "Description 1", 120000);
        let postNumberOfVotes = await votingContract.getNumberOfVotes(votingId);
        
        let latestBlockTimestamp = (await ethers.provider.getBlock('latest'))?.timestamp;
        expect(postNumberOfVotes).to.equal(++previousNumberOfVotes);
        expect(transactionResponse).to.emit(votingContract, "VoteRegistered").withArgs(await votingContract.votingId(), previousNumberOfVotes, latestBlockTimestamp);  //previousNumberOfVotes == newLastIndex
        expect(votingData.topicId).to.equal(topic.topicId);
        expect(votingData.votingDeadline).to.equal(votingDeadline);

        //vote - bank 2
        await votingContract.connect(centralBankSigner).registerBank(addr2);
        expect(await votingContract.registeredBanks(addr2)).to.be.true;

        previousNumberOfVotes = await votingContract.getNumberOfVotes(votingId);
        transactionResponse = await votingContract.connect(addr2).vote(await votingContract.votingId(), VoteDecision.NEGATIVE, "Description 2", 340000);
        postNumberOfVotes = await votingContract.getNumberOfVotes(votingId);
        
        latestBlockTimestamp = (await ethers.provider.getBlock('latest'))?.timestamp;
        expect(postNumberOfVotes).to.equal(++previousNumberOfVotes);
        expect(transactionResponse).to.emit(votingContract, "VoteRegistered").withArgs(await votingContract.votingId(), previousNumberOfVotes, latestBlockTimestamp);
        expect(votingData.topicId).to.equal(topic.topicId);
        expect(votingData.votingDeadline).to.equal(votingDeadline);

        //vote - centralBank
        previousNumberOfVotes = await votingContract.getNumberOfVotes(votingId);
        transactionResponse = await votingContract.connect(centralBankSigner).vote(await votingContract.votingId(), VoteDecision.NEUTRAL, "Description 3", 0);
        postNumberOfVotes = await votingContract.getNumberOfVotes(votingId);
        
        latestBlockTimestamp = (await ethers.provider.getBlock('latest'))?.timestamp;
        expect(postNumberOfVotes).to.equal(++previousNumberOfVotes);
        expect(transactionResponse).to.emit(votingContract, "VoteRegistered").withArgs(await votingContract.votingId(), previousNumberOfVotes, latestBlockTimestamp);
        expect(votingData.topicId).to.equal(topic.topicId);
        expect(votingData.votingDeadline).to.equal(votingDeadline);
      });

      it("Should revert in case of duplicated vote", async function(){
        const {votingContract, addr1, addr2} = await loadFixture(deployFixture);
        const centralBankSigner = await ethers.getSigner(await votingContract.centralBank());

        await votingContract.connect(centralBankSigner).createTopic(0, "Topic1 objective", "Test1 description", 100000000);
        let topic = await votingContract.topics(1);
        let votingDeadline = 1723744292;
        await votingContract.connect(centralBankSigner).createVoting(topic.topicId, votingDeadline);
        await votingContract.connect(centralBankSigner).registerBank(addr1);
        await votingContract.connect(centralBankSigner).registerBank(addr2);

        //bank 1        
        await votingContract.connect(addr1).vote(await votingContract.votingId(), VoteDecision.POSITIVE, "Description 1", 120000);
        expect(votingContract.connect(addr1).vote(await votingContract.votingId(), VoteDecision.NEGATIVE, "Description 1", 120000)).to.be.revertedWith("The participant has already voted");   
        
        //bank 2
        await votingContract.connect(addr2).vote(await votingContract.votingId(), VoteDecision.NEUTRAL, "Description 1", 120000);
        expect(votingContract.connect(addr2).vote(await votingContract.votingId(), VoteDecision.POSITIVE, "Description 1", 120000)).to.be.revertedWith("The participant has already voted");   
      });

      it("Should revert in case of empty vote", async function(){
        const {votingContract, addr1, addr2} = await loadFixture(deployFixture);
        const centralBankSigner = await ethers.getSigner(await votingContract.centralBank());
        
        await votingContract.connect(centralBankSigner).createTopic(0, "Topic1 objective", "Test1 description", 100000000);
        let topic = await votingContract.topics(1);
        let votingDeadline = 1723744292;

        //bank 1
        await votingContract.connect(centralBankSigner).createVoting(topic.topicId, votingDeadline);
        
        await votingContract.connect(centralBankSigner).registerBank(addr1);
        expect(await votingContract.registeredBanks(addr1)).to.be.true;
        expect(votingContract.connect(addr1).vote(await votingContract.votingId(), VoteDecision.EMPTY, "Description 1", 120000)).to.be.revertedWith("Vote cannot be EMPTY");
        
        await votingContract.connect(centralBankSigner).registerBank(addr2);
        expect(await votingContract.registeredBanks(addr2)).to.be.true;
        expect(votingContract.connect(addr2).vote(await votingContract.votingId(), VoteDecision.EMPTY, "Description 2", 120000)).to.be.revertedWith("Vote cannot be EMPTY");
      });

      it("Should revert in case of msg.sender as unregistered bank", async function() {
        const {votingContract, addr1, addr2} = await loadFixture(deployFixture);
        const centralBankSigner = await ethers.getSigner(await votingContract.centralBank());

        await votingContract.connect(centralBankSigner).createTopic(0, "Topic1 objective", "Test1 description", 100000000);
        let topic = await votingContract.topics(1);
        let votingDeadline = 1723744292;
        await votingContract.connect(centralBankSigner).createVoting(topic.topicId, votingDeadline);
        await votingContract.connect(centralBankSigner).registerBank(addr1);
        await votingContract.connect(centralBankSigner).registerBank(addr2);

        expect(votingContract.connect(addr1).vote(await votingContract.votingId(), VoteDecision.EMPTY, "Description 1", 120000)).to.be.revertedWith("Only registered banks");
        expect(votingContract.connect(addr2).vote(await votingContract.votingId(), VoteDecision.POSITIVE, "Description 2", 120000)).to.be.revertedWith("Only registered banks");
      });

      it("Should revert in case of deadline reached", async function() {
        const {votingContract, addr1, addr2} = await loadFixture(deployFixture);
        const centralBankSigner = await ethers.getSigner(await votingContract.centralBank());

        await votingContract.connect(centralBankSigner).registerBank(addr1);
        await votingContract.connect(addr1).createTopic(0, "Topic1 objective", "Topic1 description", 100000000);
        let topic = await votingContract.topics(1);
        expect(votingContract.connect(centralBankSigner).vote(await votingContract.votingId(), VoteDecision.POSITIVE, "Description 1", 120000)).to.be.revertedWith("Voting deadline has been reached"); //past timestamp

        await votingContract.connect(centralBankSigner).registerBank(addr2);
        await votingContract.connect(centralBankSigner).createTopic(1, "Topic2 objective", "Topic2 description", 200000000);
        topic = await votingContract.topics(2);
        expect(votingContract.connect(addr2).vote(await votingContract.votingId(), VoteDecision.NEUTRAL, "Description 1", 120000)).to.be.revertedWith("Voting deadline has been reached"); //past timestamp
      });
    });

    describe("closeVoting", function(){
      enum VoteDecision {
        EMPTY,
        POSITIVE,   //INFAVOR, INCREASE
        NEGATIVE,   //AGAINST, DECREASE
        NEUTRAL,    //MAINTAIN
        ABSTENTION  
      }

      it("Should close voting - happy path", async function(){
        function sleep(ms : number) {
          return new Promise(resolve => setTimeout(resolve, ms));
        }

        const {votingContract, addr1, addr2} = await loadFixture(deployFixture);
        const centralBankSigner = await ethers.getSigner(await votingContract.centralBank());
        
        await votingContract.connect(centralBankSigner).createTopic(0, "Topic1 objective", "Test1 description", 100000000);
        await votingContract.connect(centralBankSigner).createVoting((await votingContract.topics(1)).topicId, (Math.floor(Date.now() / 1000)) + 20); //current + 2sec
        await votingContract.connect(centralBankSigner).registerBank(addr1);
        await votingContract.connect(centralBankSigner).registerBank(addr2);

        await votingContract.connect(centralBankSigner).vote(await votingContract.votingId(), VoteDecision.POSITIVE, "Description 1", 120000);
        await votingContract.connect(addr1).vote(await votingContract.votingId(), VoteDecision.NEUTRAL, "Description 2", 340000);
        await votingContract.connect(addr2).vote(await votingContract.votingId(), VoteDecision.NEGATIVE, "Description 4", 1000000);
        
        await time.increase(3600);
        await sleep(2000);

        let finalResult = (await votingContract.votings(await votingContract.votingId())).finalResult;
        let transactionResponse = await votingContract.connect(centralBankSigner).closeVoting(await votingContract.votingId());
        let latestBlockTimestamp = (await ethers.provider.getBlock('latest'))?.timestamp;
        expect(transactionResponse).to.emit(votingContract, "VotingClosed").withArgs(await votingContract.votingId(), finalResult, latestBlockTimestamp);
      });

      it("Should revert in case of msg.sender as not centralBank", async function() {
        const {votingContract, addr1, addr2} = await loadFixture(deployFixture);
        const centralBankSigner = await ethers.getSigner(await votingContract.centralBank());
        
        await votingContract.connect(centralBankSigner).registerBank(addr1);
        expect(votingContract.connect(addr1).closeVoting(await votingContract.votingId())).to.be.revertedWith("Only regitered banks");

        await votingContract.connect(centralBankSigner).registerBank(addr2);
        expect(votingContract.connect(addr2).closeVoting(await votingContract.votingId())).to.be.revertedWith("Only regitered banks");
      });

      it("Should revert in case of voting deadline not reached", async function(){
        const {votingContract} = await loadFixture(deployFixture);
        const centralBankSigner = await ethers.getSigner(await votingContract.centralBank());

        await votingContract.connect(centralBankSigner).createTopic(0, "Topic1 objective", "Test1 description", 100000000);
        await votingContract.connect(centralBankSigner).createVoting((await votingContract.topics(1)).topicId, (Date.now() + 5000));  //future timestamp
        await votingContract.connect(centralBankSigner).vote(await votingContract.votingId(), VoteDecision.POSITIVE, "Description 1", 120000);
        expect(votingContract.connect(centralBankSigner).closeVoting(await votingContract.votingId())).to.be.revertedWith("Voting deadline must have been reached for closure");
      });
    });

    describe("getNumberOfVotes", function() {
      enum VoteDecision {
        EMPTY,
        POSITIVE,   //INFAVOR, INCREASE
        NEGATIVE,   //AGAINST, DECREASE
        NEUTRAL,    //MAINTAIN
        ABSTENTION  
      }
      it("Should get given voting number of votes - happy path", async function() {
        const {votingContract, addr1, addr2} = await loadFixture(deployFixture);
        const centralBankSigner = await ethers.getSigner(await votingContract.centralBank());

        await votingContract.connect(centralBankSigner).createTopic(0, "Topic1 objective", "Test1 description", 100000000);
        let topic = await votingContract.topics(1);
        let votingDeadline = 1723744292;
        await votingContract.connect(centralBankSigner).createVoting(topic.topicId, votingDeadline);
        await votingContract.connect(centralBankSigner).registerBank(addr1);
        await votingContract.connect(centralBankSigner).registerBank(addr2);
        
        //essai 1
        await votingContract.connect(addr1).vote(await votingContract.votingId(), VoteDecision.POSITIVE, "Description 1", 120000)
        await votingContract.connect(centralBankSigner).vote(await votingContract.votingId(), VoteDecision.NEGATIVE, "Description 2", 120000)
        expect(await votingContract.connect(addr1).getNumberOfVotes(await votingContract.votingId())).to.equal(2);

        //essai 2
        await votingContract.connect(centralBankSigner).createTopic(1, "Topic2 objective", "Test2 description", 200000000);
        await votingContract.connect(centralBankSigner).createVoting(topic.topicId, votingDeadline);
        await votingContract.connect(addr2).vote(await votingContract.votingId(), VoteDecision.POSITIVE, "Description 1", 120000)
        expect(await votingContract.connect(addr2).getNumberOfVotes(await votingContract.votingId())).to.equal(1);
      });

      it("Should revert in case of msg.sender as unregistered bank", async function() {
        const {votingContract, addr1, addr2} = await loadFixture(deployFixture);
        const centralBankSigner = await ethers.getSigner(await votingContract.centralBank());

        await votingContract.connect(centralBankSigner).createTopic(0, "Topic1 objective", "Test1 description", 100000000);
        let topic = await votingContract.topics(1);
        let votingDeadline = 1723744292;
        await votingContract.connect(centralBankSigner).createVoting(topic.topicId, votingDeadline);

        expect(votingContract.connect(addr1).getNumberOfVotes(await votingContract.votingId())).to.be.revertedWith("Only registered banks");
        expect(votingContract.connect(addr2).getNumberOfVotes(await votingContract.votingId())).to.be.revertedWith("Only registered banks");
      });
    });

    describe("getVote", function(){
      enum VoteDecision {
        EMPTY,
        POSITIVE,   //INFAVOR, INCREASE
        NEGATIVE,   //AGAINST, DECREASE
        NEUTRAL,    //MAINTAIN
        ABSTENTION  
      }
      it("Should fetch vote - happy path", async function() {
        const {votingContract, addr1, addr2} = await loadFixture(deployFixture);
        const centralBankSigner = await ethers.getSigner(await votingContract.centralBank());

        await votingContract.connect(centralBankSigner).createTopic(0, "Topic1 objective", "Test1 description", 100000000);
        let topic = await votingContract.topics(1);
        let votingDeadline = 1723744292;
        await votingContract.connect(centralBankSigner).createVoting(topic.topicId, votingDeadline);
        
        let votingId = await votingContract.votingId();
        await votingContract.connect(centralBankSigner).registerBank(addr1);
        await votingContract.connect(centralBankSigner).registerBank(addr2);

        let previousNumberOfVotes = await votingContract.getNumberOfVotes(votingId);
        await votingContract.connect(addr1).vote(votingId, VoteDecision.NEUTRAL, "Description 1", 120000);
        let fetchedVote = await votingContract.connect(addr1).getVote(votingId, previousNumberOfVotes);
        expect(fetchedVote.voteDecision).to.equal(VoteDecision.NEUTRAL);
        expect(fetchedVote.voteDescription).to.equal("Description 1");
        expect(fetchedVote.opinativeValueSuggestion).to.equal(120000);

        previousNumberOfVotes = await votingContract.getNumberOfVotes(votingId);
        await votingContract.connect(addr2).vote(votingId, VoteDecision.POSITIVE, "Description 2", 120000);
        fetchedVote = await votingContract.connect(addr2).getVote(votingId, previousNumberOfVotes);
        expect(fetchedVote.voteDecision).to.equal(VoteDecision.POSITIVE);
        expect(fetchedVote.voteDescription).to.equal("Description 2");
        expect(fetchedVote.opinativeValueSuggestion).to.equal(120000);      
      });

      it("Should revert in case of msg.sender as unregistered bank", async function() {
        const {votingContract, addr1, addr2} = await loadFixture(deployFixture);
        const centralBankSigner = await ethers.getSigner(await votingContract.centralBank());

        await votingContract.connect(centralBankSigner).createTopic(0, "Topic1 objective", "Test1 description", 100000000);
        let topic = await votingContract.topics(1);
        let votingDeadline = 1723744292;
        await votingContract.connect(centralBankSigner).createVoting(topic.topicId, votingDeadline);
        votingContract.connect(centralBankSigner).vote(await votingContract.votingId(), VoteDecision.EMPTY, "Description 1", 120000)

        let previousNumberOfVotes = await votingContract.getNumberOfVotes(await votingContract.votingId());
        expect(votingContract.connect(addr1).getVote(await votingContract.votingId(), previousNumberOfVotes)).to.be.revertedWith("Only registered banks");
        expect(votingContract.connect(addr2).getVote(await votingContract.votingId(), previousNumberOfVotes)).to.be.revertedWith("Only registered banks");
      });

      it("Should revert in case of index out of bounds", async function() {
        const {votingContract, addr1, addr2} = await loadFixture(deployFixture);
        const centralBankSigner = await ethers.getSigner(await votingContract.centralBank());

        await votingContract.connect(centralBankSigner).createTopic(0, "Topic1 objective", "Test1 description", 100000000);
        let topic = await votingContract.topics(1);
        let votingDeadline = 1723744292;
        await votingContract.connect(centralBankSigner).createVoting(topic.topicId, votingDeadline);
        
        let votingId = await votingContract.votingId();
        await votingContract.connect(centralBankSigner).registerBank(addr1);
        await votingContract.connect(centralBankSigner).registerBank(addr2);
        await votingContract.connect(addr1).vote(votingId, VoteDecision.NEUTRAL, "Description 1", 120000);
        
        let previousNumberOfVotes = await votingContract.getNumberOfVotes(await votingContract.votingId());
        expect(votingContract.connect(addr1).getVote(votingId, previousNumberOfVotes)).to.be.revertedWith("Vote index out of bounds");
      });
      
      it("Should revert in case of msg.sender as not the voter", async function() {
        const {votingContract, addr1, addr2} = await loadFixture(deployFixture);
        const centralBankSigner = await ethers.getSigner(await votingContract.centralBank());

        await votingContract.connect(centralBankSigner).createTopic(0, "Topic1 objective", "Test1 description", 100000000);
        let topic = await votingContract.topics(1);
        let votingDeadline = 1723744292;
        await votingContract.connect(centralBankSigner).createVoting(topic.topicId, votingDeadline);
        
        await votingContract.connect(centralBankSigner).registerBank(addr1);
        await votingContract.connect(centralBankSigner).registerBank(addr2);
        await votingContract.connect(addr1).vote(await votingContract.votingId(), VoteDecision.NEUTRAL, "Description 1", 120000);
        
        let previousNumberOfVotes = await votingContract.getNumberOfVotes(await votingContract.votingId());
        let lastIndex = --previousNumberOfVotes;

        let transactionResponse = await votingContract.connect(addr1).getVote(await votingContract.votingId(), lastIndex);
        expect(transactionResponse).to.be.revertedWith("Only the voter is allowed");

        expect(votingContract.connect(addr2).getVote(await votingContract.votingId(), lastIndex)).to.be.revertedWith("Only the voter is allowed");
      });
    });
});