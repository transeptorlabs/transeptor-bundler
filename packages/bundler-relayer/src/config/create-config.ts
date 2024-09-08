import { Command, OptionValues } from 'commander'
import dotenv from 'dotenv'
import { BigNumber, ethers, providers } from 'ethers'
import { parseEther } from 'ethers/lib/utils.js'

import { IENTRY_POINT_ABI, IStakeManager } from '../../../shared/abis/index.js'

import { isValidAddress } from '../../../shared/utils/index.js'
import { createProvider } from '../../../shared/provider/index.js'
import { DEFAULT_ENTRY_POINT } from '../../../shared/constants/index.js'
import { InfluxdbConnection } from '../metrics/index.js'

dotenv.config()

const DEFAULT_NETWORK = 'http://localhost:8545'
const DEFAULT_BUNDLER_BUILDER_CLIENT_URL = 'http://localhost:4338/rpc'
const SUPPORTED_MODES = ['base', 'conditional', 'searcher']
const nodeVersion = '0.6.2-alpha.0' // manual update on each release

export type Config = {
  provider: providers.JsonRpcProvider

  entryPointContract: ethers.Contract
  stakeManagerContract: ethers.Contract

  isUnsafeMode: boolean
  txMode: string
  autoBundleInterval: number
  bundleSize: number
  isAutoBundle: boolean
  maxMempoolSize: number
  minUnstakeDelay: number
  maxBundleGas: number

  whitelist: string[]
  blacklist: string[]
  minStake: BigNumber

  port: number
  clientVersion: string
  httpApis: string[]

  bundlerBuilderClientUrl: string

  isMetricsEnabled: boolean
  metricsPort: number
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
    .option(
      '--maxBundleGas <number>',
      'Max gas the bundler will use in transactions.',
      '5000000',
    )
    .option('--auto', 'Automatic bundling.', false)
    .option(
      '--autoBundleInterval <number>',
      'Auto bundler interval in (ms).',
      '12000',
    )
    .option(
      '--bundleSize <number>',
      'Maximum number of pending mempool entities to start auto bundler.',
      '10',
    )
    .option('--port <number>', 'Bundler-relayer node listening port.', '4337')
    .option(
      '--minStake <string>',
      'Minimum stake a entity has to have to pass reputation system.',
      '1',
    ) // The stake value is not enforced on-chain, but specifically by each node while simulating a transaction
    .option(
      '--minUnstakeDelay <number>',
      'Time paymaster has to wait to unlock the stake(seconds).',
      '0',
    ) // One day - 84600
    .option(
      '--txMode <string>',
      'Bundler transaction mode (base, conditional, searcher).',
      'base',
    )
    .option('--unsafe', 'Enable no storage or opcode checks.')
    .option('--metrics', 'Bundler node metrics tracking enabled.', false)
    .option('--metricsPort <number>', 'Metrics server listening port.', '4001')
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

  // set transaction mode config
  if (!SUPPORTED_MODES.includes(programOpts.txMode as string)) {
    throw new Error('Invalid bundler mode')
  }

  if ((programOpts.txMode as string) === 'searcher') {
    if (!process.env.TRANSEPTOR_ALCHEMY_API_KEY) {
      throw new Error('TRANSEPTOR_ALCHEMY_API_KEY env var not set')
    }
  }

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

  // set reputation config
  const whitelist = process.env.WHITELIST
    ? process.env.WHITELIST.split(',')
    : []
  const blacklist = process.env.BLACKLIST
    ? process.env.BLACKLIST.split(',')
    : []

  // set metric config
  const isMetricsEnabled = programOpts.metrics as boolean
  const influxdbConnection: InfluxdbConnection = isMetricsEnabled
    ? {
        url: programOpts.influxdbUrl as string,
        token: process.env.TRANSEPTOR_INFLUX_TOKEN as string,
        org: programOpts.influxdbOrg as string,
        bucket: programOpts.influxdbBucket as string,
      }
    : { url: '', org: '', bucket: '', token: '' }

  const metricsPort = isMetricsEnabled
    ? parseInt(programOpts.metricsPort as string)
    : 0

  if (isMetricsEnabled && !process.env.TRANSEPTOR_INFLUX_TOKEN) {
    throw new Error('TRANSEPTOR_INFLUX_TOKEN env var not set')
  }

  return {
    provider,
    entryPointContract,
    stakeManagerContract,

    isUnsafeMode: programOpts.unsafe as boolean,
    txMode: programOpts.txMode as string,
    autoBundleInterval: parseInt(programOpts.autoBundleInterval as string),
    bundleSize: parseInt(programOpts.bundleSize as string),
    isAutoBundle: programOpts.auto as boolean,
    maxMempoolSize: 100,
    maxBundleGas: parseInt(programOpts.maxBundleGas as string),

    minStake: parseEther(programOpts.minStake as string),
    minUnstakeDelay: parseInt(programOpts.minUnstakeDelay as string),
    whitelist,
    blacklist,

    port: parseInt(programOpts.port as string),
    clientVersion: nodeVersion,
    httpApis: (programOpts.debug as boolean)
      ? [...defaulHttpApis, 'debug']
      : defaulHttpApis,

    bundlerBuilderClientUrl: programOpts.bundlerBuilder as string,

    isMetricsEnabled,
    metricsPort,
    influxdbConnection,
  }
}
