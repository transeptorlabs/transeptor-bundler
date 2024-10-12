import { Command, OptionValues } from 'commander'
import dotenv from 'dotenv'
import { ethers, providers } from 'ethers'

import { IENTRY_POINT_ABI, IStakeManager } from '../../../shared/abis/index.js'

import { isValidAddress } from '../../../shared/utils/index.js'
import { createProvider } from '../../../shared/provider/index.js'
import { DEFAULT_ENTRY_POINT } from '../../../shared/constants/index.js'
import { InfluxdbConnection } from '../metrics/index.js'

dotenv.config()

const DEFAULT_NETWORK = 'http://localhost:8545'
const DEFAULT_BUNDLER_BUILDER_CLIENT_URL = 'http://localhost:4338/rpc'
const nodeVersion = '0.6.2-alpha.0' // manual update on each release

export type Config = {
  provider: providers.JsonRpcProvider

  entryPointContract: ethers.Contract
  stakeManagerContract: ethers.Contract

  isUnsafeMode: boolean

  port: number
  clientVersion: string
  httpApis: string[]

  bundlerBuilderClientUrl: string

  isMetricsEnabled: boolean
  influxdbConnection: InfluxdbConnection
}

export const createRelayerConfig = (args: readonly string[]): Config => {
  const program = new Command()
  const defaulHttpApis = ['web3', 'eth']

  program
    .version(`${nodeVersion}`)
    .option('--debug', 'Enable ERC4337 debug rpc method name space', false)
    .option(
      '--network <string>',
      'ETH execution client url.',
      `${DEFAULT_NETWORK}`,
    )
    .option(
      '--bundlerBuilder <string>',
      'ERC-4337 bundler-builder client url.',
      `${DEFAULT_BUNDLER_BUILDER_CLIENT_URL}`,
    )
    .option('--port <number>', 'Bundler-relayer node listening port.', '4337')
    .option(
      '--unsafe',
      'Enable no storage or opcode checks during userOp simulation.',
    )
    .option('--metrics', 'Bundler node metrics tracking enabled.', false)
    .option(
      '--influxdbUrl <string>',
      'Url influxdb is running on (requires --metrics to be enabled).',
      'http://localhost:8086',
    )
    .option(
      '--influxdbOrg <string>',
      'Influxdb org (requires --metrics to be enabled).',
      'transeptor-labs',
    )
    .option(
      '--influxdbBucket <string>',
      'Influxdb bucket (requires --metrics to be enabled).',
      'transeptor_metrics',
    )

  const programOpts: OptionValues = program.parse(args).opts()

  const provider = createProvider(
    programOpts.network as string,
    process.env.TRANSEPTOR_ALCHEMY_API_KEY,
  )
  const supportedEntryPointAddress =
    process.env.TRANSEPTOR_ENTRYPOINT_ADDRESS || DEFAULT_ENTRY_POINT
  const entryPointContract = new ethers.Contract(
    supportedEntryPointAddress,
    IENTRY_POINT_ABI,
    provider,
  )
  const stakeManagerContract = new ethers.Contract(
    supportedEntryPointAddress,
    IStakeManager,
    provider,
  )

  if (!isValidAddress(supportedEntryPointAddress)) {
    throw new Error('Entry point not a valid address')
  }

  // set metric config
  const isMetricsEnabled = programOpts.metrics as boolean
  if (isMetricsEnabled && !process.env.TRANSEPTOR_INFLUX_TOKEN) {
    throw new Error('TRANSEPTOR_INFLUX_TOKEN env var not set')
  }
  const influxdbConnection: InfluxdbConnection = isMetricsEnabled
    ? {
        url: programOpts.influxdbUrl as string,
        token: process.env.TRANSEPTOR_INFLUX_TOKEN as string,
        org: programOpts.influxdbOrg as string,
        bucket: programOpts.influxdbBucket as string,
      }
    : { url: '', org: '', bucket: '', token: '' }

  return {
    provider,
    entryPointContract,
    stakeManagerContract,

    isUnsafeMode: programOpts.unsafe as boolean,

    port: parseInt(programOpts.port as string),
    clientVersion: nodeVersion,
    httpApis: (programOpts.debug as boolean)
      ? [...defaulHttpApis, 'debug']
      : defaulHttpApis,

    bundlerBuilderClientUrl: programOpts.bundlerBuilder as string,

    isMetricsEnabled,
    influxdbConnection,
  }
}
