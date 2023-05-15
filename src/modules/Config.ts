import { Command } from 'commander'
import { OptionValues } from 'commander'
import { Wallet, ethers, providers } from 'ethers'
import packageJson from '../../package.json'
import { isValidAddress } from '../utils'

export class Config {
  private static instance: Config | null

  private readonly port: number
  private readonly provider: providers.JsonRpcProvider
  private readonly connectedWallet: Wallet

  private readonly autoBundleInterval: number
  private readonly autoBundleMempoolSize: number
  private readonly mode: string

  private readonly entryPointAddr: string
  private readonly beneficiaryAddr: string
  private readonly entryPointContract: ethers.Contract

  private DEFAULT_NETWORK = 'http://localhost:8545'
  private DEFAULT_ENTRY_POINT = '0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789'
  private SUPPORTED_MODES = ['private-conditional', 'public-conditional', 'private-searcher', 'public-searcher', 'test']

  private constructor() {
    try {
      const program = new Command()
      program
      .version(`${packageJson.version}`)
      .option('--beneficiary <string>', 'address to receive funds')
      .option('--port <number>', 'server listening port', '3000')
      .option('--network <string>', 'eth client url', `${this.DEFAULT_NETWORK}`)
      .option('--entryPoint <string>', 'supported entry point address', this.DEFAULT_ENTRY_POINT)
      .option('--auto', 'automatic bundling', true)
      .option('--autoBundleInterval <number>', 'auto bundler interval in (ms)', '120000')
      .option('--autoBundleMempoolSize <number>', 'mempool bundle size', '5')
      .option('--mode <string>', 'bundler mode (public-conditional, public-conditional, private-searcher, public-searcher)', 'private-conditional')

      const programOpts: OptionValues = program.parse(process.argv).opts()
      let walletMnemonic

      console.log('command-line arguments: ', programOpts)
     
      if (this.SUPPORTED_MODES.indexOf(programOpts.mode as string) === -1) {        
        throw new Error('Invalid bundler mode')
      }

      if (isValidAddress(programOpts.entryPoint as string) && isValidAddress(programOpts.beneficiary as string)) {
        throw new Error('Invalid entry point or beneficiary address')
      }

      if (programOpts.network as string !== this.DEFAULT_NETWORK) {
        if (!process.env.MNEMONIC ) {
          throw new Error('MNEMONIC env var not set')
        }

        if (!process.env.ALCHEMY_API_KEY ) {
          throw new Error('ALCHEMY_API_KEY env var not set')
        }

        walletMnemonic = Wallet.fromMnemonic(process.env.MNEMONIC)
        this.provider = this.getNetworkProvider(programOpts.network as string, process.env.ALCHEMY_API_KEY)
      } else {
        // use default network with default hardhat mnemonic
        walletMnemonic = Wallet.fromMnemonic('test '.repeat(11) + 'junk')
        this.provider = this.getNetworkProvider(programOpts.network as string)
      }

      this.port = parseInt(programOpts.port as string)
      this.mode = programOpts.mode as string

      this.autoBundleInterval = parseInt(programOpts.autoBundleInterval as string)
      this.autoBundleMempoolSize = parseInt(programOpts.autoBundleMempoolSize as string)

      this.entryPointAddr = programOpts.entryPoint as string
      this.beneficiaryAddr = programOpts.beneficiary as string
      this.connectedWallet = walletMnemonic.connect(this.provider)
      this.entryPointContract = new ethers.Contract(this.entryPointAddr, [], this.connectedWallet)
    } catch (error: any) {
      throw new Error(`Unable to set up config gobal: ${error.message as string}`)
    }
  }

  public static getInstance(): Config {
    if (!this.instance) {
      this.instance = new Config()
    }
    return this.instance
  }

  private getNetworkProvider(url: string, apiKey?: string): providers.JsonRpcProvider {
    const isValid = this.isValidUrl(url)
    if (!isValid) {
      throw new Error('Invalid network url')
    }
    return apiKey ? new providers.JsonRpcProvider(url, apiKey) : new providers.JsonRpcProvider(url)
  }

  private isValidUrl(url: string): boolean {
    const pattern = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/
    return pattern.test(url)
  }

  getProvider(): providers.JsonRpcProvider {
    return this.provider
  }

  getMode(): string {
    return this.mode
  }

  isConditionalRpcMode(): boolean {
    return this.mode === 'public-conditional' || this.mode === 'private-conditional'
  }

  getBundleSize(): number {
    return this.autoBundleMempoolSize
  }

  getBundleInterval(): number {
    return this.autoBundleInterval
  }

  getPort(): number {
    return this.port
  }

  getEntryPointAddr(): string {
    return this.entryPointAddr
  }

  getConnectedWallet(): Wallet {
    return this.connectedWallet
  }

  getEntryPointContract(): ethers.Contract {
    return this.entryPointContract
  }

  getBeneficiaryAddr(): string {
    return this.beneficiaryAddr
  }

  /**
   * for debugging/testing: clear current in-memory instance of MempoolManager
   */
  public resetInstance(): void {
    Config.instance = null
  }
}