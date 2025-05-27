# Running with an up and running Ethereum node and bundler
Assuming you already have an `Ethereum node` running, `EntryPoint` deployed and your `bundler` running and ready for requests, you can run the against [bundler-spec-tests](https://github.com/eth-infinitism/bundler-spec-tests) repo with:

Run full ERC-4337 bundler Compatibility Test Suite:
```shell script
pdm run test --log-rpc -vvv --url http://localhost:4337/rpc  --entry-point <entryPointAddress> --ethereum-node http://localhost:8545 
```

### Test individual spec test

To test it, run: 
```shell script
pdm run test -k <name_of_test> --log-rpc -vvv --url http://localhost:4337/rpc  --entry-point <entryPointAddress> --ethereum-node http://localhost:8545 
```

## Run reputation rules tests
```shell script
pdm run test -k test_mempool_reputation_rules_all_entities --log-rpc -vvv --url http://localhost:4337/rpc  --entry-point <entryPointAddress> --ethereum-node http://localhost:8545 
```