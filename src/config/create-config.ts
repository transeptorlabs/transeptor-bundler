import { Command, OptionValues } from 'commander'
import dotenv from 'dotenv'
import { ethers, HDNodeWallet, JsonRpcProvider, Mnemonic, Wallet } from 'ethers'
import { createProvider } from '../provider/index.js'
import { IENTRY_POINT_ABI, IStakeManager } from '../abis/index.js'
import { DEFAULT_ENTRY_POINT } from '../constants/index.js'
import { BundlerSignerWallets } from '../signer/index.js'
import { isValidAddress } from '../utils/index.js'
import { InfluxdbConnection } from '../metrics/index.js'

dotenv.config()

const DEFAULT_NETWORK = 'http://localhost:8545'
const SUPPORTED_MODES = ['base', 'searcher']
const nodeVersion = '0.8.0-alpha.0' // manual update on each release

export type Config = {
  provider: JsonRpcProvider
  nativeTracerProvider: JsonRpcProvider | undefined
  nativeTracerEnabled: boolean

  bundlerSignerWallets: BundlerSignerWallets
  minSignerBalance: bigint
  numberOfSigners: number
  beneficiaryAddr: string

  clientVersion: string
  httpApis: string[]
  port: number
  entryPointContract: ethers.Contract
  stakeManagerContract: ethers.Contract

  whitelist: string[]
  blacklist: string[]

  minStake: bigint
  minUnstakeDelay: bigint

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
  provider: ethers.JsonRpcProvider,
): BundlerSignerWallets => {
  const mnemonic = process.env.TRANSEPTOR_MNEMONIC
  if (!mnemonic) {
    throw new Error('TRANSEPTOR_MNEMONIC env var not set')
  }

  const initialValue: BundlerSignerWallets = {}
  return Array.from({ length: numberOfSigners }, (_, i) => {
    const hdNodeWallet = HDNodeWallet.fromMnemonic(
      Mnemonic.fromPhrase(mnemonic),
      `m/44'/60'/0'/0/${i}`,
    )
    const wallet = new Wallet(hdNodeWallet.privateKey).connect(provider)
    const wTuple: [number, Wallet] = [i, wallet]
    return wTuple
  }).reduce((acc, [index, wallet]) => {
    acc[index] = wallet
    return acc
  }, initialValue)
}

export const createBuilderConfig = (args: readonly string[]): Config => {
  const program = new Command()
  const SUPPORTED_NAMESPACES = ['web3', 'eth', 'debug']

  program
    .version(`${nodeVersion}`)
    .option(
      '--unsafe',
      'UNSAFE mode: Enable no storage or opcode checks during userOp simulation. SAFE mode(default).',
    )
    .option(
      '--tracerRpcUrl <string>',
      'Enables native tracer for full validation during userOp simulation with prestateTracer native tracer on the network provider. requires unsafe=false.',
    )
    .option(
      '--network <string>',
      'Ethereum network provider.',
      `${DEFAULT_NETWORK}`,
    )
    .option(
      '--httpApi <string>',
      'ERC4337 rpc method namespaces to enable.',
      'web3,eth',
    )
    .option('--port <number>', 'Bundler node listening port.', '4337')
    .option(
      '--numberOfSigners <number>',
      'Number of signers HD paths to use from mnemonic',
      '1',
    )
    .option(
      '--minBalance <string>',
      'Minimum ETH balance needed for signer address.',
      '1',
    )
    .option(
      '--minStake <string>',
      'Minimum stake an entity has to have to pass the reputation system.',
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
      `Bundler transaction mode (base, searcher).
        (base mode): Sends bundles using eth_sendRawTransaction RPC(does not protect against front running).
        (searcher mode): Sends bundles  using Flashbots Auction to protect the transaction against front running (only available on Mainnet)`,
      'base',
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
    .option('--p2p', 'p2p mode enabled', false)
    .option('--findPeers', 'Search for peers when p2p is enabled.', false)

  const programOpts: OptionValues = program.parse(args).opts()

  const provider = createProvider(programOpts.network as string)

  const nativeTracerEnabled = (programOpts.tracerRpcUrl as string) !== undefined
  const nativeTracerProvider = !(programOpts.tracerRpcUrl as string)
    ? undefined
    : createProvider(programOpts.tracerRpcUrl as string)

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
    nativeTracerProvider,
    nativeTracerEnabled,
    entryPointContract,
    stakeManagerContract,

    bundlerSignerWallets,
    beneficiaryAddr: process.env.TRANSEPTOR_BENEFICIARY as string,
    minSignerBalance: ethers.parseEther(programOpts.minBalance as string),
    numberOfSigners: parseInt(programOpts.numberOfSigners),

    clientVersion: nodeVersion,
    httpApis: httpApis,
    port: parseInt(programOpts.port as string),

    minStake: ethers.parseEther(programOpts.minStake as string),
    minUnstakeDelay: BigInt(parseInt(programOpts.minUnstakeDelay as string)),
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
