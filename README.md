# Project Title

**Version 1.0.0**: Permissioned Voting DAO for Central and Commercial banks' liquidity injection and common interests based on [DREX pilot](https://github.com/bacen/pilotord-kit-onboarding)
**Version 2.0.0**: DID-VC SSI implementation for DAO participation. Probably using [Indy Besu](https://github.com/hyperledger/indy-besu)

## Future Considerations
- Voting contracts modularity: it might be a consideration to modularize voting contracts instances by using factory-like pattern according to each voting subject specification and complexity grownth

## Installation
Before cloning ensure the following dependencies are installed:

- [JDK 21 or later](https://jdk.java.net/22/)
- [Besu](https://github.com/hyperledger/besu/releases)
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

Feel free to clone and from project directory run ```./script.sh```. 
The script will handle contracts and a 4-node QBFT besu network deployment, being 1 validator and 3 fullnodes [DREX-like](https://github.com/bacen/pilotord-kit-onboarding/blob/main/arquitetura.md).