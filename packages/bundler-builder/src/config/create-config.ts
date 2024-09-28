import { Command, OptionValues } from 'commander'
import dotenv from 'dotenv'
import { BigNumber, ethers, providers, Wallet } from 'ethers'
import { createProvider } from '../../../shared/provider/index.js'
import { IENTRY_POINT_ABI, IStakeManager } from '../../../shared/abis/index.js'
import { DEFAULT_ENTRY_POINT } from '../../../shared/constants/index.js'
import { BundlerSignerWallets } from '../../../bundler-builder/src/signer/index.js'
import { isValidAddress } from '../../../shared/utils/index.js'

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
  const defaulHttpApis = ['builder', 'debug']

  program
    .version(`${nodeVersion}`)
    .option(
      '--network <string>',
      'ETH execution client url.',
      `${DEFAULT_NETWORK}`,
    )
    .option('--p2p', 'p2p mode enabled', false)
    .option('--findPeers', 'Search for peers when p2p enabled.', false)
    .option('--port <number>', 'Bundler-relayer node listening port.', '4338')
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

  return {
    provider,
    bundlerSignerWallets,
    beneficiaryAddr: process.env.TRANSEPTOR_BENEFICIARY as string,
    minSignerBalance: ethers.utils.parseEther(programOpts.minBalance as string),
    numberOfSigners: parseInt(programOpts.numberOfSigners),

    clientVersion: nodeVersion,
    httpApis: defaulHttpApis,
    port: parseInt(programOpts.port as string),
    entryPointContract,
    stakeManagerContract,

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

    isP2PMode,
    findPeers: programOpts.findPeers as boolean,
    peerMultiaddrs,
  }
}
