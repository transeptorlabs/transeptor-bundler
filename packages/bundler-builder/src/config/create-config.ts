import { Command, OptionValues } from 'commander'
import dotenv from 'dotenv'
import { BigNumber, ethers, providers, Wallet } from 'ethers'
import packageJson from '../../package.json' assert { type: 'json' }
import { 
  createProvider 
} from '../../../shared/provider/index.js'
import { IENTRY_POINT_ABI, IStakeManager } from '../../../shared/abis'
import { DEFAULT_ENTRY_POINT } from '../../../shared/constants/index.js'
import { BundlerSignerWallets } from '../../../bundler-builder/src/signer/index.js'
import { parseEther } from 'ethers/lib/utils'
import { isValidAddress } from '../../../shared/utils/index.js'

dotenv.config()

const DEFAULT_NETWORK = 'http://localhost:8545'

export type Config = {
  provider: providers.JsonRpcProvider;

  bundlerSignerWallets: BundlerSignerWallets;
  minSignerBalance: BigNumber;
  numberOfSigners: number;
  beneficiaryAddr: string;

  clientVersion: string;
  httpApis: string[];
  port: number;
  entryPointContract: ethers.Contract;
  stakeManagerContract: ethers.Contract;

  isP2PMode: boolean;
  findPeers: boolean;
  peerMultiaddrs: string[];
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

export const createBuilderConfig = (args: readonly string[]): Config => {
  const program = new Command()
  const defaulHttpApis = ['builder','debug']
  
  program
  .version(`${packageJson.version}`)
  .option('--network <string>', 'ETH execution client url.', `${DEFAULT_NETWORK}`)
  .option('--p2p', 'p2p mode enabled', false)
  .option('--findPeers', 'Search for peers when p2p enabled.', false)
  .option('--port <number>', 'Bundler-relayer node listening port.', '4337')
  .option('--numberOfSigners <number>', 'Number of signers HD paths to use from mnmonic', '3')
  .option('--minBalance <string>', 'Maximum ETH balance need for signer address.', '1')

  const programOpts: OptionValues = program.parse(args).opts()

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
  if (!process.env.TRANSEPTOR_BENEFICIARY) {
    throw new Error('TRANSEPTOR_BENEFICIARY env var not set')
  }

  if (!isValidAddress(process.env.TRANSEPTOR_BENEFICIARY as string)) {
    throw new Error('Beneficiary not a valid address')
  }

  // set p2p config
  const isP2PMode = programOpts.p2p as boolean
  const peerMultiaddrs = isP2PMode ? (process.env.PEER_MULTIADDRS ? process.env.PEER_MULTIADDRS.split(',') : []) : []

  return {
    provider,
    bundlerSignerWallets,
    beneficiaryAddr: process.env.TRANSEPTOR_BENEFICIARY as string,
    minSignerBalance: parseEther(programOpts.minBalance as string),
    numberOfSigners: parseInt(programOpts.numberOfSigners),

    clientVersion: packageJson.version as string,
    httpApis: defaulHttpApis,
    port: parseInt(programOpts.port as string),
    entryPointContract,
    stakeManagerContract,

    isP2PMode,
    findPeers: programOpts.findPeers as boolean,
    peerMultiaddrs,
  }
}
