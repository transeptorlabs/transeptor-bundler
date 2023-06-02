import packageJson from '../../../package.json'
import dotenv from 'dotenv'
import { Command, OptionValues } from 'commander'
import { BigNumber, Wallet, ethers, providers } from 'ethers'
import { parseEther } from 'ethers/lib/utils'
import { ENTRY_POINT_ABI, isValidAddress } from '../utils'
import { Logger } from '../logger'
dotenv.config()

export class Config {
  private DEFAULT_NETWORK = 'http://localhost:8545'
  private DEFAULT_ENTRY_POINT = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'
  private SUPPORTED_MODES = ['base', 'conditional', 'searcher']
  private SUPPORTED_NAMESPACES = ['web3', 'eth', 'debug']

  public readonly provider: providers.JsonRpcProvider
  public readonly connectedWallet: Wallet
  public readonly beneficiaryAddr: string
  public readonly entryPointContract: ethers.Contract

  public readonly autoBundleInterval: number
  public readonly bundleSize: number
  public readonly isAutoBundle: boolean
  public readonly maxMempoolSize: number = 100

  public readonly minStake: BigNumber
  public readonly minUnstakeDelay: number

  public readonly gasFactor: number
  public readonly minSignerBalance: BigNumber
  public readonly maxBundleGas: number

  public readonly port: number
  public readonly txMode: string
  public readonly clientVersion: string
  public readonly isUnsafeMode: boolean
  public readonly isP2PMode: boolean

  public readonly whitelist: string[]
  public readonly blacklist: string[]

  public readonly httpApi: string[]

  constructor(args: readonly string[]) {
    const program = new Command()
    program
    .version(`${packageJson.version}`)
    .option('--httpApi <string>', 'rpc method name spaces', 'web3,eth')
    .option('--network <string>', 'eth client url', `${this.DEFAULT_NETWORK}`)
    .option('--entryPoint <string>', 'supported entry point address', this.DEFAULT_ENTRY_POINT)
    .option('--gasFactor <number>', '1')
    .option('--minBalance <string>', 'below this signer balance, keep fee for itself, ignoring "beneficiary" address', '1')
    .option('--maxBundleGas <number>', 'max gas the bundler will use in transactions', '5e6')
    .option('--auto', 'automatic bundling', false)
    .option('--autoBundleInterval <number>', 'auto bundler interval in (ms)', '120000')
    .option('--bundleSize <number>', 'maximum # of pending mempool entities', '2')
    .option('--port <number>', 'server listening port', '3000')
    .option('--minStake <string>', 'minimum stake a entity has to have to pass reputation system(When staked, an entity is also allowed to use its own associated storage, in addition to senders associated storage as ETH)', '1') // The stake value is not enforced on-chain, but specifically by each node while simulating a transaction
    .option('--minUnstakeDelay <number>', 'time paymaster has to wait to unlock the stake(seconds)', '84600') // One day
    .option('--txMode <string>', 'bundler transaction mode (base, conditional, searcher)', 'base')
    .option('--unsafe', 'UNSAFE mode: no storage or opcode checks (safe mode requires debug_traceCall support on eth node. Only base and conditional txMode are supported in safe mode)')
    .option('--p2p', 'p2p mode enabled)', false)

    const programOpts: OptionValues = program.parse(args).opts()
        
    if (this.SUPPORTED_MODES.indexOf(programOpts.txMode as string) === -1) {      
      throw new Error('Invalid bundler mode')
    }

    if (!isValidAddress(programOpts.entryPoint as string)) {
      throw new Error('Entry point not a valid address')
    }

    if (programOpts.txMode as string === 'searcher') {
      if (!process.env.ALCHEMY_API_KEY) {
        throw new Error('ALCHEMY_API_KEY env var not set')
      }
      
      this.provider = this.getNetworkProvider(programOpts.network as string, process.env.ALCHEMY_API_KEY as string)
    } else {
      this.provider = this.getNetworkProvider(programOpts.network as string)
    } 

    if (!process.env.MNEMONIC) {
      throw new Error('MNEMONIC env var not set')
    }

    if (!process.env.BENEFICIARY) {
      throw new Error('BENEFICIARY env var not set')
    }

    if (!isValidAddress(process.env.BENEFICIARY as string)) {
      throw new Error('Beneficiary not a valid address')
    }

    if(!process.env.WHITELIST) {
      this.whitelist = []
    } else {
      this.whitelist = process.env.WHITELIST.split(',')
    }

    if(!process.env.BLACKLIST) {
      this.blacklist = []
    } else {
      this.blacklist = process.env.BLACKLIST.split(',')
    }

    this.connectedWallet = Wallet.fromMnemonic(process.env.MNEMONIC as string).connect(this.provider)
    this.beneficiaryAddr = process.env.BENEFICIARY as string
    this.entryPointContract = new ethers.Contract(programOpts.entryPoint as string, ENTRY_POINT_ABI, this.connectedWallet)

    this.autoBundleInterval = parseInt(programOpts.autoBundleInterval as string)
    this.bundleSize = parseInt(programOpts.bundleSize as string)
    this.isAutoBundle = programOpts.auto as boolean

    this.minStake = parseEther(programOpts.minStake as string)
    this.minUnstakeDelay = parseInt(programOpts.minUnstakeDelay as string)

    this.gasFactor = parseInt(programOpts.gasFactor as string)
    this.minSignerBalance = parseEther(programOpts.minBalance as string)
    this.maxBundleGas = parseInt(programOpts.maxBundleGas as string)

    this.port = parseInt(programOpts.port as string)
    this.txMode = programOpts.txMode as string
    this.clientVersion = packageJson.version as string
    this.isUnsafeMode = programOpts.unsafe as boolean ? true : false
    this.isP2PMode = programOpts.p2p as boolean

    this.httpApi = (programOpts.httpApi as string).split(',')
    for (let i = 0; i < this.httpApi.length; i++) {
      if (this.SUPPORTED_NAMESPACES.indexOf(this.httpApi[i]) === -1) {
        throw new Error('Invalid http api')
      }
    }

    this.dump()
    Logger.debug('Config initialized')
  }

  private getNetworkProvider(url: string, apiKey?: string): providers.JsonRpcProvider {
    const isValid = this.isValidUrl(url)
    if (!isValid) {
      throw new Error('Invalid network url')
    }
    return apiKey ? new providers.JsonRpcProvider(`${url.replace(/\/+$/, '')}/${apiKey}`) : new providers.JsonRpcProvider(url)
  }

  private isValidUrl(url: string): boolean {
    const pattern = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/
    return pattern.test(url)
  }

  private dump(): void {
    Logger.debug(
      {
      clientVersion: this.clientVersion,
      txMode: this.txMode,
      isUnsafeMode: this.isUnsafeMode,
      isP2PMode: this.isP2PMode,
      httpApi: this.httpApi,
      beneficiaryAddr: this.beneficiaryAddr,
      entryPointContractAddress: this.entryPointContract.address,
      autoBundleInterval: this.autoBundleInterval,
      bundleSize: this.bundleSize,
      isAutoBundle: this.isAutoBundle,
      minStake: this.minStake.toString(),
      minUnstakeDelay: this.minUnstakeDelay.toString(),
      gasFactor: this.gasFactor,
      minSignerBalance: this.minSignerBalance.toString(),
      maxBundleGas: this.maxBundleGas,
      port: this.port,
      whitelist: this.whitelist,
      blacklist: this.blacklist
    },
    'Bundler config')
  }
}
