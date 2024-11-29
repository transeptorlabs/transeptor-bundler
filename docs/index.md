---
sidebar_position: 2
description: Quick start guide to get you up and running with Transeptor.

title: Get Started
---

## Overview

:::important Transeptor is in Alpha
Please note that while the software is fully functional, it is important to know that it may contain bugs and incomplete features and undergo frequent updates.

We invite you to actively participate in the development of this software. Visit our [GitHub repository](https://github.com/transeptorlabs/transeptor-bundler/issues) to get involved.
:::

Transeptor is a lightweight, blazing-fast, modular ERC-4337 TypeScript bundler built with functional programming. It offers a wide range of bundling modes to fit your needs. 


## Quick Start

Transeptor is easy to set up with Docker requires minimal configuration. For this guide we will walk through running Transeptor with a geth native tacer in `searcher mode` on the Sepolia testnet. See more on modes that Transeptor supports [here](/docs/running-transeptor#modes).

- Entrypoint contract: [sepolia.etherscan](https://sepolia.etherscan.io/address/0x0000000071727De22E5E9d8BAf0edAc6f37da032)
- [accountabstraction/geth-native-tracer](https://hub.docker.com/r/accountabstraction/geth-native-tracer) Docker image
- [transeptorlabs/bundler](https://hub.docker.com/r/transeptorlabs/bundler) Docker imager

Follow the steps below to get started with Transeptor:


### Get your network provider URL

You can use public Ethereum networks like Infura to connect the bundler to the Ethereum network on the Sepolia testnet.

Sign up for an account on [Infura](https://infura.io/) or [Alchemy](https://www.alchemy.com/) to get your network provider URL.

An Infura network provider URL should look like this: `https://mainnet.infura.io/v3/<your-project-id>`. Ensaure the provider has [debug_traceCall](https://docs.metamask.io/services/reference/mantle/json-rpc-methods/debug/debug_tracecall/) enabled with support for `prestateTracer`.


### Pull Transeptor Docker image

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
TRANSEPTOR_WHITE_LIST=<address_to_allow_SEPARATED_BY_COMMA>
TRANSEPTOR_BLACK_LIST=<address_to_ban_SEPARATED_BY_COMMA>
```

### Start up geth native tracer node

Pull the native tracer image from Docker Hub and start the container. The native tracer is required for full validation during userOp simulation with prestateTracer native tracer on the network provider.

```bash
docker run -d --name geth-native-tracer -p 8545:8545 accountabstraction/geth-native-tracer \
  --verbosity 1 \
  --http.vhosts '*,localhost,host.docker.internal' \
  --http \
  --http.port 8888 \
  --http.api eth,net,web3,debug \
  --http.corsdomain '*' \
  --http.addr "0.0.0.0" \
  --networkid 11155111 \
  --dev \
  --dev.period 0 \
  --allow-insecure-unlock \
  --rpc.allow-unprotected-txs \
  --dev.gaslimit 20000000
```

### Start Transeptor

With the Geth node running, you can now start the Transeptor bundler. You can pass the `.env` file as an environment variable.

- Ensure the signer account is funded with ETH with the desired `minBalance` before starting Bundler.
- The bundler will use the first HD path from your mnemonic to sign transactions.

```bash
docker run -d --name transeptor -p 4337:4337 --env-file .env transeptorlabs/bundler:latest \
  --httpApi web3,eth,debug \
  --txMode searcher \
  --port 4337 \
  --minBalance yourDesiredBalanceInEth \
  --network https://mainnet.infura.io/v3/<your-project-id \
  --tracerRpcUrl http://localhost:8888 \
  --auto 
```

The Bundler node will start on `http://localhost:4437/rpc`

## Contact us

Have questions or need help? Here are a few ways to get in touch:

1. Open an issue of Transeptor [Github](https://github.com/transeptorlabs/transeptor-bundler)
2. Send us a message on [Telegram](https://t.me/+eUGda3KIND4zMjRh)
