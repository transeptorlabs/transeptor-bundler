import express, { Request, Response } from 'express'
import { createServer, Server } from 'http'
import helmet from 'helmet'
import cors from 'cors'
import { Wallet, ethers } from 'ethers'
import { ProviderService } from '../provider'
import { RpcMethodHandler } from '../json-rpc-handler'
import { JsonRpcRequest } from '../types'


export class JsonrpcHttpServer {
  private app: express.Application
  private readonly httpServer: Server
  private readonly rpc: RpcMethodHandler 
  private readonly providerService: ProviderService 
  private readonly entryPointContract: ethers.Contract
  private readonly connectedWallet: Wallet
  private readonly isConditionalTxMode: boolean
  private readonly isUnsafeMode: boolean
  private readonly port: number
  
  constructor(
    rpc: RpcMethodHandler, providerService: ProviderService,
    entryPointContract: ethers.Contract,
    connectedWallet: Wallet,
    isConditionalTxMode: boolean,
    isUnsafeMode: boolean,
    port: number
  ) {
    this.rpc = rpc
    this.providerService = providerService
    this.entryPointContract = entryPointContract
    this.connectedWallet = connectedWallet
    this.isConditionalTxMode = isConditionalTxMode
    this.isUnsafeMode = isUnsafeMode
    this.port = port

    // init express app
    this.app = express()
    this.app.use(
      helmet({
        referrerPolicy: { policy: 'no-referrer-when-downgrade' },
      })
    )
    this.app.use(cors())
    this.app.use(express.json())

    this.app.post('/v1', this.handleRequest.bind(this))

    this.httpServer = createServer(this.app)
  }

  private async preflightCheck(): Promise<void> {
    try {
      if (this.httpServer === undefined) {
        this.fatalError(new Error('httpServer is undefined'))
      }

      const { name, chainId } = await this.providerService.getNetwork()
    
      if (chainId === 31337 || chainId === 1337) {
        const isDeployed = await this.providerService.checkContractDeployment(this.entryPointContract.address)
        if (!isDeployed) {
          this.fatalError(new Error('Entry point contract is not deployed to the network run - `npm run deploy:local` to deploy it locally.'))
        }
      }
      
      const bal = await this.connectedWallet.getBalance()
      if (bal.eq(0)) {
        this.fatalError(new Error('Bundler signer account is not funded:'))
      }

      if (this.isConditionalTxMode && !await this.providerService.supportsRpcMethod('eth_sendRawTransactionConditional')) {
        this.fatalError(new Error('(conditional mode requires connection to a node that support eth_sendRawTransactionConditional'))
      }

      // full validation requires (debug_traceCall) method on eth node geth or alchemy debug_traceCall API (for local UNSAFE mode: use --unsafe)
      if (!this.isUnsafeMode && !await this.providerService.supportsRpcMethod('debug_traceCall')) {
        this.fatalError(new Error('Full validation requires (debug_traceCall) method on eth node geth or alchemy debug_traceCall API. For local UNSAFE mode: use --unsafe'))
      }

      console.log('________________Bundler passed preflight check________________\n', 
        {
          signerBalanceWei: bal.toString(),
          network: {chainId, name},
          rpcProviderSupportsDebugTraceCall: true,
        },
        '\n______________________________________________________________'
      )
    } catch (err: any) {
      this.fatalError(err)
    }
  }

  async start(): Promise<void> {
    await this.preflightCheck()
    this.httpServer.listen(this.port, () => {
      console.log(`running on http://localhost:${this.port}/v1`)
    })
  }

  async stop(): Promise<void> {
    this.httpServer.close()
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    const request = req.body as JsonRpcRequest
    const response = await this.rpc.doHandleRequest(request)
    res.json(response)
  }

  private fatalError(err: Error): void {
    console.error('FATAL:', err.message)
    process.exit(1)
  }
}