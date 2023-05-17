import express, { Request, Response } from 'express'
import { createServer, Server } from 'http'
import helmet from 'helmet'
import cors from 'cors'
import { ProviderService } from '../provider'
import { RpcMethodHandler } from '../json-rpc-handler'
import { JsonRpcRequest } from '../types'
import { Config } from '../config'

export class JsonrpcHttpServer {
  private app: express.Application
  private readonly httpServer: Server
  private readonly rpc: RpcMethodHandler = new RpcMethodHandler()
  private readonly providerService: ProviderService = new ProviderService()

  constructor() {
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
        const isDeployed = await this.providerService.checkContractDeployment(Config.entryPointAddr)
        if (!isDeployed) {
          this.fatalError(new Error('Entry point contract is not deployed to the network run - `npm run deploy:local` to deploy it locally.'))
        }
      }
      
      const bal = await Config.connectedWallet.getBalance()
      if (bal.eq(0)) {
        this.fatalError(new Error('Bundler signer account is not funded:'))
      }

      if (Config.isConditionalTxMode() && !await this.providerService.supportsRpcMethod('eth_sendRawTransactionConditional')) {
        this.fatalError(new Error(`(${Config.txMode}) mode requires connection to a node that support eth_sendRawTransactionConditional`))
      }

      // full validation requires (debug_traceCall) method on eth node geth or alchemy debug_traceCall API (for local UNSAFE mode: use --unsafe)
      if (!Config.isUnsafeMode && !await this.providerService.supportsRpcMethod('debug_traceCall')) {
        this.fatalError(new Error('Full validation requires (debug_traceCall) method on eth node geth or alchemy debug_traceCall API. For local UNSAFE mode: use --unsafe'))
      }

      console.log('Bundler passed preflight check', {
        accountBalance: bal.toString(),
        network: {chainId, name},
        bundleInterval: `${Config.autoBundleInterval}(ms)`,
        entrypoint: Config.entryPointAddr,
        mode: Config.txMode,
        rpcProviderSupportsDebugTraceCall: true
      })
    } catch (err: any) {
      this.fatalError(err)
    }
  }

  async start(): Promise<void> {
    await this.preflightCheck()
    this.httpServer.listen(Config.port, () => {
      console.log(`running on http://localhost:${Config.port}/v1`)
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