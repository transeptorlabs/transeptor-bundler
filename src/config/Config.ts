import { Command, OptionValues } from 'commander'
import dotenv from 'dotenv'
import { BigNumber, Wallet, ethers, providers } from 'ethers'
import { parseEther } from 'ethers/lib/utils.js'

import packageJson from '../../package.json' assert { type: 'json' }
import { IENTRY_POINT_ABI } from '../abis/index.js'
import { Logger } from '../logger/index.js'
import { InfluxdbConnection } from '../types/index.js'
import { isValidAddress } from '../utils/index.js'
dotenv.config()

export class Config {
  private DEFAULT_NETWORK = 'http://localhost:8545' 
  private DEFAULT_ENTRY_POINT = '0x0000000071727De22E5E9d8BAf0edAc6f37da032'
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

  public readonly minSignerBalance: BigNumber
  public readonly maxBundleGas: number

  public readonly port: number
  public readonly txMode: string
  public readonly clientVersion: string
  public readonly isUnsafeMode: boolean
  public readonly isP2PMode: boolean
  public readonly findPeers: boolean

  public readonly whitelist: string[]
  public readonly blacklist: string[]
  public readonly peerMultiaddrs: string[]

  public readonly httpApi: string[]

  public readonly isMetricsEnabled: boolean
  readonly metricsPort: number
  public readonly influxdbConnection: InfluxdbConnection  = {
    url: '',
    org: '',
    bucket: '',
    token: ''
  }

  constructor(args: readonly string[]) {
    const program = new Command()
    program
    .version(`${packageJson.version}`)
    .option('--httpApi <string>', 'ERC4337 rpc method name spaces to enable.', 'web3,eth')
    .option('--network <string>', 'ETH execution client url.', `${this.DEFAULT_NETWORK}`)
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

    const programOpts: OptionValues = program.parse(args).opts()
        
    if (this.SUPPORTED_MODES.indexOf(programOpts.txMode as string) === -1) {      
      throw new Error('Invalid bundler mode')
    }

    if (programOpts.txMode as string === 'searcher') {
      if (!process.env.TRANSEPTOR_ALCHEMY_API_KEY) {
        throw new Error('TRANSEPTOR_ALCHEMY_API_KEY env var not set')
      }
      
      this.provider = this.getNetworkProvider(programOpts.network as string, process.env.TRANSEPTOR_ALCHEMY_API_KEY as string)
    } else {
      this.provider = this.getNetworkProvider(programOpts.network as string)
    } 

    let supportedEntryPointAddress: string
    if (!process.env.TRANSEPTOR_ENTRYPOINT_ADDRESS) {
      supportedEntryPointAddress = this.DEFAULT_ENTRY_POINT
    } else {
      supportedEntryPointAddress = process.env.TRANSEPTOR_ENTRYPOINT_ADDRESS as string
    }
    if (!isValidAddress(supportedEntryPointAddress)) {
      throw new Error('Entry point not a valid address')
    }

    if (!process.env.TRANSEPTOR_MNEMONIC) {
      throw new Error('TRANSEPTOR_MNEMONIC env var not set')
    }

    if (!process.env.TRANSEPTOR_BENEFICIARY) {
      throw new Error('TRANSEPTOR_BENEFICIARY env var not set')
    }
    if (!isValidAddress(process.env.TRANSEPTOR_BENEFICIARY as string)) {
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

    this.isP2PMode = programOpts.p2p as boolean
    if (this.isP2PMode) {
      if(!process.env.PEER_MULTIADDRS) {
        this.peerMultiaddrs = []
      } else {
        this.peerMultiaddrs = process.env.PEER_MULTIADDRS.split(',')
      }
    } else {
      this.peerMultiaddrs = []
    }

    this.isMetricsEnabled = programOpts.metrics as boolean
    if (this.isMetricsEnabled) {
      if (!process.env.TRANSEPTOR_INFLUX_TOKEN) {
        throw new Error('TRANSEPTOR_INFLUX_TOKEN env var not set')
      }
      this.influxdbConnection = {
        url: programOpts.influxdbUrl as string,
        token: process.env.TRANSEPTOR_INFLUX_TOKEN as string,
        org: programOpts.influxdbOrg as string,
        bucket: programOpts.influxdbBucket as string
      }
      this.metricsPort = parseInt(programOpts.metricsPort as string)
      Logger.info(`Metrics enabled, connecting to influxdb at ${this.influxdbConnection.url} with org ${this.influxdbConnection.org} and bucket ${this.influxdbConnection.bucket}`)
    }
  
    this.connectedWallet = Wallet.fromMnemonic(process.env.TRANSEPTOR_MNEMONIC as string).connect(this.provider)
    this.beneficiaryAddr = process.env.TRANSEPTOR_BENEFICIARY as string
    this.entryPointContract = new ethers.Contract(supportedEntryPointAddress, IENTRY_POINT_ABI, this.connectedWallet)

    this.autoBundleInterval = parseInt(programOpts.autoBundleInterval as string)
    this.bundleSize = parseInt(programOpts.bundleSize as string)
    this.isAutoBundle = programOpts.auto as boolean

    this.minStake = parseEther(programOpts.minStake as string)
    this.minUnstakeDelay = parseInt(programOpts.minUnstakeDelay as string)

    this.minSignerBalance = parseEther(programOpts.minBalance as string)
    this.maxBundleGas = parseInt(programOpts.maxBundleGas as string)

    this.port = parseInt(programOpts.port as string)
    this.txMode = programOpts.txMode as string
    this.clientVersion = packageJson.version as string
    this.isUnsafeMode = programOpts.unsafe as boolean ? true : false
    this.findPeers = programOpts.findPeers as boolean ? true : false

    this.httpApi = (programOpts.httpApi as string).split(',')
    for (let i = 0; i < this.httpApi.length; i++) {
      if (this.SUPPORTED_NAMESPACES.indexOf(this.httpApi[i]) === -1) {
        throw new Error('Invalid http api')
      }
    }

    this.dump()
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
      peerMultiaddrs: this.peerMultiaddrs,
      httpApi: this.httpApi,
      beneficiaryAddr: this.beneficiaryAddr,
      entryPointContractAddress: this.entryPointContract.address,
      autoBundleInterval: this.autoBundleInterval,
      bundleSize: this.bundleSize,
      isAutoBundle: this.isAutoBundle,
      minStake: `${this.minStake.toString()} wei`,
      minUnstakeDelay: this.minUnstakeDelay.toString(),
      minSignerBalance: `${this.minSignerBalance.toString()} wei`,
      maxBundleGas: this.maxBundleGas,
      port: this.port,
      whitelist: this.whitelist,
      blacklist: this.blacklist,
      metrics: this.isMetricsEnabled,
      metricsPort: this.metricsPort,
    },
    'Bundler config setup')
  }
}
