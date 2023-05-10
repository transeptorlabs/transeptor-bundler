# OpNode-bundler
A simple modular Typescript implementation of an ERC-4337 Bundler.

See proposal here: https://hackmd.io/@V00D00-child/SyXKL6Kmn

## Running Bundler Locally
Storage access rules and opcode banning are two mechanisms implemented in Ethereum clients to enforce security and prevent certain malicious or unsafe behaviors on the network. The Bundler has multiple configrations to ensure it can implement the full spec storage access rules and opcode banning. Specifically, the Bundler will need to use `debug_traceCall` method to enforce the full spec storage access rules and opcode banning.

- **debug_traceCall**: This method traces the execution of a specific function call within a contract. It allows you to observe the execution of a specific function in isolation, without executing the entire transaction. It provides insights into the internal execution of the function, the changes to the contract's state, and the resulting return values.

Alternivley, if a node does NOT support `debug_traceCall` a hack of mine the transaction, and then `debug_traceTransaction` can be used to enforce the full spec storage access rules and opcode banning.

- **debug_traceTransaction**: This method traces the execution of a specific transaction from start to finish. It provides a detailed log of the execution steps, including the initial transaction call, any internal calls made within the transaction, and the final state changes caused by the transaction's execution.

### GETH client
**Follow the set below to run Bundler server using a GETH client**

GETH node supports `debug_traceCall` with javascript "tracer"

1. Install dependencies `npm install`
2. Add and configuration files `bundler.config.json` and `.env`
3. Start GETH client
```
docker run --rm -ti --name geth -p 8545:8545 ethereum/client-go:v1.10.26 \
  --miner.gaslimit 12000000 \
  --http --http.api personal,eth,net,web3,debug \
  --http.vhosts '*,localhost,host.docker.internal' --http.addr "0.0.0.0" \
  --ignore-legacy-receipts --allow-insecure-unlock --rpc.allow-unprotected-txs \
  --dev \
  --verbosity 2 \
  --nodiscover --maxpeers 0 --mine --miner.threads 1 \
  --networkid 1337
```

4. Deploy entry point contract and fund the bundler signer account `npm run deploy:local`
5. Start up Bundler server `npm start`

**note: if GETH is terminated, the `npm run deploy:local` script will need to be run again to re-deploy entry point contract and re-fund the bundler signer account.

### Ethereum goerli test network(Alchemy) 
Alchemy nodes support both `debug_traceCall` and `debug_traceTransaction` API, the Bundler with use the former.
1. Need to sign up for an Alchemy account
2. Update `.env` value `ALCHEMY_API_KEY=<your-api-key>`
3. Add your url `https://eth-goerli.g.alchemy.com/v2` to network in `bundler.config.json`
4. Start up Bundler `npm start`


## ERC-4337 Entrypoint contract
This Bundler uses [Infinitism](https://github.com/eth-infinitism/account-abstraction) `@account-abstraction/contracts`(version 0.6.0) entry point contract for local development. The `npm fetch:abi` script fetched abi for the contract and saves it locally at `./abi/entrypoint.js`.

## Test
`npm run test`
