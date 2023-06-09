<p align="center"><a href="https://transeptorlabs.io/docs/category/bundler"><img width="500" title="Transeptor" src='https://transeptorlabs.io/img/brand/transeptor.png' /></a></p>

![Node Version](https://img.shields.io/badge/node-18.x-green)
![Github workflow build status(main)](https://img.shields.io/github/actions/workflow/status/transeptorlabs/transeptor-bundler/build.yml?branch=main)

A modular Typescript ERC-4337 Open Source Bundler, designed with a strong emphasis on performance.

- See our road-map [here](https://hackmd.io/@V00D00-child/SyXKL6Kmn#Project-StatusRoadmap-)

> :warning: **This repository is currently under active development.**

## UserOperation Validation
Storage access rules and opcode banning are two mechanisms implemented in Ethereum clients to enforce security and prevent certain malicious or unsafe behaviors on the network. The Bundler has many configurations to ensure it can handle storage access rules and opcode banning.

### Full Validation(storage access rules and opcode banning)
Uses geth `debug_traceCall` method to enforce the full spec storage access rules and opcode banning. Supports `--txMode` mode include:
- base
- conditional
  
### Partial Validation(no storage access rules and opcode banning)
Standard call to entry Point Contract `simulateValidation()`. Run Bundler with `--unsafe` to enable partial validation. Supports `--txMode` mode include:
- base
- conditional
- searcher
  
## Running Bundler in base or conditional mode
Follow the steps below to requires the Bundler to run along side a GETH client:
1. Install dependencies `npm install`
2. Add environment variables to `.env`-  `MNEMONIC=<your_seed_phrase>` and `BENEFICIARY=<address_to_receive_funds>`
3. Start local GETH client `npm run geth:start` (will start at http://localhost:8545/)
4. Deploy entry point contract and fund the bundler signer account `npm run deploy:local`
5. Start up Bundler server `npm run start:base`
6. Bundler will start up in `base` mode with full validation

Use `npm run geth:stop` to stop GETH client

**note: if GETH is terminated, the `npm run deploy:local` script will need to be run again to re-deploy entry point contract and re-fund the bundler signer account.

## Running Bundler in searcher mode 
Follow the steps below to run Bundler server using a remote Alchemy ETH client
1. Need to sign up for an [Alchemy account](https://auth.alchemy.com/signup)
2. Add environment variables to `.env` - `ALCHEMY_API_KEY=<your-api-key>`, `MNEMONIC=<your_seed_phrase_for_bundler_signer_account>` and `BENEFICIARY=<address_to_receive_funds>`
3. Start up Bundler in searcher mode `npm run start:searcher`
4. Bundler will start up in `searcher` mode

## Test
`npm run test`

## Lint
- `npm run lint`
- `npm run lint:fix`

## ERC-4337 contracts
This Bundler uses [Infinitism](https://github.com/eth-infinitism/account-abstraction) `@account-abstraction/contracts`(version 0.6.0) entry point contract for development. The `npm fetch:abi` script fetches abi for the contract and saves it locally at `./abi/entrypoint.js`.

### Entrypoint
Deterministic address: 0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789

- [Mainnet](https://etherscan.io/address/0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789#code)
- [Goerli](https://goerli.etherscan.io/address/0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789#code)
- [Linea Goerli](https://explorer.goerli.linea.build/address/0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789)

### Simple Account Factory
Deterministic address: 0x9406cc6185a346906296840746125a0e44976454

- [Mainnet](https://etherscan.io/address/0x9406cc6185a346906296840746125a0e44976454#code)
- [Goerli](https://goerli.etherscan.io/address/0x9406cc6185a346906296840746125a0e44976454#code)
- [Linea Goerli](https://explorer.goerli.linea.build/address/0x9406cc6185a346906296840746125a0e44976454)
  
## Contributing
We welcome contributions to enhance our ERC-4337 Bundler. If you would like to contribute, please follow these guidelines [here](https://github.com/transeptorlabs/transeptor-bundler/blob/main/CONTRIBUTING.md).

## Acknowledgements
We would like to express our gratitude to the following individuals and organizations for their contributions and support in making this project possible:

- [Infinitism](https://github.com/eth-infinitism/bundler) - for inspiring our project and serving as a reference for implementation techniques.

We are grateful to the open-source community and the countless developers who have shared their knowledge and resources, enabling us to build upon their work.

Thank you all for your support!

## Contact
If you have any questions, or feedback about the ERC-4337 Bundler project, please feel free to reach out to us.

- **Twitter**: [@transeptorlabs](https://twitter.com/transeptorlabs)
- **Telegram**: [Telegram channel](https://t.me/+eUGda3KIND4zMjRh)

We value and appreciate your feedback and involvement, as it plays a crucial role in the growth and success of the project. We look forward to hearing from you!

## License
Licensed under the GPL-3.0 License. Please see the [`LICENSE`](https://github.com/transeptorlabs/transeptor-bundler/blob/main/LICENSE)file for more details.