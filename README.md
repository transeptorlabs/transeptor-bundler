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

> :warning: **The `main` branch of Transeptor is under active development and is compatible with [Entrypoint releases/v0.8](https://github.com/eth-infinitism/account-abstraction/tree/releases/v0.8).**
>
> **Support for previous EntryPoint releases are available below.**
>
> - Compatible with [Entrypoint releases/v0.7](https://github.com/eth-infinitism/account-abstraction/tree/releases/v0.7): [Transeptor v0.11.0-alpha.0](https://github.com/transeptorlabs/transeptor-bundler/tree/v0.11.0-alpha.0)
> - Compatible with [Entrypoint releases/v0.6](https://github.com/eth-infinitism/account-abstraction/tree/releases/v0.6): [Transeptor v0.5.3-alpha.0](https://github.com/transeptorlabs/transeptor-bundler/tree/v0.5.3-alpha.0)

## Quick Start

To quickly start using Transeptor, follow the instructions in our [Quick Start guide](https://transeptor.transeptorlabs.io/docs/get-started#quick-start).

## Development

**Prerequisites**

- [NodeJS](https://nodejs.org/) (>=v22.14.0)
- [Yarn](https://classic.yarnpkg.com/lang/en/) (v4.7.0)
- [Docker](https://docs.docker.com/compose/install/) (>=v27.5.1)
- [Git](https://git-scm.com/) (>=v2.39.5)

Follow these instructions to get the project up and running on your local machine for development purposes:

1. Run the following commands in order to prepare dev environment.

```bash
# Ensure the submodule is checked out properly by running
git submodule update --init --recursive

# Use the correct node version
nvm use

# Install dependencies
yarn install

# Starts dev nodes `geth` and `geth-with-erc7562-tracer` Docker images and deploys entrypoint contract to the 1337 network.
yarn start:eth-dev
```

2. Please wait for environment vars to be printed in the terminal and copy it to your `.env` files.
3. In a new terminal window, start the bundler node in dev mode with a live watch for changes in the `./src` path with auto restarts. There are two different dev modes:
  - `yarn dev` - To start the bundler node in safe mode with full storage and opcode checks.
  - `yarn dev:unsafe` - To start the bundler node in unsafe mode with no storage or opcode checks.

The bundler node will start on `http://localhost:4337/rpc`.

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
- [EIP-7702](https://eips.ethereum.org/EIPS/eip-7702)
