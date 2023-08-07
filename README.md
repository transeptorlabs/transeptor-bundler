<p align="center"><a href="https://transeptorlabs.io/docs/category/bundler"><img width="500" title="Transeptor" src='https://transeptorlabs.io/img/brand/transeptor.png' /></a></p>

![Node Version](https://img.shields.io/badge/node-18.x-green)
![TS](https://badgen.net/badge/-/TypeScript?icon=typescript&label&labelColor=blue&color=555555)
![Github workflow build status(main)](https://img.shields.io/github/actions/workflow/status/transeptorlabs/transeptor-bundler/build.yml?branch=main)
[![codecov](https://img.shields.io/codecov/c/github/transeptorlabs/transeptor-bundler.svg?style=flat-square)](https://app.codecov.io/gh/transeptorlabs/transeptor-bundler)
![Docker pulls](https://img.shields.io/docker/pulls/transeptorlabs/bundler)

A modular Typescript ERC-4337 Open Source Bundler, designed with a strong emphasis on performance. See our road-map [here](https://hackmd.io/@V00D00-child/SyXKL6Kmn#Project-StatusRoadmap-)

> :warning: **This repository is currently under active development.**

## Contributing
We welcome contributions to enhance our ERC-4337 Bundler. If you would like to contribute, please follow these guidelines [here](https://github.com/transeptorlabs/transeptor-bundler/blob/main/CONTRIBUTING.md).

## Installation
```bash
npm install
```

## Development
Everything you need to get started developing with the Bundler.

#### Run local ETH Node
`npm run eth-node`

#### Deploy ERC-4337 contracts and fund bundler signer account
Run `npm run bundler-prep` to set up the bundler for development. This will:
- deploy the entry point contract to the local eth node.
- deploy simple account factory contract to the local eth node. 
- Fund the bundler signer account with ETH.

#### Start Bundler node 
1. Ensure that ETH node is running, ERC-4337 contracts are deployed and bundler signer account is funded.
2. Copy values in `.env.sample` into `.env` and fill in the values with your own.
3. Pick a mode to run the bundler in; see table below for details.

|   Mode  |    Script   | Validation | Bundle strategy |
|:-------:|:-----------:|------------|:---------------:|
| address | `string`    |            |                 |
| balance | `BigNumber` |            |                 |


The bundler will start on `http://localhost:3000/rpc`

#### Start Bundler node p2p
1. Ensure that ETH node is running, ERC-4337 contracts are deployed and bundler signer account is funded.
2. Start the bundler node in p2p mode.
3. 

## Test
`npm run test`

## Lint
- `npm run lint`
- `npm run lint:fix`


## Acknowledgements
We would like to express our gratitude to the following individuals and organizations for their contributions and support in making this project possible:

- [Infinitism](https://github.com/eth-infinitism/bundler) - for inspiring our project and serving as a reference for implementation techniques.

We are grateful to the open-source community and the countless developers who have shared their knowledge and resources, enabling us to build upon their work.

Thank you all for your support!

## Contact
If you have any questions, or feedback about the ERC-4337 Bundler project, please feel free to reach out to us.

- **Twitter**: [@transeptorlabs](https://twitter.com/transeptorlabs)
- **Telegram**: [Telegram channel](https://t.me/+eUGda3KIND4zMjRh)

We value and appreciate your feedback and involvement, as it plays a crucial role in the growth and success of the project. We look forward to hearing from you!

## License
Licensed under the [GPL-3.0 License](https://github.com/transeptorlabs/transeptor-bundler/blob/main/LICENSE).
