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
5. Start local eth node `yarn local-eth` - Will also deploy the entrypoint contract please wait for environment vars to be printed in the console and copy it to the `.env` file.
6. In a new terminal window start the bundler node with live watch for local dev. `yarn dev`

- The `relayer` node will start on `http://localhost:4337/rpc`. 
- The `bundle-builder` node will start on `http://localhost:4338/rpc`.

You can now make changes to the code and each node will automatically restart.

#### Local dev scripts 

1. Once the bundler node is running, you can use the `run-op` script to send a userOp through the bundler. `yarn op`

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
1. Use correct node version `nvm use`
2. Install dependencies `yarn install`
3. Build `relayer` and `bundle-builder` nodes `yarn build`
4. Copy values in `.env.sample` into `.env` and fill in the values with your own.

Now let's start the bundler node.(make sure to pass your command line arguments)
```bash
./transeptor --httpApi web3,eth,debug --txMode base
```

### 🐳 Run from Docker image

Build image locally
```bash
yarn image:bundle-builder
yarn image:relayer
```

Run image locally
```bash
yarn start:docker-bundle-builder
yarn start:docker-relayer
```

## Command line arguments

List of all command line arguments supported by the bundler.

```bash
Usage: index [options]

Options:
  -V, --version                  output the version number
  --httpApi <string>             ERC4337 rpc method name spaces to enable. (default: "web3,eth")
  --network <string>             ETH execution client url. (default: "http://localhost:8545")
  --minBalance <string>          Maximum ETH balance need for signer address. (default: "1")
  --maxBundleGas <number>        Max gas the bundler will use in transactions. (default: "5000000")
  --auto                         Automatic bundling. (default: false)
  --autoBundleInterval <number>  Auto bundler interval in (ms). (default: "12000")
  --bundleSize <number>          Maximum number of pending mempool entities to start auto bundler. (default: "10")
  --port <number>                Bundler node listening port. (default: "4000")
  --minStake <string>            Minimum stake a entity has to have to pass reputation system. (default: "1")
  --minUnstakeDelay <number>     Time paymaster has to wait to unlock the stake(seconds). (default: "0")
  --txMode <string>              Bundler transaction mode (base, conditional, searcher). (default: "base")
  --unsafe                       Enable no storage or opcode checks.
  --p2p                          p2p mode enabled (default: false)
  --findPeers                    Search for peers when p2p enabled. (default: false)
  --metrics                      Bundler node metrics tracking enabled. (default: false)
  --metricsPort <number>         Metrics server listening port. (default: "4001")
  --influxdbUrl <string>         Url influxdb is running on (requires --metrics to be enabled). (default:
                                 "http://localhost:8086")
  --influxdbOrg <string>         Influxdb org (requires --metrics to be enabled). (default: "transeptor-labs")
  --influxdbBucket <string>      Influxdb bucket (requires --metrics to be enabled). (default: "transeptor_metrics")
  -h, --help                     display help for command
```

## Environment variables

List of all environment variables supported by the bundler.

```bash
# Required for production
TRANSEPTOR_MNEMONIC=<your-mnemonic>
TRANSEPTOR_ENTRYPOINT_ADDRESS=0x
TRANSEPTOR_BENEFICIARY=<address_to_receive_funds>

# Optional
TRANSEPTOR_WHITE_LIST=<address_to_whitelist_SEPARATED_BY_COMMA>
TRANSEPTOR_BLACK_LIST=<address_to_blacklist_SEPARATED_BY_COMMA>
TRANSEPTOR_INFLUX_TOKEN=DEV_TOKEN
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
