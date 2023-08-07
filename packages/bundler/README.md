# @transeptor-bundler

![Node Version](https://img.shields.io/badge/node-18.x-green)
![TS](https://badgen.net/badge/-/TypeScript?icon=typescript&label&labelColor=blue&color=555555)
![Github workflow build status(main)](https://img.shields.io/github/actions/workflow/status/transeptorlabs/transeptor-bundler/build.yml?branch=main)

## Installation
```bash
npm install
```

## Development
Everything you need to get started developing with the Bundler.

#### Run local ETH Node
`npm run eth-node`

#### Deploy ERC-4337 contracts and fund bundler signer account
Run `npm run bundler-prep` to set up the bundler for development. This will:
- deploy the entry point contract to the local eth node.
- deploy simple account factory contract to the local eth node. 
- Fund the bundler signer account with ETH.

#### Start Bundler node 
1. Ensure that ETH node is running, ERC-4337 contracts are deployed and bundler signer account is funded.
2. Copy values in `.env.sample` into `.env` and fill in the values with your own.
3. Pick a mode to run the bundler in; see table below for details.

|   Mode  |    Script   | Validation | Bundle strategy |
|:-------:|:-----------:|------------|:---------------:|
| address | `string`    |            |                 |
| balance | `BigNumber` |            |                 |


The bundler will start on `http://localhost:3000/rpc`

#### Start Bundler node p2p
1. Ensure that ETH node is running, ERC-4337 contracts are deployed and bundler signer account is funded.
2. Start the bundler node in p2p mode.
3. 


## Features
- **Full Validation** - Uses geth `debug_traceCall` method to enforce the full spec storage access rules and opcode banning.
- **Partial Validation** - Standard call to entry Point Contract `simulateValidation()`. No storage access rules and opcode banning. 
  
## Test
`npm run test`

## Lint
- `npm run lint`
- `npm run lint:fix`