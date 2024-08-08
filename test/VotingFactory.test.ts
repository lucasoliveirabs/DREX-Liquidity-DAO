import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("VotingFactory", function () {

    async function deployFixture() {

      const [owner, addr1, addr2] = await ethers.getSigners();
      const VotingFactory = await ethers.getContractFactory("VotingFactory");
      const VotingBankRegistry = await ethers.getContractFactory("VotingBankRegistry"); 

      const votingFactoryContract = await VotingFactory.deploy();
      const votingBankRegistryContract = await VotingBankRegistry.deploy();

      return { votingFactoryContract, votingBankRegistryContract, owner, addr1, addr2 };
    }

    describe("createTopic", async function(){
      it("Should create multiple topics - happy path", async function() {
        const {votingFactoryContract, owner, addr1, addr2} = await loadFixture(deployFixture);
        
        await votingFactoryContract.registerBank(addr1);
        expect(await votingFactoryContract.registeredBanks(addr1)).to.be.true;

        let transactionResponse = await votingFactoryContract.connect(addr1).createTopic(0, "Test1 description");
        const topic1 = await votingFactoryContract.topics(1);
        expect(topic1.description).to.equal("Test1 description");
        expect(topic1.topicId).to.equal(1);
        expect(topic1.subject).to.equal(0);
        let latestBlockTimestamp = (await ethers.provider.getBlock('latest'))?.timestamp;
        await expect(transactionResponse).to.emit(votingFactoryContract, "TopicCreated").withArgs(addr1, 1, 0, latestBlockTimestamp);


        await votingFactoryContract.registerBank(addr2);
        expect(await votingFactoryContract.registeredBanks(addr2)).to.be.true;

        transactionResponse = await votingFactoryContract.connect(addr2).createTopic(1, "Test2 description");
        const topic2 = await votingFactoryContract.topics(2);
        expect(topic2.description).to.equal("Test2 description");
        expect(topic2.topicId).to.equal(2);
        expect(topic2.subject).to.equal(1);
        latestBlockTimestamp = (await ethers.provider.getBlock('latest'))?.timestamp;
        await expect(transactionResponse).to.emit(votingFactoryContract, "TopicCreated").withArgs(addr2, 2, 1, latestBlockTimestamp);


        const centralBankSigner = await ethers.getSigner(await votingFactoryContract.centralBank());

        transactionResponse = await votingFactoryContract.connect(centralBankSigner).createTopic(1, "Test3 description");
        const topic3 = await votingFactoryContract.topics(3);
        expect(topic3.description).to.equal("Test3 description");
        expect(topic3.topicId).to.equal(3);
        expect(topic3.subject).to.equal(1);
        latestBlockTimestamp = (await ethers.provider.getBlock('latest'))?.timestamp;
        await expect(transactionResponse).to.emit(votingFactoryContract, "TopicCreated").withArgs(centralBankSigner, 3, 1, latestBlockTimestamp);
      });

      it("Should revert in case of msg.sender as unregistered bank", async function() {
        const {votingFactoryContract, addr1, addr2} = await loadFixture(deployFixture);
        expect(votingFactoryContract.connect(addr1).createTopic(0, "Test1 description")).to.be.revertedWith("Only registered banks");
        expect(votingFactoryContract.connect(addr2).createTopic(1, "Test2 description")).to.be.revertedWith("Only registered banks");
      });
    });

    describe("removeTopic", async function(){
      it("Should remove multiple topics - happy path", async function() {
        const {votingFactoryContract, addr1, addr2} = await loadFixture(deployFixture);
        
        const centralBankSigner = await ethers.getSigner(await votingFactoryContract.centralBank());

        await votingFactoryContract.registerBank(addr1);
        await votingFactoryContract.connect(addr1).createTopic(0, "Test1 description");
        await votingFactoryContract.registerBank(addr2);
        await votingFactoryContract.connect(addr2).createTopic(1, "Test2 description");

        let transactionResponse = await votingFactoryContract.connect(centralBankSigner).removeTopic(1);
        let latestBlockTimestamp = (await ethers.provider.getBlock('latest'))?.timestamp;
        await expect(transactionResponse).to.emit(votingFactoryContract, "TopicRemoved").withArgs(addr1, 1, 0, latestBlockTimestamp);

        transactionResponse = await votingFactoryContract.connect(centralBankSigner).removeTopic(2);
        latestBlockTimestamp = (await ethers.provider.getBlock('latest'))?.timestamp;
        await expect(transactionResponse).to.emit(votingFactoryContract, "TopicRemoved").withArgs(addr2, 2, 1, latestBlockTimestamp);
      });

      it("Should revert in case of msg.sender as not centralBank", async function() {
        const {votingFactoryContract, addr1, addr2} = await loadFixture(deployFixture);

        await votingFactoryContract.registerBank(addr1);
        await votingFactoryContract.connect(addr1).createTopic(0, "Test1 description");
        await votingFactoryContract.registerBank(addr2);
        await votingFactoryContract.connect(addr2).createTopic(1, "Test2 description");

        expect(votingFactoryContract.connect(addr1).removeTopic(1)).to.be.revertedWith("Only regitered banks");
        expect(votingFactoryContract.connect(addr2).removeTopic(2)).to.be.revertedWith("Only regitered banks");
      });

      it("Should revert in case of nonexistent topic", async function() {
        const {votingFactoryContract} = await loadFixture(deployFixture);
        const centralBankSigner = await ethers.getSigner(await votingFactoryContract.centralBank());

        expect(votingFactoryContract.connect(centralBankSigner).removeTopic(2)).to.be.revertedWith("Nonexistent topic");
        expect(votingFactoryContract.connect(centralBankSigner).removeTopic(3)).to.be.revertedWith("Nonexistent topic");
      });

//TODO: add setIdle after voting logic creation
      it("Should revert in case of non IDLE status", async function() {
        const {votingFactoryContract, addr1, addr2} = await loadFixture(deployFixture);
        
        const centralBankSigner = await ethers.getSigner(await votingFactoryContract.centralBank());

        await votingFactoryContract.registerBank(addr1);
        await votingFactoryContract.connect(addr1).createTopic(0, "Test1 description");
        const topic1 = votingFactoryContract.topics(1);
        //setIdle

        await votingFactoryContract.registerBank(addr2);
        await votingFactoryContract.connect(addr2).createTopic(1, "Test2 description");
        const topic2 = votingFactoryContract.topics(2);
        //setIdle

        expect(await votingFactoryContract.connect(centralBankSigner).removeTopic(1)).to.be.revertedWith("Only IDLE topics are removable");
        expect(await votingFactoryContract.connect(centralBankSigner).removeTopic(2)).to.be.revertedWith("Only IDLE topics are removable");
      });
    });
});

