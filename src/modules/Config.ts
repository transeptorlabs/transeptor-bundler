import { Command } from 'commander'
import { OptionValues } from 'commander'
import { Wallet, ethers, providers } from 'ethers'

export class Config {
  private static instance: Config | null

  private readonly port: number
  private readonly provider: providers.JsonRpcProvider
  private readonly entryPointAdd: string
  private readonly autoBundleInterval: number
  private readonly autoBundleMempoolSize: number
  private readonly connectedWallet: Wallet
  private readonly mempoolMode: string
  private readonly conditionalRpc: boolean
  private readonly entryPointContract: ethers.Contract

  private DEFAULT_NETWORK = 'http://localhost:8545'
  private DEFAULT_ENTRY_POINT = '0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789'

  private constructor() {
    try {
      const program = new Command()
      program
      .version('0.8.0')
      .option('--port <number>', 'server listening port', '3000')
      .option('--network <string>', 'eth client url', `${this.DEFAULT_NETWORK}`)
      .option('--entryPoint <string>', 'supported entry point address', this.DEFAULT_ENTRY_POINT)
      .option('--port <number>', 'server listening port', '3000')
      .option('--autoBundleInterval <number>', 'auto bundler interval in (ms)', '120000')
      .option('--autoBundleMempoolSize <number>', 'mempool bundle size', '5')
      .option('--mempoolMode <string>', 'bundler mode (private, public)', 'private')
      .option('--conditionalRpc', 'Use eth_sendRawTransactionConditional RPC)', false)

      // merge config (cli args) with env vars
      const programOpts: OptionValues = program.parse(process.argv).opts()
      console.log('command-line arguments: ', programOpts)

      this.port = parseInt(programOpts.port as string)
      this.entryPointAdd = programOpts.entryPoint as string
      this.autoBundleInterval = parseInt(programOpts.autoBundleInterval as string)
      this.autoBundleMempoolSize = parseInt(programOpts.autoBundleMempoolSize as string)
      this.mempoolMode = programOpts.mode as string
      this.conditionalRpc = programOpts.conditionalRpc as boolean

      let walletMnemonic
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

      this.connectedWallet = walletMnemonic.connect(this.provider)
      this.entryPointContract = new ethers.Contract(this.entryPointAdd, [], this.connectedWallet)
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

  getBundleSize(): number {
    return this.autoBundleMempoolSize
  }

  getBundleInterval(): number {
    return this.autoBundleInterval
  }

  getPort(): number {
    return this.port
  }

  getEntryPointAdd(): string {
    return this.entryPointAdd
  }

  getConnectedWallet(): Wallet {
    return this.connectedWallet
  }

  getMempoolMode(): string {
    return this.mempoolMode
  }
  
  getProvider(): providers.JsonRpcProvider {
    return this.provider
  }

  getEntryPointContract(): ethers.Contract {
    return this.entryPointContract
  }

  getConditionalRpc(): boolean {
    return this.conditionalRpc
  }

  /**
   * for debugging/testing: clear current in-memory instance of MempoolManager
   */
  public resetInstance(): void {
    Config.instance = null
  }
}