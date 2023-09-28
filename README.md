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
    <img src="https://github.com/transeptorlabs/transeptor-bundler/actions/workflows/build.yml/badge.svg?branch=main">
  <img src="https://github.com/transeptorlabs/transeptor-bundler/actions/workflows/bundler-spec-test.yml/badge.svg?branch=main">
  <a href="https://app.codecov.io/gh/transeptorlabs/transeptor-bundler">
    <img src="https://img.shields.io/codecov/c/github/transeptorlabs/transeptor-bundler.svg?style=flat-square" alt="codecov">
  </a>
  <img src="https://img.shields.io/docker/pulls/transeptorlabs/bundler" alt="Docker pulls">
</p>

## Project status

> :warning: **This repository is currently under active development.**
> See our road-map [here](https://hackmd.io/@V00D00-child/SyXKL6Kmn#Project-StatusRoadmap-)


## 🚀 Development

Everything you need to get started developing with Transeptor.

### Run local development
1. Install dependencies `npm install`
2. Build all packages `npm run build`
3. Start local geth node `npm run eth-node`
4. Prepare bundler for development `npm run bundler-prep`
5. Copy values in `.env.sample` into `.env` and fill in the values with your own.


Now let's watch all `packages/*` and recompile on change.
```bash
npm run watch:dev
```

Open a new terminal and then start the bundler node.
```bash
npm run start:dev
```

The bundler will start on `http://localhost:3000/rpc`.

### Test

```bash
npm run test
```

### Lint

```bash
npm run lint-bundler-fix
```

or

```bash
npm run lint
```

## 🔧  Run from source
1. Install dependencies `npm install`
2. Build all packages `npm run build`
2. Give the script execution permission `chmod +x ./transeptor`

Now let's start the bundler node.(make sure to pass your command line arguments)
```bash

./transeptor --httpApi web3,eth,debug --txMode base
```

## 🐳 Run from Docker image

Build image locally
```bash
docker build -t bundler-typescript:v-local .
```

Run image locally
```bash
npm run start:bundler-docker
```

## 🧮 Command line arguments
- **Full Validation** - Uses geth `debug_traceCall` method to enforce the full spec storage access rules and opcode banning.
- **Partial Validation** - Standard call to entry Point Contract `simulateValidation()`. No storage access rules and opcode banning.

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
|        `--p2p`         | `boolean` | enable p2p mode enabled(under development)                                                    | `false`                 |
|        `--findPeers`         | `boolean` | search for peers when p2p enabled(under development)                                                  | `false`                 |

\*When staked, an entity is also allowed to use its own associated storage, in addition to senders associated storage as ETH.
**safe mode requires debug_traceCall support on eth node. Only base and conditional txMode are supported in safe mode. \***0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789

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
