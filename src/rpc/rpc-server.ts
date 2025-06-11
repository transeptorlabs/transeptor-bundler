import { createServer, Server } from 'http'

import { Logger } from '../logger/index.js'
import type { HandlerRegistry, RpcServer } from '../types/index.js'
import { createApp } from './rpc-server.helper.js'
import { withReadonly } from '../utils/index.js'

export type RpcServerConfig = {
  handlerRegistry: HandlerRegistry
  supportedApiPrefixes: string[]
  port: number
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
  const { supportedApiPrefixes, port, handlerRegistry } = config

  const app = createApp(handlerRegistry, supportedApiPrefixes)
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

export const createRpcServerWithHandlers = withReadonly<
  RpcServerConfig,
  RpcServer
>(_createRpcServerWithHandlers)
