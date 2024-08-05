#! /bin/bash

echo "Starting QBFT Besu bridge network - DREX Pilot"

# Check if jdk21+
JAVA_VERSION=$(java -version 2>&1 | awk -F[\".] '/version/ {print $2}')
if ! [ "$JAVA_VERSION" -ge 21 ] 2>/dev/null; then
  echo "Error: Java version must be 21+. Please go to https://jdk.java.net and install jdk21 or newer." >&2
  exit 1
fi

# Check if besu binary is installed
if ! [ -x "$(command -v besu)" ]; then
  echo "Error: besu is not installed. Go to https://besu.hyperledger.org/private-networks/get-started/install/binary-distribution" >&2
  exit 1
fi

# Check if curl is installed 
if ! [ -x "$(command -v curl)" ]; then
  echo "Error: curl is not installed. Go to https://curl.se/" >&2
  exit 1
fi

# Check if jq is installed
if ! [ -x "$(command -v jq)" ]; then
  echo "Error: jq is not installed. Go to https://stedolan.github.io/jq/download/" >&2
  exit 1
fi

# Check if docker is installed
if ! [ -x "$(command -v docker)" ]; then
  echo "Error: docker is not installed. Go to https://docs.docker.com/get-docker/" >&2
  exit 1
fi

echo "Cleaning up previous data"

# Clean up containers
docker rm -f besu-fn-0 besu-fn-1 besu-fn-2 besu-validator

# Clean up data dir from each node
rm -rf nodes/besu-fn-0/data
rm -rf nodes/besu-fn-1/data
rm -rf nodes/besu-fn-2/data
rm -rf nodes/besu-validator/data
rm -rf genesis
rm -rf _tmp

# Recreate data dir for each node
mkdir -p nodes/besu-fn-0/data
mkdir -p nodes/besu-fn-0/data/keys
mkdir -p nodes/besu-fn-1/data
mkdir -p nodes/besu-fn-1/data/keys
mkdir -p nodes/besu-fn-2/data
mkdir -p nodes/besu-fn-2/data/keys
mkdir -p nodes/besu-validator/data
mkdir -p nodes/besu-validator/data/keys

# Generate validator keys
besu --data-path=nodes/besu-validator/data public-key export --to=nodes/besu-validator/data/keys/key,pub
mv nodes/besu-validator/data/key nodes/besu-validator/data/keys/key 

# Update config file with validator address
output=$(besu --node-private-key-file=nodes/besu-validator/data/keys/key public-key export-address)
VALIDATOR_ADDRESS=$(echo "$output" | tail -n 1)
sed -i "s/\"validators\": \[\(\"0x[a-fA-F0-9]\{40\}\"\)\]/\"validators\": \[\"$VALIDATOR_ADDRESS\"\]/" ./config/drexQbftConfig.json

# Generate genesis
mkdir _tmp && cd _tmp
besu operator generate-blockchain-config --config-file=../config/drexQbftConfig.json --to=networkFiles --private-key-file-name=key

cd ..

counter=0
# Copy keys to each node
for folder in _tmp/networkFiles/keys/*; do
  # get the folder name
  folderName=$(basename "$folder")
  # copy the key to each node
  cp _tmp/networkFiles/keys/$folderName/key nodes/besu-fn-$counter/data/keys/key
  cp _tmp/networkFiles/keys/$folderName/key.pub nodes/besu-fn-$counter/data/keys/key,pub
  ((counter++))
done

# Copy genesis created
mkdir genesis && cp _tmp/networkFiles/genesis.json genesis/genesis.json

rm -rf _tmp

if ! docker network ls | grep -q besu_network; then
  docker network create besu_network
fi

echo "Starting bootnode"
# Start bootnode
docker-compose -f docker/docker-compose-bootnode.yaml up -d

# Retrieve bootnode enode address
max_retries=30  # Maximum number of retries
retry_delay=1  # Delay in seconds between retries
retry_count=0  # Initialize the retry count

while [ $retry_count -lt $max_retries ]; do
  export ENODE=$(curl -X POST --data '{"jsonrpc":"2.0","method":"net_enode","params":[],"id":1}' http://127.0.0.1:8545 | jq -r '.result')

  if [ -n "$ENODE" ]; then
    # check if the enode is not null
    if [ "$ENODE" != "null" ]; then
      echo "ENODE retrieved successfully."
      break  # Exit the loop if successful
    fi
  else
    echo "Failed to retrieve ENODE. Retrying in $retry_delay seconds..."
    sleep $retry_delay
    ((retry_count++))
  fi
done

if [ $retry_count -eq $max_retries ]; then
  echo "Max retries reached. Unable to retrieve ENODE."
fi

echo "ENODE: $ENODE"

export E_ADDRESS="${ENODE#enode://}"
export DOCKER_NODE_1_ADDRESS=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' besu-fn-0)
export E_ADDRESS=$(echo $E_ADDRESS | sed -e "s/127.0.0.1/$DOCKER_NODE_1_ADDRESS/g")
echo $E_ADDRESS

# Update docker-compose-nodes with ENODE
sed "s/<ENODE>/enode:\/\/$E_ADDRESS/g" docker/templates/docker-compose-nodes.yaml > docker/docker-compose-nodes.yaml

# Start nodes
echo "Starting nodes"
docker-compose -f docker/docker-compose-nodes.yaml up -d

echo "============================="
echo "Network started successfully!"
echo "============================="
