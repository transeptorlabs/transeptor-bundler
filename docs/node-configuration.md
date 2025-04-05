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
