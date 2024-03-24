# Running with an up and running Ethereum node and bundler
Assuming you already have an `Ethereum node` running, `EntryPoint` deployed and your `bundler` running and ready for requests, you can run the test suite with:

```shell script
pdm run pytest -rA -W ignore::DeprecationWarning --url http://localhost:4337/rpc  --entry-point 0x5FbDB2315678afecb367f032d93F642f64180aa3 --ethereum-node http://localhost:8545 
```