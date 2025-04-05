<p align="center">
  <a href="https://transeptor.transeptorlabs.io/docs">
    <img width="500" title="Transeptor" src='https://transeptorlabs.io/transeptor.png' />
  </a>
</p>

<p align="center">
 A lightweight, blazing-fast, modular ERC-4337 TypeScript bundler built with functional programming
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-22.14.0-green" alt="Node Version">
  <img src="https://badgen.net/badge/-/TypeScript?icon=typescript&label&labelColor=blue&color=555555" alt="TypeScript">
    <img src="https://github.com/transeptorlabs/transeptor-bundler/actions/workflows/main.yml/badge.svg?branch=main">
  <a href="https://app.codecov.io/gh/transeptorlabs/transeptor-bundler">
    <img src="https://img.shields.io/codecov/c/github/transeptorlabs/transeptor-bundler.svg?style=flat-square" alt="codecov">
  </a>
  <img src="https://img.shields.io/badge/ESM-supported-brightgreen" alt="ESM Supported">
  <img src="https://img.shields.io/docker/pulls/transeptorlabs/bundler" alt="Docker pulls">
</p>

> :warning: **Please note that while the software is fully functional, it is important to know that it may contain bugs and incomplete features and undergo frequent updates.**

- Supports ERC-4337 Entrypoint contract [releases/v0.7](https://github.com/eth-infinitism/account-abstraction/tree/releases/v0.7)
  
## Quick Start

To quickly start using Transeptor, follow the instructions in our [Quick Start guide](https://transeptor.transeptorlabs.io/docs/get-started#quick-start).

## Development

**Prerequisites**
- [NodeJS](https://nodejs.org/) (>=v22.14.0)
- [Yarn](https://classic.yarnpkg.com/lang/en/) (v4.7.0)
- [Docker](https://docs.docker.com/compose/install/) (>=27.5.1)

Follow these instructions to get the project up and running on your local machine for development purposes:
1. `git submodule update --init`
2. Use the correct node version `nvm use`
3. Add `PRIVATE_KEY` to the `contracts/.env` file to deploy the entrypoint contract locally.
4. Install dependencies `yarn install`
5. Start local `geth node` and `geth-tracer-node`: `yarn local-eth`
    - Deploys the entrypoint contract to the local network.
   - Please wait for environment vars to be printed in the console and copy it to your `.env` files.
6. In a new terminal window, start the bundler node in dev mode with a live watch for changes in the `./src` path with auto restarts. There are three different dev modes:
   - `yarn dev` - To start the bundler node in safe mode with full storage and opcode checks.
   - `yarn dev:unsafe` - To start the bundler node in unsafe mode with no storage or opcode checks.
   - `yarn dev:native-tracer` - To start the bundler node in safe mode with full storage and opcode checks enabled by the native tracer.

- The bundler node will start on `http://localhost:4337/rpc`. 

### Test

Run the test suite.
```bash
yarn test
```

Run an e2e script to send a userOp through the bundler.
```bash
yarn send-op
```

### Lint

```bash
yarn lint
yarn lint:fix
```

## Running Transeptor

Transeptor offers multiple options for installation and configuration. Refer to the [Running Transeptor](https://github.com/transeptorlabs/transeptor-bundler/blob/main/docs/running-transeptor.md) guide for details.

## Node Configuration

For detailed configuration options, including command-line arguments and environment variables, visit the [Node Configuration guide](https://github.com/transeptorlabs/transeptor-bundler/blob/main/docs/node-configuration.md).

## Contribute

We welcome contributions to enhance our ERC-4337 Bundler. Please follow our [contribution guidelines.](https://github.com/transeptorlabs/transeptor-bundler/blob/main/CONTRIBUTING.md).

## Contact Us

If you have any questions or feedback about Transeptor, reach out to us:.

- **Twitter**: [@transeptorlabs](https://twitter.com/transeptorlabs)
- **Telegram**: [Telegram channel](https://t.me/+eUGda3KIND4zMjRh)

## License

Licensed under the [GPL-3.0 License](https://github.com/transeptorlabs/transeptor-bundler/blob/main/LICENSE).

## Acknowledgements

We appreciate the open-source community and those who have shared their knowledge, enabling us to build on their work:

- [Infinitism](https://github.com/eth-infinitism/bundler) - for inspiring our project and serving as a reference for implementation techniques.

## Relevant Documents
- [ERC-4337](https://eips.ethereum.org/EIPS/eip-4337)
- [ERC-7562](https://eips.ethereum.org/EIPS/eip-7562)
- [EIP-1153](https://eips.ethereum.org/EIPS/eip-1153)