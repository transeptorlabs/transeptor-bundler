import { ethers, HDNodeWallet, JsonRpcProvider, Mnemonic, Wallet } from 'ethers'

import { TRANSEPTOR_ENV_VALUES } from '../constants/index.js'
import { createProvider } from '../provider/index.js'
import { InfluxdbConnection, BundlerSignerWallets } from '../types/index.js'
import { assertEnvVar, isValidAddress, withReadonly } from '../utils/index.js'

import { getCmdOptionValues } from './command.js'

const DEFAULT_NETWORK = 'http://localhost:8545'
const SUPPORTED_MODES = ['base', 'searcher']
const nodeVersion = '0.14.0-alpha.0' // manual update on each release
const AUDIT_LOG_DESTINATION_PATH = './logs/audit.log'

export type Config = {
  provider: JsonRpcProvider

  bundlerSignerWallets: BundlerSignerWallets
  minSignerBalance: bigint
  beneficiaryAddr: string

  clientVersion: string
  commitHash: string
  auditTrail: boolean
  auditLogDestinationPath: string
  auditLogFlushIntervalMs: number
  auditLogBufferSize: number
  environment: string

  httpApis: string[]
  port: number

  supportedEntryPointAddress: string

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

  eip7702Support: boolean
}

export type ConfigDeps = {
  /**
   * The arguments to create the Config instance.
   */
  args: Readonly<string[]>

  /**
   * The environment variables to create the Config instance.
   */
  env: Readonly<typeof TRANSEPTOR_ENV_VALUES>
}

// Helper function to get bundler signer wallets
const getBundlerSignerWallet = (
  numberOfSigners: number,
  provider: ethers.JsonRpcProvider,
  mnemonic: string,
): BundlerSignerWallets => {
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

// Helper function to validate HTTP APIs
const validateHttpApis = (
  httpApis: string[],
  SUPPORTED_NAMESPACES: string[],
) => {
  httpApis.forEach((api) => {
    if (SUPPORTED_NAMESPACES.indexOf(api) === -1) {
      throw new Error('Invalid http api')
    }
  })
}

/**
 * Creates an instance of the Config module.
 *
 * @param configDeps - The dependencies to create the Config instance.
 * @returns An instance of the Config module.
 */
function _createConfig(configDeps: Readonly<ConfigDeps>): Config {
  const { args, env } = configDeps
  const SUPPORTED_NAMESPACES = ['web3', 'eth', 'debug']
  const programOpts = getCmdOptionValues({
    args,
    nodeVersion,
    defaultNetwork: DEFAULT_NETWORK,
  })

  const provider = createProvider(programOpts.network as string)

  // Set up signers
  const mnemonic = assertEnvVar<string>({
    envVar: env.TRANSEPTOR_MNEMONIC,
    errorMessage: 'TRANSEPTOR_MNEMONIC env var not set',
  })
  const bundlerSignerWallets = getBundlerSignerWallet(2, provider, mnemonic)
  const beneficiaryAddr = assertEnvVar<string>({
    envVar: env.TRANSEPTOR_BENEFICIARY,
    errorMessage: 'TRANSEPTOR_BENEFICIARY env var not set',
    postValidationFunctions: [
      {
        fn: isValidAddress,
        errorMessage: 'Beneficiary not a valid address',
      },
    ],
  })
  // set p2p config
  const isP2PMode = programOpts.p2p as boolean
  const peerMultiaddrs = isP2PMode
    ? env.TRANSEPTOR_PEER_MULTIADDRS
      ? env.TRANSEPTOR_PEER_MULTIADDRS.split(',')
      : []
    : []

  // set transaction mode config
  const txMode = assertEnvVar<string>({
    envVar: programOpts.txMode as string,
    errorMessage: 'Invalid txMode',
    postValidationFunctions: [
      {
        fn: (parsedTxMode) => SUPPORTED_MODES.includes(parsedTxMode),
        errorMessage: `Invalid txMode: ${programOpts.txMode}`,
      },
    ],
  })

  // set metric config
  const isMetricsEnabled = programOpts.metrics as boolean
  if (isMetricsEnabled && !env.TRANSEPTOR_INFLUX_TOKEN) {
    throw new Error('TRANSEPTOR_INFLUX_TOKEN env var not set')
  }
  const influxdbConnection: InfluxdbConnection = isMetricsEnabled
    ? {
        url: programOpts.influxdbUrl as string,
        token: env.TRANSEPTOR_INFLUX_TOKEN as string,
        org: programOpts.influxdbOrg as string,
        bucket: programOpts.influxdbBucket as string,
      }
    : { url: '', org: '', bucket: '', token: '' }

  const httpApis = (programOpts.httpApi as string).split(',')
  validateHttpApis(httpApis, SUPPORTED_NAMESPACES)

  return {
    provider,
    supportedEntryPointAddress: env.TRANSEPTOR_ENTRYPOINT_ADDRESS,

    bundlerSignerWallets,
    beneficiaryAddr,
    minSignerBalance: ethers.parseEther(programOpts.minBalance as string),

    clientVersion: nodeVersion,
    commitHash: 'unknown', // TODO: replace with actual commit hash
    environment: env.NODE_ENV,
    auditLogFlushIntervalMs: 100, // every 100ms flush audit log queue
    auditLogBufferSize: 5000, // Maximum buffer size for the audit log queue (5000 events)
    auditLogDestinationPath: AUDIT_LOG_DESTINATION_PATH,
    auditTrail: programOpts.auditTrail as boolean,

    httpApis: httpApis,
    port: parseInt(programOpts.port as string),

    minStake: ethers.parseEther(programOpts.minStake as string),
    minUnstakeDelay: BigInt(parseInt(programOpts.minUnstakeDelay as string)),
    whitelist: env.TRANSEPTOR_WHITELIST
      ? env.TRANSEPTOR_WHITELIST.split(',')
      : [],
    blacklist: env.TRANSEPTOR_BLACKLIST
      ? env.TRANSEPTOR_BLACKLIST.split(',')
      : [],

    bundleSize: parseInt(programOpts.bundleSize as string),
    maxBundleGas: parseInt(programOpts.maxBundleGas as string),
    isAutoBundle: programOpts.auto as boolean,
    autoBundleInterval: parseInt(programOpts.autoBundleInterval as string),
    txMode,
    isUnsafeMode: programOpts.unsafe as boolean,

    isMetricsEnabled,
    influxdbConnection,

    isP2PMode,
    findPeers: programOpts.findPeers as boolean,
    peerMultiaddrs,
    eip7702Support: programOpts.eip7702Support as boolean,
  }
}

export const createConfig = withReadonly<ConfigDeps, Config>(_createConfig)
