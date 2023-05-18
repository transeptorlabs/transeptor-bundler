import { Command } from 'commander'
import { OptionValues } from 'commander'
import { Wallet, ethers, providers } from 'ethers'
import packageJson from '../../../package.json'
import { isValidAddress } from '../utils'
import dotenv from 'dotenv'
dotenv.config()

class Config {
  private static instance: Config | undefined = undefined
  private DEFAULT_NETWORK = 'http://localhost:8545'
  private DEFAULT_ENTRY_POINT = '0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789'
  private SUPPORTED_MODES = ['private', 'private-conditional', 'public-conditional', 'private-searcher', 'public-searcher']
  private ENTRY_POINT_ABI = [  
    {
      'inputs': [
        {
          'components': [
            {
              'internalType': 'address',
              'name': 'sender',
              'type': 'address'
            },
            {
              'internalType': 'uint256',
              'name': 'nonce',
              'type': 'uint256'
            },
            {
              'internalType': 'bytes',
              'name': 'initCode',
              'type': 'bytes'
            },
            {
              'internalType': 'bytes',
              'name': 'callData',
              'type': 'bytes'
            },
            {
              'internalType': 'uint256',
              'name': 'callGasLimit',
              'type': 'uint256'
            },
            {
              'internalType': 'uint256',
              'name': 'verificationGasLimit',
              'type': 'uint256'
            },
            {
              'internalType': 'uint256',
              'name': 'preVerificationGas',
              'type': 'uint256'
            },
            {
              'internalType': 'uint256',
              'name': 'maxFeePerGas',
              'type': 'uint256'
            },
            {
              'internalType': 'uint256',
              'name': 'maxPriorityFeePerGas',
              'type': 'uint256'
            },
            {
              'internalType': 'bytes',
              'name': 'paymasterAndData',
              'type': 'bytes'
            },
            {
              'internalType': 'bytes',
              'name': 'signature',
              'type': 'bytes'
            }
          ],
          'internalType': 'struct UserOperation[]',
          'name': 'ops',
          'type': 'tuple[]'
        },
        {
          'internalType': 'address payable',
          'name': 'beneficiary',
          'type': 'address'
        }
      ],
      'name': 'handleOps',
      'outputs': [],
      'stateMutability': 'nonpayable',
      'type': 'function'
    }
  ]

  public readonly provider: providers.JsonRpcProvider
  public readonly connectedWallet: Wallet
  public readonly entryPointAddr: string
  public readonly beneficiaryAddr: string
  public readonly entryPointContract: ethers.Contract

  public readonly autoBundleInterval: number
  public readonly bundleSize: number
  public readonly isAutoBundle: boolean
  public readonly maxMempoolSize: number = 100

  public readonly port: number
  public readonly txMode: string
  public readonly clientVersion: string
  public readonly isUnsafeMode: boolean

  private constructor() {
    const program = new Command()
    program
    .version(`${packageJson.version}`)
    .option('--network <string>', 'eth client url', `${this.DEFAULT_NETWORK}`)
    .option('--entryPoint <string>', 'supported entry point address', this.DEFAULT_ENTRY_POINT)
    .option('--auto', 'automatic bundling', false)
    .option('--autoBundleInterval <number>', 'auto bundler interval in (ms)', '120000')
    .option('--bundleSize <number>', 'mempool bundle size', '5')
    .option('--port <number>', 'server listening port', '3000')
    .option('--txMode <string>', 'bundler transaction mode (private, private-conditional, public-conditional, private-searcher, public-searcher)', 'private')
    .option('--unsafe', 'UNSAFE mode: no storage or opcode checks (safe mode requires debug_traceCall support on eth node)', false)

    const programOpts: OptionValues = program.parse(process.argv).opts()
        
    if (this.SUPPORTED_MODES.indexOf(programOpts.txMode as string) === -1) {      
      throw new Error('Invalid bundler mode')
    }

    if (!isValidAddress(programOpts.entryPoint as string)) {
      throw new Error('Entry point not a valid address')
    }

    if (programOpts.txMode as string === 'private-searcher' || programOpts.txMode as string === 'public-searcher') {
      if (!process.env.ALCHEMY_API_KEY) {
        throw new Error('ALCHEMY_API_KEY env var not set')
      }
      this.provider = this.getNetworkProvider(programOpts.network as string, process.env.ALCHEMY_API_KEY)
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

    this.connectedWallet = Wallet.fromMnemonic(process.env.MNEMONIC).connect(this.provider)
    this.entryPointAddr = programOpts.entryPoint as string
    this.beneficiaryAddr = process.env.BENEFICIARY as string
    this.entryPointContract = new ethers.Contract(this.entryPointAddr, this.ENTRY_POINT_ABI, this.connectedWallet)

    this.autoBundleInterval = parseInt(programOpts.autoBundleInterval as string)
    this.bundleSize = parseInt(programOpts.bundleSize as string)
    this.isAutoBundle = programOpts.auto as boolean

    this.port = parseInt(programOpts.port as string)
    this.txMode = programOpts.txMode as string
    this.clientVersion = packageJson.version as string
    this.isUnsafeMode = programOpts.unsafe as boolean

    console.log('Done init Config global')
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
    return apiKey ? new providers.JsonRpcProvider(`${url.replace(/\/+$/, '')}/${apiKey}`) : new providers.JsonRpcProvider(url)
  }

  private isValidUrl(url: string): boolean {
    const pattern = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/
    return pattern.test(url)
  }

  isbaseTxMode(): boolean {
    return this.txMode === 'private'
  }

  isConditionalTxMode(): boolean {
    return this.txMode === 'public-conditional' || this.txMode === 'private-conditional'
  }

  isSearcherTxMode(): boolean {
    return this.txMode === 'public-searcher' || this.txMode === 'private-searcher'
  }
}

const configInstance = Config.getInstance()
export { configInstance as Config }