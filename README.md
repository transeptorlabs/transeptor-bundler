<p align="center">
  <a href="https://transeptorlabs.io/docs/category/bundler">
    <img width="500" title="Transeptor" src='https://transeptorlabs.io/img/brand/transeptor.png' />
  </a>
</p>

<p align="center">
  A fast ERC-4337 bundler node with TypeScript-based <strong>compile-time type safety.</strong> 
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-20.11.1-green" alt="Node Version">
  <img src="https://badgen.net/badge/-/TypeScript?icon=typescript&label&labelColor=blue&color=555555" alt="TypeScript">
    <img src="https://github.com/transeptorlabs/transeptor-bundler/actions/workflows/main.yml/badge.svg?branch=main">
  <a href="https://app.codecov.io/gh/transeptorlabs/transeptor-bundler">
    <img src="https://img.shields.io/codecov/c/github/transeptorlabs/transeptor-bundler.svg?style=flat-square" alt="codecov">
  </a>
  <img src="https://img.shields.io/badge/ESM-supported-brightgreen" alt="ESM Supported">
</p>

> :warning: **This repository is currently under active development.**
> 
> Support ERC-4337 Entrypoint contract [releases/v0.7](https://github.com/eth-infinitism/account-abstraction/tree/releases/v0.7)

## 🚀 Development

Everything you need to get started developing with Transeptor.

### Run local development
1. `git submodule update --init`
2. Use correct node version `nvm use`
3. Add `PRIVATE_KEY` to `contracts/.env` file to deploy the entrypoint contract locally.
4. Install dependencies `yarn install`
5. Start local eth node `yarn local-eth` - Will also deploy the entrypoint contract please wait for environment vars to be printed in the console and copy it to the nodes `.env` files.
6. In a new terminal window start the bundler node with live watch for local dev. `yarn dev`

- The `relayer` node will start on `http://localhost:4337/rpc`. 
- The `bundle-builder` node will start on `http://localhost:4338/rpc`.

You can now make changes to the code and each node will automatically restart.

#### Local dev e2e scripts 

Make sure both `relayer` and `bundle-builder` nodes are running before running to to send a userOp through the bundler

```bash
yarn send-op
```

### Test

```bash
yarn test
```

### Lint

```bash
yarn lint
```

or

```bash
yarn lint:fix
```

## Build

You can build Transeptor from source or use the Docker image.

### 🔧 Run from source
1. Use correct node version: `nvm use`
2. Install dependencies: `yarn install`
3. Build `bundler-relayer` and `bundler-builder` nodes: `yarn build`

Now let's start the bundler nodes.
```bash
./transeptor-builder
./transeptor-relayer
```

### 🐳 Run from Docker images

Build images
```bash
yarn build:images
```

Run images in the background
```bash
yarn start:images
```

stop images
```bash
yarn stop:images
```

## Contribute

We welcome contributions to enhance our ERC-4337 Bundler. If you would like to contribute, please follow these guidelines [here](https://github.com/transeptorlabs/transeptor-bundler/blob/main/CONTRIBUTING.md). There are a few things you can do right now to help out:

- Add tests. There can never be enough tests.

## Contact Us

If you have any questions or feedback about the ERC-4337 Bundler project, please feel free to reach out to us.

- **Twitter**: [@transeptorlabs](https://twitter.com/transeptorlabs)
- **Telegram**: [Telegram channel](https://t.me/+eUGda3KIND4zMjRh)

## License

Licensed under the [GPL-3.0 License](https://github.com/transeptorlabs/transeptor-bundler/blob/main/LICENSE).

## Acknowledgements

We want to express our gratitude to the following individuals and organizations for their contributions and support in making this project possible:

- [Infinitism](https://github.com/eth-infinitism/bundler) - for inspiring our project and serving as a reference for implementation techniques.

We are grateful to the open-source community and the countless developers who have shared their knowledge and resources, enabling us to build upon their work.

Thank you all for your support!
