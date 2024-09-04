import { Command, OptionValues } from 'commander'
import dotenv from 'dotenv'
import { BigNumber, Wallet, ethers, providers } from 'ethers'
import { parseEther } from 'ethers/lib/utils.js'

import packageJson from '../../package.json' assert { type: 'json' }
import { IENTRY_POINT_ABI, IStakeManager } from '../../../shared/abis/index.js'
import {
  InfluxdbConnection,
} from '../../../shared/types/index.js'
import { isValidAddress } from '../../../shared/utils/index.js'
import { 
  BundlerSignerWallets, 
  createProvider 
} from '../../../shared/services/index.js'

dotenv.config()

const DEFAULT_NETWORK = 'http://localhost:8545'
const DEFAULT_ENTRY_POINT = '0x0000000071727De22E5E9d8BAf0edAc6f37da032'
const SUPPORTED_MODES = ['base', 'conditional', 'searcher']
const SUPPORTED_NAMESPACES = ['web3', 'eth', 'debug']

export type Config = {
  provider: providers.JsonRpcProvider;
  bundlerSignerWallets: BundlerSignerWallets;
  numberOfSigners: number;
  beneficiaryAddr: string;
  entryPointContract: ethers.Contract;
  stakeManagerContract: ethers.Contract;
  minSignerBalance: BigNumber;

  isUnsafeMode: boolean;
  txMode: string;
  autoBundleInterval: number;
  bundleSize: number;
  isAutoBundle: boolean;
  maxMempoolSize: number;
  minUnstakeDelay: number;
  maxBundleGas: number;

  whitelist: string[];
  blacklist: string[];
  minStake: BigNumber;

  port: number;
  clientVersion: string;
  httpApi: string[];

  isP2PMode: boolean;
  findPeers: boolean;
  peerMultiaddrs: string[];

  isMetricsEnabled: boolean;
  metricsPort: number;
  influxdbConnection: InfluxdbConnection;
};

const getBundlerSignerWallets = (
  numberOfSigners: number,
  provider: ethers.providers.JsonRpcProvider
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

export const createRelayerConfig = (args: readonly string[]): Config => {
  const program = new Command()
  
  program
  .version(`${packageJson.version}`)
  .option('--httpApi <string>', 'ERC4337 rpc method name spaces to enable.', 'web3,eth')
  .option('--network <string>', 'ETH execution client url.', `${DEFAULT_NETWORK}`)
  .option('--minBalance <string>', 'Maximum ETH balance need for signer address.', '1')
  .option('--maxBundleGas <number>', 'Max gas the bundler will use in transactions.', '5000000')
  .option('--auto', 'Automatic bundling.', false)
  .option('--autoBundleInterval <number>', 'Auto bundler interval in (ms).', '12000')
  .option('--bundleSize <number>', 'Maximum number of pending mempool entities to start auto bundler.', '10')
  .option('--port <number>', 'Bundler node listening port.', '4337')
  .option('--minStake <string>', 'Minimum stake a entity has to have to pass reputation system.', '1') // The stake value is not enforced on-chain, but specifically by each node while simulating a transaction
  .option('--minUnstakeDelay <number>', 'Time paymaster has to wait to unlock the stake(seconds).', '0') // One day - 84600
  .option('--txMode <string>', 'Bundler transaction mode (base, conditional, searcher).', 'base')
  .option('--unsafe', 'Enable no storage or opcode checks.')
  .option('--p2p', 'p2p mode enabled', false)
  .option('--findPeers', 'Search for peers when p2p enabled.', false)
  .option('--metrics', 'Bundler node metrics tracking enabled.', false)
  .option('--metricsPort <number>', 'Metrics server listening port.', '4001')
  .option('--influxdbUrl <string>', 'Url influxdb is running on (requires --metrics to be enabled).', 'http://localhost:8086')
  .option('--influxdbOrg <string>', 'Influxdb org (requires --metrics to be enabled).', 'transeptor-labs')
  .option('--influxdbBucket <string>', 'Influxdb bucket (requires --metrics to be enabled).', 'transeptor_metrics')
  .option('--numberOfSigners <number>', 'Number of signers HD paths to use from mnmonic', '3')
  
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

  // set wallet config
  const provider = createProvider(programOpts.network as string, process.env.TRANSEPTOR_ALCHEMY_API_KEY)
  const supportedEntryPointAddress = process.env.TRANSEPTOR_ENTRYPOINT_ADDRESS || DEFAULT_ENTRY_POINT
  const entryPointContract = new ethers.Contract(
    supportedEntryPointAddress,
    IENTRY_POINT_ABI,
    provider
  )
  const stakeManagerContract = new ethers.Contract(
    supportedEntryPointAddress,
    IStakeManager,
    provider
  )
  const bundlerSignerWallets = getBundlerSignerWallets(parseInt(programOpts.numberOfSigners), provider)

  if (!isValidAddress(supportedEntryPointAddress)) {
    throw new Error('Entry point not a valid address')
  }

  if (!process.env.TRANSEPTOR_BENEFICIARY) {
    throw new Error('TRANSEPTOR_BENEFICIARY env var not set')
  }

  if (!isValidAddress(process.env.TRANSEPTOR_BENEFICIARY as string)) {
    throw new Error('Beneficiary not a valid address')
  }

  // set reputation config
  const whitelist = process.env.WHITELIST
    ? process.env.WHITELIST.split(',')
    : []
  const blacklist = process.env.BLACKLIST
    ? process.env.BLACKLIST.split(',')
    : []

  // set p2p config
  const isP2PMode = programOpts.p2p as boolean
  const peerMultiaddrs = isP2PMode ? (process.env.PEER_MULTIADDRS ? process.env.PEER_MULTIADDRS.split(',') : []) : []

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

  const metricsPort = isMetricsEnabled ? parseInt(programOpts.metricsPort as string) : 0

  if (isMetricsEnabled && !process.env.TRANSEPTOR_INFLUX_TOKEN) {
    throw new Error('TRANSEPTOR_INFLUX_TOKEN env var not set')
  }

  // set api config
  const httpApi = (programOpts.httpApi as string).split(',')
  httpApi.forEach((api: string) => {
    if (SUPPORTED_NAMESPACES.indexOf(api) === -1) {
      throw new Error('Invalid http api')
    }
  })

  return {
    provider,
    bundlerSignerWallets,
    beneficiaryAddr: process.env.TRANSEPTOR_BENEFICIARY as string,
    entryPointContract,
    stakeManagerContract,
    minSignerBalance: parseEther(programOpts.minBalance as string),
    numberOfSigners: parseInt(programOpts.numberOfSigners),

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
    clientVersion: packageJson.version as string,
    httpApi: (programOpts.httpApi as string).split(','),

    isP2PMode,
    findPeers: programOpts.findPeers as boolean,
    peerMultiaddrs,

    isMetricsEnabled,
    metricsPort,
    influxdbConnection,
  }
}
