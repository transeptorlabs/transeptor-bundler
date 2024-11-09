---
sidebar_position: 1
description: 5 minutes to learn the most important Transeptor concepts.

title: Get Started
---

## Overview

:::important Transeptor is in Alpha
Please note that while the software is fully functional, it is important to be aware that it may contain bugs, incomplete features, and undergo frequent updates.

We invite you to actively participate in the development of this software. Visit our [GitHub repository](https://github.com/transeptorlabs/transeptor-bundler/issues) to get involved.
:::

Transeptor is a light weight blazing fast, modular ERC-4337 TypeScript bundler built with declarative functional programming. It offers a wide range of bundling mode to fit your needs.

1. **Mempool support**: Determines the visibility of the UserOperations.
2. **EVM network**: The networks that the Bundler supports.
3. **Block building strategy**: The strategy used by the Bundler to send bundled UseOperations.
4. **Front-running protection**: Does the strategy to send bundles protect the UseOperations from front-running.
5. **Execution client support**: The EVM clients that the Bundler runs `debug_traceCall` with javascript "tracer" against to enforce full spec storage access rules and opcode banning.
6. **Native tracer support**: Does the Bundler support native tracer. Native tracer are more efficient than javascript tracer.

| Mode   | Mempool support | EVM Networks                                         | Block building strategy                                                                                                               | Front-running protection | Execution client support                               | Native tracer support |
|---------------|-----------------|------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------|--------------------------|--------------------------------------------------------|-----------------------|
| **base        | Private mempool | All EVM clients                                      | Uses eth_sendRawTransaction RPC                                                                                                       | no                       | [geth](https://geth.ethereum.org/docs/getting-started) | no                    |
| **searcher    | private mempool | Ethereum and Goerli                                  | Uses [Flashbots](https://docs.flashbots.net/flashbots-auction/searchers/quick-start) to send bundled UserOperations to block builders | yes                      | [geth](https://geth.ethereum.org/docs/getting-started) | no                    |
| **conditional | private mempool | L2 EVM clients that support conditional transactions | Uses [eth_sendRawTransactionConditional](https://notes.ethereum.org/@yoav/SkaX2lS9j) RPC                                              | yes                      | [geth](https://geth.ethereum.org/docs/getting-started) | no                    |

**active development

## Quick Start

Transeptor is easy to set up and use, with a simple Docker-based deployment process that requires minimal configuration. Please ensure that your system meets these recommendated requirements.

Follow the steps below to get started with Transeptor:

### Pull Transeptor Docker image

- `transeptorlabs/bundler:latest` is the latest development version.
- `transeptorlabs/bundler:{version}` is the stable version at a specific version number
```bash
docker pull transeptorlabs/bundler:latest
```

### Set environment variables

The bundler node requires a set of environment variables to run. Create a `.env` file in the root directory of your project and add the following variables:
```bash
# Required
TRANSEPTOR_ENTRYPOINT_ADDRESS=0x0000000071727De22E5E9d8BAf0edAc6f37da032
TRANSEPTOR_BENEFICIARY=<address_to_receive_funds>
TRANSEPTOR_MNEMONIC=<your-mnemonic>

# Optional
TRANSEPTOR_INFLUX_TOKEN=DEV_TOKEN
TRANSEPTOR_WHITE_LIST=<address_to_whitelist_SEPARATED_BY_COMMA>
TRANSEPTOR_BLACK_LIST=<address_to_blacklist_SEPARATED_BY_COMMA>
```

### Start up Geth

Running Transeptor bundler requires a running a fully synced Geth node to enforce full spec storage access rules and opcode banning. You can refer to the official [geth node](https://geth.ethereum.org/docs/getting-started/installing-geth#docker-container) documentation to start a geth node.

```bash
docker run -d --name geth -p 8545:8545 ethereum/client-go:v1.14.5 \
    --dev \
    --nodiscover \
    --http \
    --dev.gaslimit  12000000 \
    --http.api eth,net,web3,debug \
    --http.corsdomain '*://localhost:*' \
    --http.vhosts '*,localhost,host.docker.internal' \
    --http.addr 0.0.0.0 \
    --networkid  1337 \
    --verbosity 2 \
    --maxpeers 0 \
    --allow-insecure-unlock \
    --rpc.allow-unprotected-tx
```

### Start the Transeptor bundler

With the Geth node running, you can now start the Transeptor bundler. You can pass the `.env` file as an environment variable.

- Ensure signer account is funded with ETH before starting bundler.

```bash
docker run -d --name transeptor -p 4337:4337 --env-file .env transeptorlabs/bundler:latest \
    --httpApi web3,eth,debug \
    --txMode base \
    --port 4337 \
    --network http://host.docker.internal:8545 \
    --auto 
```

## Command line arguments

List of all command line arguments supported by the bundler.
```bash
docker run -p 4337:4337 --env-file .env transeptorlabs/bundler:latest --help
```

```bash
Options:
  -V, --version                  output the version number
  --httpApi <string>             ERC4337 rpc method name spaces to enable. (default: "web3,eth")
  --network <string>             ETH execution client url. (default: "http://localhost:8545")
  --p2p                          p2p mode enabled (default: false)
  --findPeers                    Search for peers when p2p enabled. (default: false)
  --port <number>                Bundler node listening port. (default: "4337")
  --numberOfSigners <number>     Number of signers HD paths to use from mnmonic (default: "3")
  --minBalance <string>          Maximum ETH balance need for signer address. (default: "1")
  --minStake <string>            Minimum stake a entity has to have to pass reputation system. (default: "1")
  --minUnstakeDelay <number>     Time paymaster has to wait to unlock the stake(seconds). (default: "0")
  --bundleSize <number>          Maximum number of pending mempool entities to start auto bundler. (default: "10")
  --maxBundleGas <number>        Max gas the bundler will use in transactions. (default: "5000000")
  --auto                         Automatic bundling. (default: false)
  --autoBundleInterval <number>  Auto bundler interval in (ms). (default: "12000")
  --txMode <string>              Bundler transaction mode (base, conditional, searcher). (default: "base")
  --unsafe                       Enable no storage or opcode checks during userOp simulation.
  --metrics                      Bundler node metrics tracking enabled. (default: false)
  --influxdbUrl <string>         Url influxdb is running on (requires --metrics to be enabled). (default: "http://localhost:8086")
  --influxdbOrg <string>         Influxdb org (requires --metrics to be enabled). (default: "transeptor-labs")
  --influxdbBucket <string>      Influxdb bucket (requires --metrics to be enabled). (default: "transeptor_metrics")
  -h, --help                     display help for command
```

## Contact us

Have questions or need help? Here are a few ways to get in touch:

1. Open an issue of Transeptor [Github](https://github.com/transeptorlabs/transeptor-bundler)
2. Send us a message on [Telegram](https://t.me/+eUGda3KIND4zMjRh)
