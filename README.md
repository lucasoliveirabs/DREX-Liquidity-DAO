# Project Title

**Version 1.0.0**: Voting System DAO for Central and Commercial banks' interests based on [DREX pilot](https://github.com/bacen/pilotord-kit-onboarding)
**Version 2.0.0**: DID-VC for voting. Probably [Indy Besu](https://github.com/hyperledger/indy-besu)

## Future Considerations
Voting Factory: it is a consideration to modularize voting contracts instances by using factory-like pattern in function of each voting subject specification.

## Installation
Before cloning ensure the following dependencies are installed:

- [JDK 21 or later](https://jdk.java.net/22/)
- [Besu](https://github.com/hyperledger/besu/releases)
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

Feel free to clone and from project directory run ```./script.sh```. 
The script will handle contracts and a 4-node QBFT besu network deployment, being 1 validator and 3 fullnodes [DREX-like](https://github.com/bacen/pilotord-kit-onboarding/blob/main/arquitetura.md).