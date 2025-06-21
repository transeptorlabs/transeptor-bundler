import { createServer, Server } from 'http'

import cors from 'cors'
import express, { Request, Response } from 'express'
import helmet from 'helmet'

import type {
  HandlerRegistry,
  JsonRpcResponse,
  RpcError,
  RpcServer,
  TranseptorLogger,
} from '../types/index.js'
import { withReadonly } from '../utils/index.js'

import {
  headerChecks,
  parseValidRequest,
  validateRequest,
} from './rpc-middleware.js'
import { doHandleRequest } from './rpc-server.helper.js'

export type RpcServerConfig = {
  handlerRegistry: HandlerRegistry
  supportedApiPrefixes: string[]
  port: number
  logger: TranseptorLogger
}

/**
 * Creates an instance of the RpcServer module.
 *
 * @param config - The configuration object for the RpcServer instance.
 * @returns An instance of the RpcServer module.
 */
function _createRpcServerWithHandlers(
  config: Readonly<RpcServerConfig>,
): RpcServer {
  const { supportedApiPrefixes, port, handlerRegistry, logger } = config

  /**
   * Creates an express application for the RPC server.
   *
   * @param handlerRegistry - The handler registry for the RPC server.
   * @param supportedApiPrefixes - The supported API prefixes for the RPC server.
   * @returns An express application for the RPC server.
   */
  function createApp(
    handlerRegistry: HandlerRegistry,
    supportedApiPrefixes: string[],
  ): express.Application {
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
      if (!request) {
        res.json({
          jsonrpc: '2.0',
          id: req.body.id,
          error: {
            code: -32600,
            message: 'Invalid Request',
            data: 'Invalid request',
          },
        })
        return
      }

      try {
        logger.debug(
          `---> Handling valid request for ${request.method} with requestId(${request.id})`,
        )
        const result = await doHandleRequest(request)
        result.fold(
          (error: RpcError) => {
            logger.error(
              { error: error.message },
              `<--- Error handling method requestId(${request.id})`,
            )
            res.json({
              jsonrpc: '2.0',
              id: request.id,
              error: {
                code: error.code,
                message: error.message,
                data: error.data,
              },
            })
          },
          (response: JsonRpcResponse) => {
            logger.debug(
              `<--- Successfully handled method requestId(${request.id})`,
            )
            return res.json(response)
          },
        )
      } catch (unknownError: any) {
        logger.error(
          { error: unknownError.message },
          `<--- Unknown error handling method requestId(${request.id})`,
        )
        res.json({
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code:
              typeof unknownError?.code === 'number'
                ? unknownError.code
                : -32000,
            message:
              typeof unknownError?.message === 'string'
                ? unknownError.message
                : 'Unknown error',
            data: unknownError.data,
          },
        })
      }
    })

    return app
  }

  const app = createApp(handlerRegistry, supportedApiPrefixes)
  const httpServer: Server = createServer(app)

  return {
    start: async (preflightCheck: () => Promise<void>): Promise<void> => {
      try {
        await preflightCheck()
        httpServer.listen(port, () => {
          logger.info(`Node listening on http://localhost:${port}/rpc`)
        })
      } catch (error: any) {
        logger.error(
          { error: error?.message || 'Unknown error' },
          'Preflight check failed',
        )
        throw error
      }
    },

    stop: async (): Promise<void> => {
      logger.info('Stopping server')
      return new Promise((resolve, reject) => {
        httpServer.close((err) => {
          if (err) {
            logger.error({ error: err.message }, 'Failed to close server')
            reject(err)
          } else {
            resolve()
          }
        })
      })
    },
  }
}

export const createRpcServerWithHandlers = withReadonly<
  RpcServerConfig,
  RpcServer
>(_createRpcServerWithHandlers)
