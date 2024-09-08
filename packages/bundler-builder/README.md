# Bundler Builder

<p align="center">
    A light weight node the receives validated userOps, builds and sends bundles.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-20.11.1-green" alt="Node Version">
  <img src="https://badgen.net/badge/-/TypeScript?icon=typescript&label&labelColor=blue&color=555555" alt="TypeScript">
    <img src="https://github.com/transeptorlabs/transeptor-bundler/actions/workflows/main.yml/badge.svg?branch=main">
  <img src="https://img.shields.io/badge/ESM-supported-brightgreen" alt="ESM Supported">
  <img src="https://img.shields.io/docker/pulls/transeptorlabs/bundler" alt="Docker pulls">
</p>

# Node Configuration

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
