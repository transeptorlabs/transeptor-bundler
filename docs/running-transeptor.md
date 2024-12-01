---
sidebar_position: 3
description: Running Transeptor

title: Running Transeptor
---

# Running Transeptor

## Features

- **Metrics** - Transeptor bundler can be configured to store metrics using a push(InfluxDB) and pull(Prometheus) metrics system. Grafana is used to visualize all the metrics. Use `--metrics` flag to enable.
- **Entity Reputation System** - When staked(i.e., with an entrypoint contract), an entity can also use its own associated storage and senders' associated storage as ETH. Transeptor can be pre-configured to blocklist and allowlist entities on startup.
- **Native Tracer** - Supports native tracer to enforce ERC-7562: Account Abstraction Validation Scope Rules. [accountabstraction/geth-native-tracer](https://hub.docker.com/r/accountabstraction/geth-native-tracer) node.
- **Entrypoint contract** - Supports Entrypoint contract [releases/v0.7](https://github.com/eth-infinitism/account-abstraction/tree/releases/v0.7).
- **p2p mempool** - Coming soon.


To run Transeptor with [ERC-7562: Account Abstraction Validation Rules](https://eips.ethereum.org/EIPS/eip-7562), a fully synced geth node or a native tracer node must be running alongside the bundler. Both options require the node to be enabled with `debug_traceCall`.

> A native tracer node does not need to be fully synced. To reduce infrastructure overhead, we recommend running Transpetor with a native tracer node.

## Modes

> It is recommended not to run Transpetor with `--unsafe` in production. This flag is disabled by default and is only intended for experimental and development purposes. Running Transeptor with `--unsafe` will disable all storage access rules, opcode banning, and code rule validation.


| Feature                                | Base (No Native Tracer)                                        | Base (Native Tracer)                                                                                    | Searcher (No Native Tracer)                                                                                       | Searcher (Native Tracer)                                                                                          |
| -------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Mempool Support                        | Private mempool                                                | Private mempool                                                                                         | Private mempool                                                                                                   | Private mempool                                                                                                   |
| EVM Networks                           | All EVM clients                                                | All EVM clients                                                                                         | Ethereum and Sepolia                                                                                              | Ethereum and Sepolia                                                                                              |
| Bundle Sending Strategy                | Uses `eth_sendRawTransaction` RPC                              | Uses `eth_sendRawTransaction` RPC                                                                       | Uses [Flashbots](https://docs.flashbots.net/flashbots-auction/searchers/quick-start) `eth_sendPrivateTransaction` | Uses [Flashbots](https://docs.flashbots.net/flashbots-auction/searchers/quick-start) `eth_sendPrivateTransaction` |
| Ethereum Network Provider              | fully synced [geth](https://geth.ethereum.org/docs/getting-started) node         | Node services like Infura, Alchemy, etc                                                                 | fully synced [geth](https://geth.ethereum.org/docs/getting-started) node                                                            | Node services like Infura, Alchemy, etc                                                                           |
| Ethereum Network Provider Requirements | Must support `debug_traceCall` with standard javascript tracer | Must support `debug_traceCall` with `prestateTracer`                                                      | Must support `debug_traceCall` with standard javascript tracer                                                    | Must support `debug_traceCall` with `prestateTracer`                                                                |
| Native Tracer Provider                 | No                                                            | [accountabstraction/geth-native-tracer](https://hub.docker.com/r/accountabstraction/geth-native-tracer) node | No                                                                                                                | [accountabstraction/geth-native-tracer](https://hub.docker.com/r/accountabstraction/geth-native-tracer) node           |
| Native Tracer Provider Requirements    | No                                                            | Must support `debug_traceCall` with tracer name: `bundlerCollectorTracer` | No                                                                                                               | Tracer name: `bundlerCollectorTracer` |


## Command line arguments

List of all command line arguments supported by the Transeptor.

```bash
docker run -p 4337:4337 --env-file .env transeptorlabs/bundler:latest --help
```

```bash
Options:
  -V, --version                  output the version number
  --unsafe                       UNSAFE mode: Enable no storage or opcode checks during userOp simulation. SAFE mode(default).
  --tracerRpcUrl <string>        Enables native tracer for full validation during userOp simulation with prestateTracer native tracer on the network provider. requires unsafe=false.
  --network <string>             Ethereum network provider. (default: "http://localhost:8545")
  --httpApi <string>             ERC4337 rpc method namespaces to enable. (default: "web3,eth")
  --port <number>                Bundler node listening port. (default: "4337")
  --numberOfSigners <number>     Number of signers HD paths to use from mnemonic (default: "3")
  --minBalance <string>          Maximum ETH balance needed for signer address. (default: "1")
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

## Environment variables

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
