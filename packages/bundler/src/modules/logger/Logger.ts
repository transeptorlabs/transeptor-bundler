import pino from 'pino'
import { LoggerOptions } from 'pino'
import dotenv from 'dotenv'
dotenv.config()

class Logger {
  private static instance: pino.Logger

  private constructor() {
    //
  }

  public static getInstance(): pino.Logger {
    if (!Logger.instance) {
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

      Logger.instance = pino(options)
    }

    return Logger.instance
  }
}

const loggerInstance = Logger.getInstance()
export { loggerInstance as Logger }
