import dotenv from 'dotenv'
import pino, { LoggerOptions } from 'pino'
dotenv.config()

const createLogger = () => {
  const options: LoggerOptions = {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
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
