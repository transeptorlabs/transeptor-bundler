import { createServer, Server } from 'http'
import cors from 'cors'
import express, { Request, Response } from 'express'
import helmet from 'helmet'

import { Logger } from '../logger/index.js'
import { 
  JsonRpcRequest,
  RpcServer 
} from '../types/index.js'
import { RpcHandler } from './rpcHandler.js'

const createApp = (rpc: RpcHandler): express.Application => {
  const app = express()

  app.use(
    helmet({
      referrerPolicy: { policy: 'no-referrer-when-downgrade' },
    })
  )
  app.use(cors())
  app.use(express.json())

  app.post('/rpc', async (req: Request, res: Response) => {
    const request = req.body as JsonRpcRequest
    try {
      const response = await rpc.doHandleRequest(request)
      res.json(response)
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' })
    }
  })

  return app
}

/**
 * Creates an RPC HTTP server.
 * 
 * @param rpc - The handler for RPC method requests.
 * @param port - The port on which the server should listen.
 * @returns An object with `start` and `stop` methods to control the server.
 */
export const createRpcServer = (
  rpc: RpcHandler, 
  port: number
): RpcServer => {
  const app = createApp(rpc)
  const httpServer: Server = createServer(app)

  return {
    start: async (preflightCheck: () => Promise<void>): Promise<void> => {
      await preflightCheck()
      httpServer.listen(port, () => {
        Logger.info(`Bundler listening on http://localhost:${port}/rpc`)
      })
    },

    stop: async (): Promise<void> => {
      Logger.info('Stoping server')
      return new Promise((resolve, reject) => {
        httpServer.close((err) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      })
    }
  }
}