describe("VotingBankRegistry", function () {

  async function deployFixture() {

    const [owner, addr1, addr2] = await ethers.getSigners();
    const VotingBankRegistry = await ethers.getContractFactory("VotingBankRegistry"); 
    const votingBankRegistryContract = await VotingBankRegistry.deploy();

    return { votingBankRegistryContract, owner, addr1, addr2 };
  }

  describe("registerBank", async function(){ 
    it("Should register a bank address - happy path", async function() { 
      const {votingBankRegistryContract, addr1, addr2} = await loadFixture(deployFixture);
      const centralBankSigner = await ethers.getSigner(await votingBankRegistryContract.centralBank());

      await votingBankRegistryContract.connect(centralBankSigner).registerBank(addr1);
      expect(await votingBankRegistryContract.registeredBanks(addr1)).to.be.true;      

      await votingBankRegistryContract.connect(centralBankSigner).registerBank(addr2);
      expect(await votingBankRegistryContract.registeredBanks(addr2)).to.be.true;      
    });

    it("Should revert in case of msg.sender as not centralBank", async function() {
      const {votingBankRegistryContract, addr1, addr2} = await loadFixture(deployFixture);

      expect(votingBankRegistryContract.connect(addr1).registerBank(addr2)).to.be.revertedWith("Only Central Bank");
      expect(votingBankRegistryContract.connect(addr2).registerBank(addr1)).to.be.revertedWith("Only Central Bank");
    });
  });
  
  describe("deregisterBank", async function(){
    it("Should deregister a bank address - happy path", async function() { 
      const {votingBankRegistryContract, addr1, addr2} = await loadFixture(deployFixture);
      const centralBankSigner = await ethers.getSigner(await votingBankRegistryContract.centralBank());

      await votingBankRegistryContract.connect(centralBankSigner).registerBank(addr1);
      expect(await votingBankRegistryContract.registeredBanks(addr1)).to.be.true;      
      await votingBankRegistryContract.connect(centralBankSigner).deregisterBank(addr1);
      expect(await votingBankRegistryContract.registeredBanks(addr1)).to.be.false;      

      await votingBankRegistryContract.connect(centralBankSigner).registerBank(addr2);
      expect(await votingBankRegistryContract.registeredBanks(addr2)).to.be.true;      
      await votingBankRegistryContract.connect(centralBankSigner).deregisterBank(addr2);
      expect(await votingBankRegistryContract.registeredBanks(addr2)).to.be.false;      
    });

    it("Should revert in case of msg.sender as not centralBank", async function() {
      const {votingBankRegistryContract, addr1, addr2} = await loadFixture(deployFixture);
      const centralBankSigner = await ethers.getSigner(await votingBankRegistryContract.centralBank());
    
      await votingBankRegistryContract.connect(centralBankSigner).registerBank(addr1);
      expect(votingBankRegistryContract.connect(addr1).deregisterBank(addr1)).to.be.revertedWith("Only Central Bank");

      await votingBankRegistryContract.connect(centralBankSigner).registerBank(addr2);
      expect(votingBankRegistryContract.connect(addr1).deregisterBank(addr2)).to.be.revertedWith("Only Central Bank");
    });
  });
});

