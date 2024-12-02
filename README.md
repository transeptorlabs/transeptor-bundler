<p align="center">
  <a href="https://transeptor.transeptorlabs.io/docs">
    <img width="500" title="Transeptor" src='https://transeptorlabs.io/transeptor.png' />
  </a>
</p>

<p align="center">
 A lightweight, blazing-fast, modular ERC-4337 TypeScript bundler built with functional programming
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-20.11.1-green" alt="Node Version">
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

## Prerequisites
- [NodeJS](https://nodejs.org/) (>=20.11.1)
- [Yarn](https://classic.yarnpkg.com/lang/en/)

## Development

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

Transeptor offers many options for installing and running the bundler node.

### Build from source

Building Transeptor from source requires NodeJS and Yarn. Once you have installed the prerequisites, follow these steps to build Transeptor:
```bash
nvm use
yarn install
yarn build
./transeptor --help
```

### Docker
Quickly get Transeptor running on your machine using Docker.

The following command will start Transeptor using the latest stable release. Replace `<.path_to_your-env_file>` with the path to your `.env` file and `<http://your_ethererm_network_provider_url>` with the URL of your Ethereum network provider.
```bash
docker run -d --name transeptor -p 4337:4337 --env-file <.path_to_your-env_file> transeptorlabs/bundler:latest \
 --httpApi web3,eth,debug \
 --txMode base \
 --port 4337 \
 --network <http://your_ethererm_network_provider_url> \
 --auto 
```

#### Building Docker image

Building the Docker image from the source code requires that the Docker be installed on your machine. Once you have installed Docker, follow these steps to build the Docker image from soruce.

```bash
yarn build:image
```

Run image in the background
```bash
yarn start:image
```

stop image
```bash
yarn stop:image
```

## Node Configuration

### Command line arguments

List of all command line arguments supported by the bundler.

```bash
Options:
  -V, --version                  output the version number
  --unsafe                       UNSAFE mode: Enable no storage or opcode checks during userOp simulation. SAFE mode(default).
  --tracerRpcUrl <string>        Enables native tracer for full validation during userOp simulation with prestateTracer native tracer on the network provider. requires unsafe=false.
  --network <string>             Ethereum network provider. (default: "http://localhost:8545")
  --httpApi <string>             ERC4337 rpc method namespaces to enable. (default: "web3,eth")
  --port <number>                Bundler node listening port. (default: "4337")
  --numberOfSigners <number>     Number of signers HD paths to use from mnemonic (default: "3")
  --minBalance <string>          Minimum ETH balance needed for signer address. (default: "1")
  --mistake <string>            Minimum stake an entity has to have to pass the reputation system. (default: "1")
  --minUnstakeDelay <number>     Time paymaster has to wait to unlock the stake(seconds). (default: "0")
  --bundleSize <number>          Maximum number of pending mempool entities to start auto bundler. (default: "10")
  --maxBundleGas <number>        Max gas the bundler will use in transactions. (default: "5000000")
  --auto                         Automatic bundling. (default: false)
  --autoBundleInterval <number>  Auto bundler interval in (ms). (default: "12000")
  --txMode <string>              Bundler transaction mode (base, searcher).
    (base mode): Sends bundles using eth_sendRawTransaction RPC(does not protect against front running).
    (searcher mode): Sends bundles  using Flashbots Auction to protect the transaction against front running (only available on Mainnet) (default: "base")
  --metrics                      Bundler node metrics tracking enabled. (default: false)
  --influxdbUrl <string>         Url influxdb is running on (requires --metrics to be enabled). (default: "http://localhost:8086")
  --influxdbOrg <string>         Influxdb org (requires --metrics to be enabled). (default: "transeptor-labs")
  --influxdbBucket <string>      Influxdb bucket (requires --metrics to be enabled). (default: "transeptor_metrics")
  --p2p                          p2p mode enabled (default: false)
  --findPeers                    Search for peers when p2p is enabled. (default: false)
  -h, --help                     display help for command
```

### Environment variables

List of all environment variables supported by the node.

```bash
# Required for production
TRANSEPTOR_ENTRYPOINT_ADDRESS=0x
TRANSEPTOR_BENEFICIARY=<address_to_receive_funds>
TRANSEPTOR_MNEMONIC=<your-mnemonic>

# Optional
TRANSEPTOR_INFLUX_TOKEN=DEV_TOKEN
TRANSEPTOR_WHITE_LIST=<address_to_whitelist_SEPARATED_BY_COMMA>
TRANSEPTOR_BLACK_LIST=<address_to_blacklist_SEPARATED_BY_COMMA>
```

## Contribute

We welcome contributions to enhance our ERC-4337 Bundler. If you would like to contribute, please follow these guidelines [here](https://github.com/transeptorlabs/transeptor-bundler/blob/main/CONTRIBUTING.md).

## Contact Us

If you have any questions or feedback about Transeptor, please contact us.

- **Twitter**: [@transeptorlabs](https://twitter.com/transeptorlabs)
- **Telegram**: [Telegram channel](https://t.me/+eUGda3KIND4zMjRh)

## License

Licensed under the [GPL-3.0 License](https://github.com/transeptorlabs/transeptor-bundler/blob/main/LICENSE).

## Acknowledgements

We are grateful to the open-source community and the countless developers who have shared their knowledge and resources, enabling us to build upon their work:

- [Infinitism](https://github.com/eth-infinitism/bundler) - for inspiring our project and serving as a reference for implementation techniques.
