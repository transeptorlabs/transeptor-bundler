import dotenv from 'dotenv'
import { ethers, HDNodeWallet, JsonRpcProvider, Mnemonic, Wallet } from 'ethers'

import { DEFAULT_ENTRY_POINT } from '../constants/index.js'
import { createProvider } from '../provider/index.js'
import { InfluxdbConnection, BundlerSignerWallets } from '../types/index.js'
import { isValidAddress, withReadonly } from '../utils/index.js'

import { getCmdOptionValues } from './command.js'

dotenv.config()

const DEFAULT_NETWORK = 'http://localhost:8545'
const SUPPORTED_MODES = ['base', 'searcher']
const nodeVersion = '0.12.0-alpha.0' // manual update on each release
const AUDIT_LOG_DESTINATION_PATH = './logs/audit.log'

export type Config = {
  provider: JsonRpcProvider

  bundlerSignerWallets: BundlerSignerWallets
  minSignerBalance: bigint
  beneficiaryAddr: string

  clientVersion: string
  commitHash: string
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

// Helper function to get bundler signer wallets
const getBundlerSignerWallet = (
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

// Helper function to set up P2P configuration
const setupP2PConfig = (isP2PMode: boolean) => {
  const peerMultiaddrs = isP2PMode
    ? process.env.PEER_MULTIADDRS
      ? process.env.PEER_MULTIADDRS.split(',')
      : []
    : []
  return { peerMultiaddrs }
}

// Helper function to set up metrics configuration
const setupMetricsConfig = (isMetricsEnabled: boolean, programOpts: any) => {
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
  return { influxdbConnection }
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
 * @param args - The arguments to create the Config instance.
 * @returns An instance of the Config module.
 */
function _createConfig(args: Readonly<string[]>): Config {
  const SUPPORTED_NAMESPACES = ['web3', 'eth', 'debug']
  const programOpts = getCmdOptionValues({
    args,
    nodeVersion,
    defaultNetwork: DEFAULT_NETWORK,
  })

  const provider = createProvider(programOpts.network as string)

  const supportedEntryPointAddress =
    process.env.TRANSEPTOR_ENTRYPOINT_ADDRESS || DEFAULT_ENTRY_POINT

  // Set up signers
  const bundlerSignerWallets = getBundlerSignerWallet(2, provider)
  if (!process.env.TRANSEPTOR_BENEFICIARY) {
    throw new Error('TRANSEPTOR_BENEFICIARY env var not set')
  }

  if (!isValidAddress(process.env.TRANSEPTOR_BENEFICIARY as string)) {
    throw new Error('Beneficiary not a valid address')
  }

  // set p2p config
  const isP2PMode = programOpts.p2p as boolean
  const { peerMultiaddrs } = setupP2PConfig(isP2PMode)

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
  const { influxdbConnection } = setupMetricsConfig(
    isMetricsEnabled,
    programOpts,
  )

  const httpApis = (programOpts.httpApi as string).split(',')
  validateHttpApis(httpApis, SUPPORTED_NAMESPACES)

  return {
    provider,
    supportedEntryPointAddress,

    bundlerSignerWallets,
    beneficiaryAddr: process.env.TRANSEPTOR_BENEFICIARY as string,
    minSignerBalance: ethers.parseEther(programOpts.minBalance as string),

    clientVersion: nodeVersion,
    commitHash: 'unknown', // TODO: replace with actual commit hash
    environment: process.env.NODE_ENV || 'development',
    auditLogFlushIntervalMs: 100, // every 100ms flush audit log queue
    auditLogBufferSize: 5000, // Maximum buffer size for the audit log queue (5000 events)
    auditLogDestinationPath: AUDIT_LOG_DESTINATION_PATH,
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
    eip7702Support: programOpts.eip7702Support as boolean,
  }
}

export const createConfig = withReadonly<string[], Config>(_createConfig)
