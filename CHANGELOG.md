# Changelog

All notable changes to this project will be manually documented in this file by the project maintainers.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - xxx-xx-xx

### Added
- A docs for Release process and Vision([#109](https://github.com/transeptorlabs/transeptor-bundler/pull/104))
- Use [esbuild](https://esbuild.github.io/) to create build for transeptor([#117](https://github.com/transeptorlabs/transeptor-bundler/pull/110))
- Add typedocs([#118](https://github.com/transeptorlabs/transeptor-bundler/pull/104))

### Changed
- Refactor modules to improve error handling with Either monad([#115](https://github.com/transeptorlabs/transeptor-bundler/pull/115)):
  - sim
  - validation
- Move all types under `../src/types`([#115](https://github.com/transeptorlabs/transeptor-bundler/pull/115))
- Configure test coverage report in `vitest.config.ts`([#115](https://github.com/transeptorlabs/transeptor-bundler/pull/115))
- Move all test to `./test` to separate test files from implementation. Moving forward, all test cases will be defined here.([#115](https://github.com/transeptorlabs/transeptor-bundler/pull/115))
- A `@vitest/coverage-istanbul:v3.0.5` to `devDependencies` to produce a test coverage report.([#115](https://github.com/transeptorlabs/transeptor-bundler/pull/115))
- Bump `devDependencies`([#115](https://github.com/transeptorlabs/transeptor-bundler/pull/115)):
  - `vite` from 5.3.1 to 5.4.12
  - `vitest` from 1.6.0 to 3.0.5
- Fix a few circular dependencies([#115](https://github.com/transeptorlabs/transeptor-bundler/pull/115))
- Drop `ts-node` and `nodemon` to use [tsx](https://tsx.is/) for local ts dev scripts([#118](https://github.com/transeptorlabs/transeptor-bundler/pull/118))

## [v0.9.0-alpha.0] - 2025-01-02

### Added
- Add Either monad type for better error handling([#104](https://github.com/transeptorlabs/transeptor-bundler/pull/104))
  
### Changed
- Refactor modules to use Either monad:
  - validation([#104](https://github.com/transeptorlabs/transeptor-bundler/pull/104))
  - sim([#104](https://github.com/transeptorlabs/transeptor-bundler/pull/104))
  - rpc([#104](https://github.com/transeptorlabs/transeptor-bundler/pull/104))
  - event([#104](https://github.com/transeptorlabs/transeptor-bundler/pull/104))
- bump nanoid from 3.3.7 to 3.3.8 ([#103](https://github.com/transeptorlabs/transeptor-bundler/pull/103))
- bump express from 4.18.3 to 4.21.2 ([#106](https://github.com/transeptorlabs/transeptor-bundler/pull/106))

## [v0.8.0-alpha.0] - 2024-12-02

### Added

- Support native tracer([#93](https://github.com/transeptorlabs/transeptor-bundler/pull/93))
- Send bundles with Flashbots ([#94](https://github.com/transeptorlabs/transeptor-bundler/pull/94))
- Introduce change log ([#96](https://github.com/transeptorlabs/transeptor-bundler/pull/96))
- Add `debug_bundler_setConfiguration` rpc ([#96](https://github.com/transeptorlabs/transeptor-bundler/pull/96))

### Fixed

- Fix the bug that was causing the pre-verification gas calculation to be too low. ([#92](https://github.com/transeptorlabs/transeptor-bundler/pull/92))

### Changed

- Upgrade to ethers.js [v6.13.4](https://github.com/ethers-io/ethers.js/releases/tag/v6.13.4) ([#94](https://github.com/transeptorlabs/transeptor-bundler/pull/94))
- Update Security Policy ([#96](https://github.com/transeptorlabs/transeptor-bundler/pull/96))
- Move pre-verification calculator to gas module ([#96](https://github.com/transeptorlabs/transeptor-bundler/pull/96))
- Update send userOp script to allow running on testnet. ([#98](https://github.com/transeptorlabs/transeptor-bundler/pull/98))

## [v0.7.0-alpha.0] - 2024-11-03

### Added

- Enforces a set of [ERC-7562: Account Abstraction Validation Scope Rules](https://eips.ethereum.org/EIPS/eip-7562)
  - Add paymaster deposit manager to enforce EREP-010 ([#82](https://github.com/transeptorlabs/transeptor-bundler/pull/82))
  - Enforce `EREP-015` ([#83](https://github.com/transeptorlabs/transeptor-bundler/pull/83))
  - Enforce `OP-080` ([#85](https://github.com/transeptorlabs/transeptor-bundler/pull/85))
  - Enforce `OP-070` ([#86](https://github.com/transeptorlabs/transeptor-bundler/pull/86))
  - Enforce `GREP-010`; drop all userOps from mempool for banned address ([#87](https://github.com/transeptorlabs/transeptor-bundler/pull/87))

### Fixed

- Fixes a set of bugs that were causing the bundler to fail against the [Bundler Compatibility Test Suite](https://github.com/eth-infinitism/bundler-spec-tests)
- Fix bug that was causing bundler to fail `test_stake_check_in_bundler` spec test ([#81](https://github.com/transeptorlabs/transeptor-bundler/pull/81))
- Fix bug that was causing bundler to fail the `replace op` spec test ([#77](https://github.com/transeptorlabs/transeptor-bundler/pull/77))
- Fix the bug that was causing the bundler to fail `max allowed ops unstaked sender` spec test ([#78](https://github.com/transeptorlabs/transeptor-bundler/pull/78))
- Fix bug that was causing bundler to fail `ban_user_op_access_other_ops_sender_in_bundle` spec test ([#79](https://github.com/transeptorlabs/transeptor-bundler/pull/79))

### Changed

- Define a subset of types that only exposes the necessary methods for more granular `MempoolManager` interfaces ([#80](https://github.com/transeptorlabs/transeptor-bundler/pull/80))
- Introduces functional programming paradigm mempool state management to the bundler.
  
## [v0.6.2-alpha.0] - 2024-06-23

### Changed

- Convert bundler from CommonJS to [ESM](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c) / ECMAScript.([#65](https://github.com/transeptorlabs/transeptor-bundler/pull/65))

## [v0.6.1-alpha.0] - 2024-04-07

### Fixed

- Update to use ep v7 default address ([#63](https://github.com/transeptorlabs/transeptor-bundler/pull/63))

## [v0.6.0-alpha.0] - 2024-04-07

([#60](https://github.com/transeptorlabs/transeptor-bundler/pull/60))

### Added

- Add support entrypoint v07 

### Changed

- Remove mono repo packages
- Remove hardhat and replace with forge
- Update bundler to use node 20.11.1 LTS
- Prefix all environment variables with `TRANSEPTOR` to follow naming best practice.

## [v0.5.3-alpha.0] - 2024-02-19

### Fixed

A bug found in entrypoint v0.6 requires bundlers' attention, and a new test, `test_enough_verification_gas` has been added to the "bundler-spec-test" repo on branch [releases/v0.6](https://github.com/eth-infinitism/bundler-spec-tests/tree/releases/v0.6), PR [here](https://github.com/eth-infinitism/bundler-spec-tests/pull/57) to address the bug. 

## [v0.5.2-alpha.0] - 2023-12-16

### Added

Support `Linux/amd64` and `Linux/arm64` OS architectures for transeptor Docker image


## [v0.5.1-alpha.0] - 2023-12-16

### Added

Add Docker image push GitHub workflow

## [v0.5.0-alpha.0] - 2023-10-21

### Added

Add support for metrics and monitoring. Metrics give insight into the bundler node, allowing for performance tuning and debugging. The Transeptor bundler can be configured to store metrics using a push(InfluxDB) and pull(Prometheus) metrics system. Grafana visualizes all the metrics. To run the Transeptor bundler with metrics, enable the `--metrics` flag.

**New ENV:**
`INFLUX_TOKEN=<YOUR_INFLUX_DB_TOKEN>`


**New command line flags:**

|      **Options** | **Type** | **Description** | **Default Value** |
| -------------------- | ------- | ------------------------------------------------------------------- | ----------------------- |
|       `--metrics` | `boolean` | bundler metrics enabled              | `false` |
|       `--metricsPort` | `number` | metrics server listening port              | `4001` |
|       `--influxdbUrl` | `string` | url influxdb is running on            | `http://localhost:8086` |
|       `--influxdbOrg` | `string` | influxdb org              | `transeptor-labs` |
|       `--influxdbBucket` | `string` | influxdb bucket              | `transeptor_metrics` |

**New endpoint:**
Create a new endpoint running on a separate port to expose collected metrics—`/metrics`. In the future, these metrics will be used to pull metrics with the Prometheus metrics system.

## [v0.4.0-alpha.0] - 2023-09-30

### Changed

- Upgrade Transeptor to a mono repo multiple packages.

## [v0.3.0-alpha.0] - 2023-09-11

### Changed

- Refactor `parseScannerResult` by separating concerns into functions and improving the code readability.

## [v0.2.0-alpha.0] - 2023-09-08

### Changed

- Changed `autoBundleInterval` to 12000ms
- Update JS tracer to pass all opcode banning  for [bundler-spec-test](https://github.com/eth-infinitism/bundler-spec-tests/)


## [v0.1.0-alpha.0] - 2023-06-14

- Initial release of Transeptor bundler.
  