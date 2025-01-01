import { createServer, Server } from 'http'
import cors from 'cors'
import express, { Request, Response } from 'express'
import helmet from 'helmet'

import { Logger } from '../logger/index.js'
import type {
  JsonRpcRequest,
  RpcServer,
  HandlerRegistry,
  RpcHandler,
  JsonRpcErrorResponse,
  JsonRpcResponse,
} from './rpc.types.js'
import { createRpcHandler } from './rpc-handler.js'
import { Either } from '../monad/index.js'
import { RpcError } from '../utils/index.js'

const createApp = (rpc: RpcHandler): express.Application => {
  const app = express()

  app.use(
    helmet({
      referrerPolicy: { policy: 'no-referrer-when-downgrade' },
    }),
  )
  app.use(cors())
  app.use(express.json())

  app.post('/rpc', async (req: Request, res: Response) => {
    const request = req.body as JsonRpcRequest
    const errorRes: JsonRpcErrorResponse = {
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: -32000,
        message: 'Unknown error',
        data: undefined,
      },
    }
    Logger.debug(
      `---> Handling valid request for ${request.method} with requestId(${request.id})`,
    )
    const result = await rpc.doHandleRequest(request).catch((error) => {
      Logger.error(
        { error: error.message },
        `Unknown error handling method requestId(${request.id})`,
      )
      return Either.Left<RpcError, JsonRpcResponse>(
        new RpcError(
          error.message ? error.message : errorRes.error.message,
          error.code ? error.code : errorRes.error.code,
          error.data,
        ),
      )
    })

    result.fold(
      (error: RpcError) =>
        res.json({
          ...errorRes,
          error: {
            code: error.code,
            message: error.message,
            data: error.data,
          },
        }),
      (response: JsonRpcResponse) => res.json(response),
    )
  })

  return app
}

export const createRpcServerWithHandlers = (
  handlerRegistry: HandlerRegistry,
  supportedApiPrefixes: string[],
  port: number,
): RpcServer => {
  const rpc = createRpcHandler(handlerRegistry, supportedApiPrefixes)
  const app = createApp(rpc)
  const httpServer: Server = createServer(app)

  return {
    start: async (preflightCheck: () => Promise<void>): Promise<void> => {
      await preflightCheck()
      httpServer.listen(port, () => {
        Logger.info(`Node listening on http://localhost:${port}/rpc`)
      })
    },

    stop: async (): Promise<void> => {
      Logger.info('Stopping server')
      return new Promise((resolve, reject) => {
        httpServer.close((err) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      })
    },
  }
}
