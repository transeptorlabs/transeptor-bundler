<p align="center">
  <a href="https://transeptor.transeptorlabs.io/docs">
    <img width="500" title="Transeptor" src='https://transeptor.transeptorlabs.io/img/brand/transeptor.png' />
  </a>
</p>

<p align="center">
  Built by <a href="https://github.com/transeptorlabs">Transeptor Labs</a>, we champion bundler diversity, mempool compatibility, and open experimentation—because a decentralized Ethereum depends on resilient public-good infrastructure.
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

**Table of Contents**

<!--TOC-->

- [What is Transeptor?](#what-is-transeptor)
- [Quick Start](#quick-start)
- [Development](#development)
  - [Prerequisites](#prerequisites)
  - [Getting started](#getting-started)
  - [Test](#test)
  - [Lint](#lint)
- [Running Transeptor](#running-transeptor)
- [Node Configuration](#node-configuration)
- [Contribute](#contribute)
- [Contact Us](#contact-us)
- [License](#license)
- [Acknowledgements](#acknowledgements)
- [Relevant Documents](#relevant-documents)

<!--TOC-->

## What is Transeptor?

> Run a node. Join the ecosystem. Help shape the future of account abstraction.

**Transeptor is a high-performance, modular ERC-4337 bundler designed to make smart accounts scalable and usable on Ethereum.** Built in TypeScript with a functional programming foundation, it prioritizes security and developer experience. Transeptor helps abstract complexity so teams can build intuitive applications on top of Account Abstraction.

This project is maintained by **[Transeptor Labs](https://github.com/transeptorlabs)**, an open-source collective building public-good infrastructure to support Ethereum’s evolution toward a user-centric experience.

Our long-term vision is to:

- **Run it yourself** - Make it easy for anyone to run their own bundler node.
- **Promote bundler diversity and reduce centralization risks** — We are committed to decentralization by offering public bundlers anyone can use, and empowering developers to run and customize their own.
- **Bundler compatibility** - Maintain strict compatibility with [erc-4337/bundler-spec-test](https://www.erc4337.io/bundlers) to preserve the vision of a [Unified ERC-4337 mempool](https://notes.ethereum.org/@yoav/unified-erc-4337-mempool).
- **Embrace the Future** - Experiment safely with advanced features to push bundler UX and performance forward. Any system that can be written down can be realized.

By contributing to Transeptor, you're helping build an open, composable infrastructure layer that strengthens Ethereum’s decentralization and usability without requiring any changes to the protocol.

## Quick Start

To quickly start using Transeptor, follow the instructions in our [Quick Start guide](https://transeptor.transeptorlabs.io/docs/get-started#quick-start).

## Development

### Prerequisites

Before getting started, make sure you have the following tools installed on your machine:

- [Node.js](https://nodejs.org/) (>= **v22.14.0**)
- [nvm](https://github.com/nvm-sh/nvm) – Node version manager
- [Yarn](https://classic.yarnpkg.com/lang/en/) (**v4.7.0**)
- [Docker](https://docs.docker.com/compose/install/) – with Docker Compose **v2**
- [Git](https://git-scm.com/)
- [Foundry (forge)](https://getfoundry.sh/introduction/installation) (>= **1.1.0**)

> **Tip:** You can run the `./scripts/check-prerequisites.sh` script to verify your system is ready to run the development environment:
>
> This script will validate the required versions of Node.js, Yarn, Git, Docker Compose, and Foundry.

```bash
chmod +x ./scripts/check-prerequisites.sh
./scripts/check-prerequisites.sh
```

### Getting started

Follow these instructions to get the project up and running on your local machine for development purposes:

1. Run the following commands in order to prepare dev environment.

```bash
# Ensure the submodule is checked out properly by running
git submodule update --init --recursive

# Use the correct node version
nvm use

# Use yarn version 4.7.0
corepack enable

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

We welcome contributions to enhance our ERC-4337 Bundler. Please follow our [contribution guidelines](https://github.com/transeptorlabs/transeptor-bundler/blob/main/CONTRIBUTING.md).

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
