// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract VotingBankRegistry {

    mapping(address => bool) public registeredBanks;
    address public centralBank;

    constructor() {
        centralBank = msg.sender;
    }

    modifier onlyCentralBank() {
        require(msg.sender == centralBank, "Only Central Bank");
        _;
    }

    modifier onlyRegisteredBanks() {
        require(msg.sender == centralBank || registeredBanks[msg.sender], "Only registered banks");
        _;
    }

//TODO: DID-CV validation
    function registerBank(address _bank) public onlyCentralBank {
        registeredBanks[_bank] = true;
    }

    function deregisterBank(address _bank) public onlyCentralBank {
        registeredBanks[_bank] = false;
    }
}
