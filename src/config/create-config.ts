import { Command, OptionValues } from 'commander'
import dotenv from 'dotenv'
import { BigNumber, ethers, providers, Wallet } from 'ethers'
import { createProvider } from '../provider/index.js'
import { IENTRY_POINT_ABI, IStakeManager } from '../abis/index.js'
import { DEFAULT_ENTRY_POINT } from '../constants/index.js'
import { BundlerSignerWallets } from '../signer/index.js'
import { isValidAddress } from '../utils/index.js'
import { InfluxdbConnection } from '../metrics/index.js'

dotenv.config()

const DEFAULT_NETWORK = 'http://localhost:8545'
const SUPPORTED_MODES = ['base', 'conditional', 'searcher']
const nodeVersion = '0.6.2-alpha.0' // manual update on each release

export type Config = {
  provider: providers.JsonRpcProvider

  bundlerSignerWallets: BundlerSignerWallets
  minSignerBalance: BigNumber
  numberOfSigners: number
  beneficiaryAddr: string

  clientVersion: string
  httpApis: string[]
  port: number
  entryPointContract: ethers.Contract
  stakeManagerContract: ethers.Contract

  whitelist: string[]
  blacklist: string[]

  minStake: BigNumber
  minUnstakeDelay: number

  bundleSize: number
  maxBundleGas: number
  isAutoBundle: boolean
  autoBundleInterval: number
  txMode: string
  isUnsafeMode: boolean

  isP2PMode: boolean
  findPeers: boolean
  peerMultiaddrs: string[]

  isMetricsEnabled: boolean
  influxdbConnection: InfluxdbConnection
}

const getBundlerSignerWallets = (
  numberOfSigners: number,
  provider: ethers.providers.JsonRpcProvider,
): BundlerSignerWallets => {
  const mnemonic = process.env.TRANSEPTOR_MNEMONIC
  if (!mnemonic) {
    throw new Error('TRANSEPTOR_MNEMONIC env var not set')
  }

  const intialValue: BundlerSignerWallets = {}
  return Array.from({ length: numberOfSigners }, (_, i) => {
    const path = `m/44'/60'/0'/0/${i}`
    const wallet = Wallet.fromMnemonic(mnemonic, path).connect(provider)
    const wTuple: [number, Wallet] = [i, wallet]
    return wTuple
  }).reduce((acc, [index, wallet]) => {
    acc[index] = wallet
    return acc
  }, intialValue)
}

export const createBuilderConfig = (args: readonly string[]): Config => {
  const program = new Command()
  const SUPPORTED_NAMESPACES = ['web3', 'eth', 'debug']

  program
    .version(`${nodeVersion}`)
    .option(
      '--httpApi <string>',
      'ERC4337 rpc method name spaces to enable.',
      'web3,eth',
    )
    .option(
      '--network <string>',
      'ETH execution client url.',
      `${DEFAULT_NETWORK}`,
    )
    .option('--p2p', 'p2p mode enabled', false)
    .option('--findPeers', 'Search for peers when p2p enabled.', false)
    .option('--port <number>', 'Bundler node listening port.', '4337')
    .option(
      '--numberOfSigners <number>',
      'Number of signers HD paths to use from mnmonic',
      '3',
    )
    .option(
      '--minBalance <string>',
      'Maximum ETH balance need for signer address.',
      '1',
    )
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
      '--bundleSize <number>',
      'Maximum number of pending mempool entities to start auto bundler.',
      '10',
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
      '--txMode <string>',
      'Bundler transaction mode (base, conditional, searcher).',
      'base',
    )
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

  if (!isValidAddress(supportedEntryPointAddress)) {
    throw new Error('Entry point not a valid address')
  }

  // Set up contracts
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

  // Set up signers
  const bundlerSignerWallets = getBundlerSignerWallets(
    parseInt(programOpts.numberOfSigners),
    provider,
  )
  if (!process.env.TRANSEPTOR_BENEFICIARY) {
    throw new Error('TRANSEPTOR_BENEFICIARY env var not set')
  }

  if (!isValidAddress(process.env.TRANSEPTOR_BENEFICIARY as string)) {
    throw new Error('Beneficiary not a valid address')
  }

  // set p2p config
  const isP2PMode = programOpts.p2p as boolean
  const peerMultiaddrs = isP2PMode
    ? process.env.PEER_MULTIADDRS
      ? process.env.PEER_MULTIADDRS.split(',')
      : []
    : []

  // set reputation config
  const whitelist = process.env.WHITELIST
    ? process.env.WHITELIST.split(',')
    : []
  const blacklist = process.env.BLACKLIST
    ? process.env.BLACKLIST.split(',')
    : []

  // set transaction mode config
  if (!SUPPORTED_MODES.includes(programOpts.txMode as string)) {
    throw new Error('Invalid bundler mode')
  }

  if ((programOpts.txMode as string) === 'searcher') {
    if (!process.env.TRANSEPTOR_ALCHEMY_API_KEY) {
      throw new Error('TRANSEPTOR_ALCHEMY_API_KEY env var not set')
    }
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

  const httpApis = (programOpts.httpApi as string).split(',')
  httpApis.forEach((api) => {
    if (SUPPORTED_NAMESPACES.indexOf(api) === -1) {
      throw new Error('Invalid http api')
    }
  })

  return {
    provider,
    entryPointContract,
    stakeManagerContract,

    bundlerSignerWallets,
    beneficiaryAddr: process.env.TRANSEPTOR_BENEFICIARY as string,
    minSignerBalance: ethers.utils.parseEther(programOpts.minBalance as string),
    numberOfSigners: parseInt(programOpts.numberOfSigners),

    clientVersion: nodeVersion,
    httpApis: httpApis,
    port: parseInt(programOpts.port as string),

    minStake: ethers.utils.parseEther(programOpts.minStake as string),
    minUnstakeDelay: parseInt(programOpts.minUnstakeDelay as string),
    whitelist,
    blacklist,

    bundleSize: parseInt(programOpts.bundleSize as string),
    maxBundleGas: parseInt(programOpts.maxBundleGas as string),
    isAutoBundle: programOpts.auto as boolean,
    autoBundleInterval: parseInt(programOpts.autoBundleInterval as string),
    txMode: programOpts.txMode as string,
    isUnsafeMode: programOpts.unsafe as boolean,

    isMetricsEnabled,
    influxdbConnection,

    isP2PMode,
    findPeers: programOpts.findPeers as boolean,
    peerMultiaddrs,
  }
}
