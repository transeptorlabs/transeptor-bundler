import { createServer, Server } from 'http'
import cors from 'cors'
import express, { Request, Response } from 'express'
import helmet from 'helmet'

import { Logger } from '../logger/index.js'
import type {
  RpcServer,
  HandlerRegistry,
  RpcHandler,
  JsonRpcResponse,
  RpcError,
} from '../types/index.js'
import { createRpcHandler } from './rpc-handler.js'
import {
  headerChecks,
  parseValidRequest,
  validateRequest,
} from './rpc-middleware.js'
import { Either } from '../monad/index.js'

const safeParseHandlerResult = (
  res: Response,
  requestId: string | number,
  result: Either<RpcError, JsonRpcResponse>,
) => {
  result.fold(
    (error: RpcError) => {
      Logger.error(
        { error: error.message },
        `Error handling method requestId(${requestId})`,
      )
      res.json({
        jsonrpc: '2.0',
        id: requestId,
        error: {
          code: error.code,
          message: error.message,
          data: error.data,
        },
      })
    },
    (response: JsonRpcResponse) => res.json(response),
  )
}

const safeParseUnknownError = (
  res: Response,
  requestId: string | number,
  unknownError: any,
) => {
  Logger.error(
    { error: unknownError.message },
    `Unknown error handling method requestId(${requestId})`,
  )
  res.json({
    jsonrpc: '2.0',
    id: requestId,
    error: {
      code: typeof unknownError?.code === 'number' ? unknownError.code : -32000,
      message:
        typeof unknownError?.message === 'string'
          ? unknownError.message
          : 'Unknown error',
      data: unknownError.data,
    },
  })
}

const createApp = (
  rpc: RpcHandler,
  handlerRegistry: HandlerRegistry,
  supportedApiPrefixes: string[],
): express.Application => {
  const app = express()

  app.use(
    helmet({
      referrerPolicy: { policy: 'no-referrer-when-downgrade' },
    }),
  )
  app.use(cors())
  app.use(express.json())
  app.use(headerChecks)
  app.use(validateRequest(supportedApiPrefixes))
  app.use(parseValidRequest(handlerRegistry))

  app.post('/rpc', async (req: Request, res: Response) => {
    const request = req.parsedRpcRequest
    try {
      const result = await rpc.doHandleRequest(request)
      safeParseHandlerResult(res, request.id, result)
    } catch (unknownError: any) {
      safeParseUnknownError(res, request.id, unknownError)
    }
  })

  return app
}

export const createRpcServerWithHandlers = (
  handlerRegistry: HandlerRegistry,
  supportedApiPrefixes: string[],
  port: number,
): RpcServer => {
  const rpc = createRpcHandler()
  const app = createApp(rpc, handlerRegistry, supportedApiPrefixes)
  const httpServer: Server = createServer(app)

  return {
    start: async (preflightCheck: () => Promise<void>): Promise<void> => {
      try {
        await preflightCheck()
        httpServer.listen(port, () => {
          Logger.info(`Node listening on http://localhost:${port}/rpc`)
        })
      } catch (error: any) {
        Logger.error(
          { error: error?.message || 'Unknown error' },
          'Preflight check failed',
        )
        throw error
      }
    },

    stop: async (): Promise<void> => {
      Logger.info('Stopping server')
      return new Promise((resolve, reject) => {
        httpServer.close((err) => {
          if (err) {
            Logger.error({ error: err.message }, 'Failed to close server')
            reject(err)
          } else {
            resolve()
          }
        })
      })
    },
  }
}
