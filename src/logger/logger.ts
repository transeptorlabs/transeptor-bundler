import dotenv from 'dotenv'
import { pino, LoggerOptions, Logger as PinoLogger } from 'pino'
import { AsyncLocalStorage } from 'async_hooks'

dotenv.config()

export type RequestContext = {
  requestId: string
}

const createLogger = (): PinoLogger => {
  let logLevel = process.env.TRANSEPTOR_LOG_LEVEL
  if (!logLevel) {
    logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug'
  }

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
export const Logger = createLogger()

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>()

/**
 * Returns a logger enriched with requestId (if set).
 *
 * @returns the root logger if no requestId is available.
 */
function getRequestLogger(): PinoLogger {
  const context = asyncLocalStorage.getStore()
  if (!context?.requestId) return Logger
  return Logger.child({ requestId: context.requestId })
}

/**
 * Create a child logger with a given module name for scoped logging.
 *
 * @param moduleName - Name of the module (e.g., 'auth', 'bundler').
 * @returns A Pino logger with module context.
 */
export function withModuleContext(moduleName: string): PinoLogger {
  const baseLogger = getRequestLogger()
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
