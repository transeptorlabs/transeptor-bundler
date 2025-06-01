# Searcher on testnet e2e

## Deploying Counter contracts on a network

1. Replace `<network_provider_url>` with the URL of the network you want to deploy the contract on.
2. Add `PRIVATE_KEY_E2E` to the `contracts/.env` file to deploy the contract on the network. Make sure the account has enough balance to deploy the contract.

Run the following commands to deploy the Counter contract on the network:
```bash
cd contracts
forge build
forge script ./scripts/DeployBundlerE2e.s.sol --rpc-url <network_provider_url> --broadcast
```

The last command will output the address of the deployed contract.


## Running bundler

1. Start up geth with ERC-7562 tracer 
```bash
docker run -d --name geth-with-erc7562-tracer -p 8545:8545 accountabstraction/geth-with-erc7562-tracer \
    --verbosity 1 \
    --http.vhosts '*,localhost,host.docker.internal' \
    --http \
    --http.port 8545 \
    --http.api eth,net,web3,debug \
    --http.corsdomain '*' \
    --http.addr "0.0.0.0" \
    --networkid 1337 \
    --dev \
    --dev.period 0 \
    --allow-insecure-unlock \
    --rpc.allow-unprotected-txs \
    --dev.gaslimit 20000000
```

2. Build Transeptor Docker image locally:
```bash
yarn build:image
```

3. Transeptor requires a set of environment variables to run. Create a `.env.test` file and add the following variables:
```bash
# Required
TRANSEPTOR_ENTRYPOINT_ADDRESS=0x0000000071727De22E5E9d8BAf0edAc6f37da032
TRANSEPTOR_BENEFICIARY=<address_to_receive_funds>
TRANSEPTOR_MNEMONIC=<your-mnemonic>

# Optional
TRANSEPTOR_WHITE_LIST=<address_to_allow_SEPARATED_BY_COMMA>
TRANSEPTOR_BLACK_LIST=<address_to_ban_SEPARATED_BY_COMMA>
```

4. Run Transeptor Docker container:
```bash
docker run -d --name transeptor -p 4337:4337 --env-file .env.test bundler-typescript:v-local \
    --httpApi web3,eth,debug \
    --txMode searcher \
    --port 4337 \
    --minBalance 0.01 \
    --network http://host.docker.internal:8545 \
    --auto
```

Transeptor will start on `http://localhost:4437/rpc.` Run curl command to check if the Transeptor is running:

```bash
curl -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"web3_clientVersion","params":[],"id":67}' http://localhost:4337/rpc
```

```bash
curl -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":67}' http://localhost:4337/rpc
```