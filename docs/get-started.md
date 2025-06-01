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

Transeptor is easy to set up with Docker and requires minimal configuration. For this guide, we will walk through running Transeptor with a geth with ERC-7562 tracer in `searcher mode` on the Sepolia testnet. See more on the modes that Transeptor supports [here](/docs/running-transeptor#modes).

- Entrypoint contract v0.8: 
  - [Sepolia testnet](https://sepolia.etherscan.io/address/0x4337084d9e255ff0702461cf8895ce9e3b5ff108)
  - [Ethereum mainnet](https://etherscan.io/address/0x4337084d9e255ff0702461cf8895ce9e3b5ff108)
- [accountabstraction/geth-with-erc7562-tracer](https://hub.docker.com/r/accountabstraction/geth-with-erc7562-tracer) Docker image
- [transeptorlabs/bundler](https://hub.docker.com/r/transeptorlabs/bundler) Docker image

Follow the steps below to get started with Transeptor:


### Start up geth with ERC-7562 tracer

Pull the [ERC-7562](https://eips.ethereum.org/EIPS/eip-7562) image from Docker Hub and start the container. The native tracer is required for full validation during userOp simulation to enforce [ERC-7562: Account Abstraction Validation Rules](https://eips.ethereum.org/EIPS/eip-7562).

```shell
docker run -d --name geth-native-tracer -p 8545:8545 accountabstraction/geth-with-erc7562-tracer \
    --verbosity 1 \
    --http.vhosts '*,localhost,host.docker.internal' \
    --http \
    --http.port 8545 \
    --http.api eth,net,web3,debug \
    --http.corsdomain '*' \
    --http.addr "0.0.0.0" \
    --networkid 1337 \
    --dev \
    --dev.period 0 \
    --allow-insecure-unlock \
    --rpc.allow-unprotected-txs \
    --dev.gaslimit 20000000
```

### Pull Transeptor Docker image

```bash
docker pull transeptorlabs/bundler:latest
```

### Set environment variables

Transeptor requires a set of environment variables to run. Create a `.env` file and add the following variables:
```bash
# Required
TRANSEPTOR_ENTRYPOINT_ADDRESS=0x0000000071727De22E5E9d8BAf0edAc6f37da032
TRANSEPTOR_BENEFICIARY=<address_to_receive_funds>
TRANSEPTOR_MNEMONIC=<your-mnemonic>

# Optional
TRANSEPTOR_WHITE_LIST=<address_to_allow_SEPARATED_BY_COMMA>
TRANSEPTOR_BLACK_LIST=<address_to_ban_SEPARATED_BY_COMMA>
```

### Start Transeptor

With the Geth native tracer node running, you can now start Transeptor. You can pass the path to your `.env` file to the Docker container.

- Ensure the signer account is funded with ETH with the desired `minBalance` before starting Bundler.

```bash
docker run -d --name transeptor -p 4337:4337 --env-file <path_to_your_.env> transeptorlabs/bundler:latest \
  --httpApi web3,eth,debug \
  --txMode searcher \
  --port 4337 \
  --minBalance 0.01 \
  --network http://host.docker.internal:8545 \
  --auto
```

Transeptor will start on `http://localhost:4437/rpc`. Run curl command to check if the Transeptor is running:

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="curl" label="Curl" default>
    ```bash
    curl -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"web3_clientVersion","params":[],"id":67}' http://localhost:4337/rpc
    ```
  </TabItem>
  <TabItem value="result" label="Result">
    ```json
    {"jsonrpc":"2.0","id":67,"result":"transeptor/0.12.0-alpha.0"}
    ```
  </TabItem>
</Tabs>

You are now ready to start bundling userOp on the Sepolia testnet with Transeptor.

## Contact us

Have questions or need help? Here are a few ways to get in touch:

1. Open an issue of Transeptor [Github](https://github.com/transeptorlabs/transeptor-bundler)
2. Send us a message on [Telegram](https://t.me/+eUGda3KIND4zMjRh)
