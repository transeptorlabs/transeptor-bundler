import dotenv from 'dotenv'
import { pino, LoggerOptions } from 'pino'
dotenv.config()

const createLogger = () => {
  let logLevel = process.env.TRANSEPTOR_LOG_LEVEL
  if (!logLevel) {
    logLevel =
      process.env.TRANSEPTOR_LOG_LEVEL === 'production' ? 'info' : 'debug'
  }

  const options: LoggerOptions = {
    level: logLevel,
    formatters: {
      level: (label) => {
        return { level: label.toUpperCase() }
      },
    },
    redact: [
      // Specify the field(s) to redact(client's IP address information will be redacted from the log output)
      'req.headers.authorization',
      'req.remoteAddress',
    ],
  }

  return pino(options)
}
export const Logger = createLogger()
