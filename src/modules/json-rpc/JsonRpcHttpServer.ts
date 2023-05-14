import express, { Request, Response } from 'express'
import { createServer, Server } from 'http'
import helmet from 'helmet'
import cors from 'cors'
import { Config } from '../Config'
import { JsonRpcRequest, RpcMethodHandler } from './RpcMethodHandler.ts'
import { checkContractDeployment } from '../../utils'

export class JsonrpcHttpServer {
  private app: express.Application
  private readonly httpServer: Server
  private readonly rpc: RpcMethodHandler = new RpcMethodHandler()

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

      const provider = Config.getInstance().getProvider()
      const { name, chainId } = await provider.getNetwork()
    
      if (chainId === 31337 || chainId === 1337) {
        const isDeployed = await checkContractDeployment(Config.getInstance().getEntryPointAdd(), provider)
        if (!isDeployed) {
          this.fatalError(new Error('Entry point contract is not deployed to the network run - `npm run deploy:local` to deploy it locally.'))
        }
      }
      
      const bal = await Config.getInstance().getConnectedWallet().getBalance()
      if (bal.eq(0)) {
        this.fatalError(new Error('Bundler signer account is not funded'))
      }

      console.log('Bundler signer account balance:', bal.toString())
      console.log('Connected to eth-client network:', {chainId, name})
    } catch (err: any) {
      this.fatalError(err)
    }
  }

  async start(): Promise<void> {
    await this.preflightCheck()
    this.httpServer.listen(Config.getInstance().getPort(), () => {
      console.log(`running on http://localhost:${Config.getInstance().getPort()}/v1`)
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