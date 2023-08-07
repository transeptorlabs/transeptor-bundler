# @transeptor/tools

![Node Version](https://img.shields.io/badge/node-18.x-green)
![Github workflow build status(main)](https://img.shields.io/github/actions/workflow/status/transeptorlabs/transeptor-bundler/build.yml?branch=main)


## Installation
```bash
npm install
```

## Run ETH Node
`npm run geth:start`

## Stop ETH Node
`npm run geth:stop`

## Bundler Development
Run `npm run bundler-startup` to set up the bundler for development. This will:
- deploy the entry point contract to the local eth node.
- deploy simple account factory contract to the local eth node. 
- Fund the bundler signer account with ETH 

## ERC-4337 contracts
This Bundler uses [Infinitism](https://github.com/eth-infinitism/account-abstraction) `@account-abstraction/contracts`(version 0.6.0) entry point contract for development. The `npm fetch:abi` script fetches abi for the contract and saves it locally at `./abi/entrypoint.js`.

### Entrypoint
Deterministic address: 0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789

- [Mainnet](https://etherscan.io/address/0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789#code)
- [Goerli](https://goerli.etherscan.io/address/0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789#code)
- [Linea Goerli](https://explorer.goerli.linea.build/address/0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789)
- local: `npm run deploy:ep`

### Simple Account Factory
Deterministic address: 0x9406cc6185a346906296840746125a0e44976454

- [Mainnet](https://etherscan.io/address/0x9406cc6185a346906296840746125a0e44976454#code)
- [Goerli](https://goerli.etherscan.io/address/0x9406cc6185a346906296840746125a0e44976454#code)
- [Linea Goerli](https://explorer.goerli.linea.build/address/0x9406cc6185a346906296840746125a0e44976454)
- local: `npm run deploy:scf`

