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
Options:
  -V, --version                  output the version number
  --network <string>             ETH execution client url. (default: "http://localhost:8545")
  --p2p                          p2p mode enabled (default: false)
  --findPeers                    Search for peers when p2p enabled. (default: false)
  --port <number>                Bundler-relayer node listening port. (default: "4338")
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
