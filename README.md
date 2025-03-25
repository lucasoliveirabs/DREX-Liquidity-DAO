#     DREX-Liquidity-DAO

**Version 1.0.0**: Permissioned Voting DAO for Central and Commercial banks' liquidity injection and common interests based on [DREX pilot](https://github.com/bacen/pilotord-kit-onboarding) <br />
**Version 2.0.0**: ZKP for unilateral interest transactions using [Zokrates](https://zokrates.github.io/) <br />
**Version 3.0.0**: DID-VC for SSI DAO participation using [Indy Besu](https://github.com/hyperledger/indy-besu) <br />

## Future Considerations
- Voting modularity: it is a consideration to modularize voting contracts instances by using factory-like pattern according to each voting subject specification and complexity grownth. This can be done by using updateProxy() at VotingProxy.sol.

## Dependencies
Before running the script ensure following dependencies are installed and active:
- [JDK 21 or later](https://jdk.java.net/22/)
- [Besu](https://github.com/hyperledger/besu/releases)
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Installation
1. After cloning create a .env file at root, paste the following and set your wallet mnemonic
>NODE_RPC=http://127.0.0.1:8545
>CHAIN_ID=1337
>MNEMONIC=<your-12-word-seed-phrase>

2. Still at root run ```./qbft-drex.sh```

The script will deploy the contracts and a 4-node QBFT besu network deploymentgg [DREX-like](https://github.com/bacen/pilotord-kit-onboarding/blob/main/arquitetura.md). 