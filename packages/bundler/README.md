# @transeptor-bundler

![Node Version](https://img.shields.io/badge/node-18.x-green)
![TS](https://badgen.net/badge/-/TypeScript?icon=typescript&label&labelColor=blue&color=555555)
![Github workflow build status(main)](https://img.shields.io/github/actions/workflow/status/transeptorlabs/transeptor-bundler/build.yml?branch=main)

## 📥 Installation

```bash
npm install
```

## 🚀 Development

Everything you need to get started developing with the Bundler.

#### Run local ETH Node

```bash
npm run eth-node
```

#### Deploy ERC-4337 contracts and fund bundler signer account

```bash
npm run bundler-prep
```

Use this script to:

- deploy the entry point contract to the local eth node.
- deploy simple account factory contract to the local eth node.
- Fund the bundler signer account with ETH.

#### Start Bundler node

Copy values in `.env.sample` into `packages/bundler/.env` and fill in the values with your own.

```env
MNEMONIC=test test test test test test test test test test test junk
INFURA_API_KEY=<your-infura-api-key>
ALCHEMY_API_KEY=<your-alcemy-api-key>
BENEFICIARY=<address_to_receive_funds>
WHITE_LIST=<address_to_whitelist_SEPARATEDBY_COMMA>
BLACK_LIST=<address_to_blacklist_SEPARATEDBY_COMMA>
PEER_MULTIADDRS=<multiaddrs_of_peers_SEPARATEDBY_COMMA>
```

1. Ensure that the ETH node is running, ERC-4337 contracts are deployed, and the bundler signer account is funded.
2. Ensure that you populate `.env` with your own.
3. Pick a mode to run the bundler; see the table below for details.

| Mode                | Script                               | Validation         | Bundle strategy                                                                          |
| ------------------- | ------------------------------------ | ------------------ | ---------------------------------------------------------------------------------------- |
| base                | `npm run bundler:base`               | Full Validation    | Uses `eth_sendRawTransaction` RPC                                                        |
| base(unsafe)        | `npm run bundler:base-unsafe`        | Partial Validation | Uses `eth_sendRawTransaction` RPC                                                        |
| conditional         | `npm run bundler:conditional`        | Full Validation    | Uses `eth_sendRawTransactionConditional` RPC                                             |
| conditional(unsafe) | `npm run bundler:conditional-unsafe` | Partial Validation | Uses `eth_sendRawTransactionConditional` RPC                                             |
| searcher            | `npm run bundler:searcher`           | Partial Validation | Uses [Flashbots](https://docs.flashbots.net/flashbots-auction/searchers/quick-start) API |
| base-p2p            | `npm run bundler:base-p2p`           | Full Validation |  | Uses `eth_sendRawTransaction` 
| base-p2p-peer            | `npm run bundler:peer`           | Full Validation |  | Uses `eth_sendRawTransaction` 


The bundler will start on `http://localhost:3001/rpc`.

#### Start Bundler node p2p
1. Ensure that ETH node is running, ERC-4337 contracts are deployed and bundler signer account is funded.
2. Ensure that a bundler node is running on `http://localhost:3000/rpc` with `--p2p` flag(mode base-p2p ).
3. Add the bundler node's multiaddr to the `PEER_MULTIADDRS` in `.env` file.
4. Start bundler peer node(mode base-p2p-peer).

The bundler will start on `http://localhost:3000/rpc`.

## Features

- **Full Validation** - Uses geth `debug_traceCall` method to enforce the full spec storage access rules and opcode banning.
- **Partial Validation** - Standard call to entry Point Contract `simulateValidation()`. No storage access rules and opcode banning.

## Command line arguments

List of all command line arguments supported by the bundler.

|      **Options**       | **Type**  | **Description**                                                     | **Default Value**       |
| -------------------- | ------- | ------------------------------------------------------------------- | ----------------------- |
|      `--httpApi`       | `string`  | rpc method name spaces                                              | `web3,eth`              |
|      `--network`       | `string`  | eth client url                                                      | `http://localhost:8545` |
|      `entryPoint`      | `number`  | supported entry point address                                       | `0x5FF1...2789`\*\*\*   |
|     `--minBalance`     | `number`  | min ETH balance for signer account                                  | `1`                     |
|    `--maxBundleGas`    | `number`  | max gas the bundler will use in transactions                        | `5000000`               |
|        `--auto`        | `boolean` | automatic bundling                                                  | `false`                 |
| `--autoBundleInterval` | `number`  | auto bundler interval in (ms)                                       | `120000`                |
|     `--bundleSize`     | `number`  | maximum # of pending mempool entities                               | `10`                    |
|        `--port`        | `number`  | server listening port                                               | `3000`                  |
|  `--minUnstakeDelay`   | `number`  | time paymaster has to wait to unlock the stake (seconds)            | `0`                     |
|      `--minStake`      | `number`  | minimum stake an entity has to have to pass the reputation system\* | `1`                     |
|       `--txMode`       | `string`  | bundler transaction mode (base, conditional, searcher)              | `base`                  |
|       `--unsafe`       | `boolean` | UNSAFE mode: no storage or opcode checks \*\*                       | `false`                 |
|        `--p2p`         | `boolean` | enable p2p mode enabled                                                    | `false`                 |
|        `--findPeers`         | `boolean` | search for peers when p2p enabled                                                    | `false`                 |

\*When staked, an entity is also allowed to use its own associated storage, in addition to senders associated storage as ETH.
**safe mode requires debug_traceCall support on eth node. Only base and conditional txMode are supported in safe mode. \***0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789

## Docker image

Pull latest image from docker hub
```bash
docker pull transeptorlabs/bundler
```

Build image locally
```bash
npm run build:bundler-docker
```

Run image locally
```bash
npm ru

## 🧪 Test

```bash
npm run test
```

## 🔍 Lint

```bash
npm run lint:fix
```

or

```bash
npm run lint
```

## EIP4337 bundler compatibility tests
1. Clone EIP4337 bundler compatibility [repo](https://github.com/eth-infinitism/bundler-spec-tests)
2. Follow readme to install the dependencies.
3. Inside repo directory run the following command to run the tests(make sure the bundler is running locally).

```bash
pdm run pytest -rA -W ignore::DeprecationWarning --url http://localhost:3000/rpc --entry-point 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789 --ethereum-node http://localhost:8545
```
