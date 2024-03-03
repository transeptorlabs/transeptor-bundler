import express, { Request, Response } from 'express'
import { createServer, Server } from 'http'
import helmet from 'helmet'
import cors from 'cors'
import { JsonRpcRequest } from 'types'
import { Logger } from 'logger'

export class MetricsHttpServer {
  private app: express.Application
  private readonly httpServer: Server
  private readonly port: number
  
  constructor(port: number) {
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

    this.app.get('/metrics', this.handleRequest.bind(this))

    this.httpServer = createServer(this.app)
  }

  private async preflightCheck(): Promise<void> {
    try {
      if (this.httpServer === undefined) {
        throw new Error('httpServer is undefined')
      }

      // TODO: check that there is a connect to db
    
      Logger.info('Bundler passed metrics server preflight check')
    } catch (err: any) {
      throw err
    }
  }

  async start(): Promise<void> {
    await this.preflightCheck()
    this.httpServer.listen(this.port, () => {
      Logger.info(`Bundler listening on http://localhost:${this.port}/metrics`)
    })
  }

  async stop(): Promise<void> {
    Logger.info('Stopping metrics server')
    this.httpServer.close()
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    const request = req.body as JsonRpcRequest
    res.json({
        jsonrpc: '2.0',
        id: request.id,
        result: 'ok',
    })
  }
}