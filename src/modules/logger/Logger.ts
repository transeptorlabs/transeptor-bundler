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
        level: process.env.PINO_LOG_LEVEL || 'info',
      }

      Logger.instance = pino(options)
    }

    return Logger.instance
  }
}

const loggerInstance = Logger.getInstance()
export { loggerInstance as Logger }
