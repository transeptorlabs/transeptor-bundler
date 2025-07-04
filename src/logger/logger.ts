import { AsyncLocalStorage } from 'async_hooks'

import { pino, LoggerOptions } from 'pino'

import { TranseptorLogger } from '../types/index.js'

export type RequestContext = {
  requestId: string
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>()

/**
 * Returns a logger enriched with requestId (if set).
 *
 * @param logger - The base logger to enrich.
 * @returns the root logger if no requestId is available.
 */
function getRequestLogger(logger: TranseptorLogger): TranseptorLogger {
  const context = asyncLocalStorage.getStore()
  if (!context?.requestId) return logger
  return logger.child({ requestId: context.requestId })
}

/**
 * Create a child logger with a given module name for scoped logging.
 *
 * @param moduleName - Name of the module (e.g., 'auth', 'bundler').
 * @param logger - The base logger to enrich.
 * @returns A Pino logger with module context.
 */
export function withModuleContext(
  moduleName: string,
  logger: TranseptorLogger,
): TranseptorLogger {
  const baseLogger = getRequestLogger(logger)
  return baseLogger.child({ module: moduleName })
}

/**
 * Use this inside a request lifecycle (e.g., Express middleware).
 *
 * @param context - The request context containing a unique requestId.
 */
export function setBaseLoggerRequestContext(context: RequestContext) {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  asyncLocalStorage.run(context, () => {})
}

/**
 * Create a logger instance.
 *
 * @param logLevel - The log level to use.
 * @returns A Pino logger instance.
 */
export function createLogger(logLevel: string): TranseptorLogger {
  const options: LoggerOptions = {
    level: logLevel,
    formatters: {
      level: (label) => {
        return { level: label.toUpperCase() }
      },
    },
    redact: ['req.headers.authorization', 'req.remoteAddress'],
  }

  return pino(options)
}
