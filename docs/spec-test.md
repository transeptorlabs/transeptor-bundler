# Running with an up and running Ethereum node and bundler
Assuming you already have an `Ethereum node` running, `EntryPoint` deployed and your `bundler` running and ready for requests, you can run the against [bundler-spec-tests](https://github.com/eth-infinitism/bundler-spec-tests) repo with:

Run full ERC-4337 bundler Compatibility Test Suite:
```shell script
pdm run test --log-rpc -vvv --url http://localhost:4337/rpc  --entry-point 0x5FbDB2315678afecb367f032d93F642f64180aa3 --ethereum-node http://localhost:8545 
```

### Test individual spec test

To test it, run: 
```shell script
pdm run test -k test_paymaster_on_account_failure --log-rpc -vvv --url http://localhost:4337/rpc  --entry-point 0x5FbDB2315678afecb367f032d93F642f64180aa3 --ethereum-node http://localhost:8545 
```

## Run reputation rules tests
```shell script
pdm run test -k test_mempool_reputation_rules_all_entities --log-rpc -vvv --url http://localhost:4337/rpc  --entry-point 0x5FbDB2315678afecb367f032d93F642f64180aa3 --ethereum-node http://localhost:8545 
```