# Features

> See our road-map [here](https://hackmd.io/@V00D00-child/SyXKL6Kmn#Project-StatusRoadmap-)

- **Full Validation** - Full spec storage access rules and opcode banning. Requires a connection to a geth node that supports `debug_traceCall` method.
- **Partial Validation** - No storage access rules and opcode banning. Use `--unsafe` flag to enable.
- **Metrics** - Metrics gives insight into the bundler node to allow for performance tuning and debugging. Transeptor bundler can be be configure to store metrics using a push(InfluxDB) and pull(Prometheus) metrics system. Grafana is used to visualize all the metrics. Use `--metrics` flag to enable.
- **Entity Reputation System** - When staked(i.e with entrypoint contract), an entity is also allowed to use its own associated storage, in addition to senders associated storage as ETH. Node can be pre-configured to blacklist and whitelist entities on startup.
- **Entrypoint contract** - Supports Entrypoint contract [releases/v0.7](https://github.com/eth-infinitism/account-abstraction/tree/releases/v0.7)
- **Muti-node configuration** - Transeptor bundler is degined to work in a multi-node configuration. The `relayer` node is a light weight node that relays validated userOp to a `bundle-builder` node. While the `bundle-builder node` is light weight node the receives validated userOps(ie. from the relayer of p2p mempool) and builds and send bundles.
- **p2p mempol** - Coming soon.