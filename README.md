<p align="center">
  <a href="https://transeptorlabs.io/docs/category/bundler">
    <img width="500" title="Transeptor" src='https://transeptorlabs.io/img/brand/transeptor.png' />
  </a>
</p>

<p align="center">
  The TypeScript implementation of the ERC-4337 Bundler client; was designed with a strong emphasis on performance.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-18.x-green" alt="Node Version">
  <img src="https://badgen.net/badge/-/TypeScript?icon=typescript&label&labelColor=blue&color=555555" alt="TypeScript">
  <img src="https://img.shields.io/github/actions/workflow/status/transeptorlabs/transeptor-bundler/build.yml?branch=main" alt="Github workflow build status (main)">
  <img src="https://img.shields.io/github/actions/workflow/status/transeptorlabs/transeptor-bundler/bundler-spec-test.yml?branch=main" alt="Github workflow bundler spec test status (main)">
  <a href="https://app.codecov.io/gh/transeptorlabs/transeptor-bundler">
    <img src="https://img.shields.io/codecov/c/github/transeptorlabs/transeptor-bundler.svg?style=flat-square" alt="codecov">
  </a>
  <img src="https://img.shields.io/docker/pulls/transeptorlabs/bundler" alt="Docker pulls">
</p>

## Project status

> :warning: **This repository is currently under active development.**
> See our road-map [here](https://hackmd.io/@V00D00-child/SyXKL6Kmn#Project-StatusRoadmap-)

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
| `--autoBundleInterval` | `number`  | auto bundler interval in (ms)                                       | `12000`                |
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
npm run start:bundler-docker
```

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

## Contribute

We welcome contributions to enhance our ERC-4337 Bundler. If you would like to contribute, please follow these guidelines [here](https://github.com/transeptorlabs/transeptor-bundler/blob/main/CONTRIBUTING.md). There are a few things you can do right now to help out:

- Add tests. There can never be enough tests.

## Acknowledgements

We want to express our gratitude to the following individuals and organizations for their contributions and support in making this project possible:

- [Infinitism](https://github.com/eth-infinitism/bundler) - for inspiring our project and serving as a reference for implementation techniques.

We are grateful to the open-source community and the countless developers who have shared their knowledge and resources, enabling us to build upon their work.

Thank you all for your support!

## Contact

If you have any questions or feedback about the ERC-4337 Bundler project, please feel free to reach out to us.

- **Twitter**: [@transeptorlabs](https://twitter.com/transeptorlabs)
- **Telegram**: [Telegram channel](https://t.me/+eUGda3KIND4zMjRh)

We value and appreciate your feedback and involvement, as it plays a crucial role in the growth and success of the project. We look forward to hearing from you!

## 📄 License

Licensed under the [GPL-3.0 License](https://github.com/transeptorlabs/transeptor-bundler/blob/main/LICENSE).
