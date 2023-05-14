<p align="center"><a href="https://transeptor.io/docs/category/bundler"><img width="500" title="Transeptor" src='https://transeptor.io/img/brand/transeptor.png' /></a></p>

![Node Version](https://img.shields.io/badge/node-18.x-green)

This is the core repository for Transeptor, a simple modular Typescript implementation of an ERC-4337 Bundler developed by Transeptor Labs.

We provide you with a smooth, developer-friendly experience. Our modular approach ensures flexibility and extensibility, allowing you to tailor the bundler to your specific needs.

- See our roadmap [here](https://hackmd.io/@V00D00-child/SyXKL6Kmn#Project-StatusRoadmap-)

> :warning: **This repository is currently under active development.**

## Contributing
We welcome contributions to enhance the functionality, usability, and performance of the ERC-4337 Bundler project. If you would like to contribute, please follow these guidelines [here](https://github.com/transeptorlabs/transeptor-bundler/blob/main/CONTRIBUTING.md)

  
## Running Bundler Locally
Storage access rules and opcode banning are two mechanisms implemented in Ethereum clients to enforce security and prevent certain malicious or unsafe behaviors on the network. The Bundler has multiple configrations to ensure it can implement the full spec storage access rules and opcode banning. Specifically, the Bundler will need to use `debug_traceCall` method to enforce the full spec storage access rules and opcode banning.

- **debug_traceCall**: This method traces the execution of a specific function call within a contract. It allows you to observe the execution of a specific function in isolation, without executing the entire transaction. It provides insights into the internal execution of the function, the changes to the contract's state, and the resulting return values.

Alternivley, if a node does NOT support `debug_traceCall` a hack of mine the transaction, and then `debug_traceTransaction` can be used to enforce the full spec storage access rules and opcode banning.

- **debug_traceTransaction**: This method traces the execution of a specific transaction from start to finish. It provides a detailed log of the execution steps, including the initial transaction call, any internal calls made within the transaction, and the final state changes caused by the transaction's execution.


### GETH client
**Follow the set below to run Bundler server using a GETH client**

GETH node supports `debug_traceCall` with javascript "tracer"

1. Install dependencies `npm install`
2. Add and configuration files `bundler.config.json` and `.env`
3. Start local GETH client `npm run geth:start` (will start at http://localhost:8545/)
4. Deploy entry point contract and fund the bundler signer account `npm run deploy:local`
5. Start up Bundler server `npm start`

Use `npm run geth:stop` to stop GETH client

**note: if GETH is terminated, the `npm run deploy:local` script will need to be run again to re-deploy entry point contract and re-fund the bundler signer account.

### Ethereum goerli test network(Alchemy) 
Alchemy nodes support both `debug_traceCall` and `debug_traceTransaction` API, the Bundler with use the former.
1. Need to sign up for an Alchemy account
2. Update `.env` value `ALCHEMY_API_KEY=<your-api-key>`
3. Add your url `https://eth-goerli.g.alchemy.com/v2` to network in `bundler.config.json`
4. Start up Bundler `npm start`


## ERC-4337 Entrypoint contract
This Bundler uses [Infinitism](https://github.com/eth-infinitism/account-abstraction) `@account-abstraction/contracts`(version 0.6.0) entry point contract for local development. The `npm fetch:abi` script fetched abi for the contract and saves it locally at `./abi/entrypoint.js`.

## Test
`npm run test`

## License

By contributing to this repository, you agree that your contributions will be licensed under the GPL-3.0 License. Please see the [`LICENSE`](https://github.com/transeptorlabs/transeptor-bundler/blob/main/LICENSE)file for more details.

We appreciate your contributions and thank you for helping make the ERC-4337 Bundler project even better!

## Acknowledgements

We would like to express our gratitude to the following individuals and organizations for their contributions and support in making this project possible:

- [Infinitism]([link_to_repository](https://github.com/eth-infinitism/bundler)) - for inspiring our project and serving as a reference for implementation techniques.

We are grateful to the open-source community and the countless developers who have shared their knowledge and resources, enabling us to build upon their work.

If we have inadvertently missed acknowledging anyone who has made a significant contribution, please accept our sincere apologies, and kindly bring it to our attention so that we can rectify it.

Thank you all for your support!

## Contact

If you have any questions, suggestions, or feedback regarding the ERC-4337 Bundler project, please feel free to reach out to us. We would be more than happy to assist you or hear your thoughts.

You can contact us through the following channels:

- **Twitter**: [@transeptorlabs](https://twitter.com/transeptorlabs)
- **Telgram**: [Telegram channel](https://t.me/+eUGda3KIND4zMjRh)

We also encourage you to join our community on Discord, where you can engage in discussions, ask questions, and interact with other contributors and users of the ERC-4337 Bundler project.

Your feedback and involvement are highly valued and play a crucial role in the project's growth and success. We look forward to hearing from you!