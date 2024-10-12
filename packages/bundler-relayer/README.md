# Relayer

<p align="center">
  A light weight node that relays validated userOp to a bundle-builder node.
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
  -V, --version              output the version number
  --debug                    Enable ERC4337 debug rpc method name space (default: false)
  --network <string>         ETH execution client url. (default: "http://localhost:8545")
  --bundlerBuilder <string>  ERC-4337 bundler-builder client url. (default: "http://localhost:4338/rpc")
  --port <number>            Bundler-relayer node listening port. (default: "4337")
  --unsafe                   Enable no storage or opcode checks during userOp simulation.
  --metrics                  Bundler node metrics tracking enabled. (default: false)
  --influxdbUrl <string>     Url influxdb is running on (requires --metrics to be enabled). (default: "http://localhost:8086")
  --influxdbOrg <string>     Influxdb org (requires --metrics to be enabled). (default: "transeptor-labs")
  --influxdbBucket <string>  Influxdb bucket (requires --metrics to be enabled). (default: "transeptor_metrics")
  -h, --help                 display help for command
```

## Environment variables

List of all environment variables supported by the Relayer.

```bash
# Required for production
TRANSEPTOR_ENTRYPOINT_ADDRESS=0x
TRANSEPTOR_ALCHEMY_API_KEY=<your-alcemy-api-key>

# Optional
TRANSEPTOR_INFLUX_TOKEN=DEV_TOKEN
```
