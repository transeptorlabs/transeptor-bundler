import { createServer, Server } from 'http'

import cors from 'cors'
import { ethers } from 'ethers'
import express, { Request, Response } from 'express'
import helmet from 'helmet'

import { RpcMethodHandler } from '../json-rpc-handler/index.js'
import { Logger } from '../../../shared/logger/index.js'
import { ProviderService } from '../../../shared/provider/index.js'
import { JsonRpcRequest } from '../../../shared/types/index.js'

export class JsonrpcHttpServer {
  private app: express.Application
  private readonly httpServer: Server
  private readonly rpc: RpcMethodHandler 
  private readonly providerService: ProviderService 
  private readonly entryPointContract: ethers.Contract
  private readonly txMode: string
  private readonly isUnsafeMode: boolean
  private readonly port: number
  
  constructor(
    rpc: RpcMethodHandler, 
    providerService: ProviderService,
    entryPointContract: ethers.Contract,
    txMode: string,
    isUnsafeMode: boolean,
    port: number
  ) {
    this.rpc = rpc
    this.providerService = providerService
    this.entryPointContract = entryPointContract
    this.txMode = txMode
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

    this.app.post('/rpc', this.handleRequest.bind(this))

    this.httpServer = createServer(this.app)
  }

  private async preflightCheck(): Promise<void> {
    try {
      if (this.httpServer === undefined) {
        throw new Error('httpServer is undefined')
      }

      const { name, chainId } = await this.providerService.getNetwork()

      if (chainId === 31337 || chainId === 1337) {
        const isDeployed = await this.providerService.checkContractDeployment(this.entryPointContract.address)
        if (!isDeployed) {
          throw new Error('Entry point contract is not deployed to the network. Please use a pre-deployed contract or deploy the contract first if you are using a local network.')
        }
      }
      
      const bal = await this.providerService.getSignerBalance()
      if (bal.eq(0)) {
        throw new Error('Bundler signer account is not funded:')
      }

      if (this.txMode === 'conditional' && !await this.providerService.supportsRpcMethod('eth_sendRawTransactionConditional')) {
        throw new Error('(conditional mode requires connection to a node that support eth_sendRawTransactionConditional')
      }

      // full validation requires (debug_traceCall) method on eth node geth and can only be run in private and conditional txMode
      if (this.txMode === 'searcher' && !this.isUnsafeMode && !await this.providerService.supportsRpcMethod('debug_traceCall')) {
        throw new Error(`${this.txMode} mode does not support full validation. Full validation requires (debug_traceCall) method on eth node geth. For local UNSAFE mode: use --unsafe --txMode base or --unsafe --txMode conditional`)
      }

      Logger.info(
        {
          signerAddress: await this.providerService.getSignerAddress(),
          signerBalanceWei: bal.toString(),
          network: {chainId, name},
        },
        'Bundler passed preflight check'
      )
    } catch (err: any) {
      throw err
    }
  }

  async start(): Promise<void> {
    await this.preflightCheck()
    this.httpServer.listen(this.port, () => {
      Logger.info(`Bundler listening on http://localhost:${this.port}/rpc`)
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
}