import { pino } from 'pino'
import {
  AuditLogWriter,
  UserOpAuditEvent,
  TranseptorLogger,
} from '../../types/index.js'
import { withReadonly } from '../../utils/index.js'
import fs from 'fs'
import path from 'path'

export type PinoAuditLogWriterConfig = {
  destinationPath: string
  logger: TranseptorLogger
}

/**
 * Creates a Pino-based audit log writer that writes user operation events to a specified file.
 *
 * @param config Configuration for the Pino audit log writer.
 * @returns An instance of AuditLogWriter that can write user operation events.
 */
function _createPinoAuditLogWriter(
  config: Readonly<PinoAuditLogWriterConfig>,
): AuditLogWriter {
  const { destinationPath, logger } = config
  // if the destinationPath is a file, we need to create the file if it doesn't exist
  const dir = path.dirname(destinationPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const destination = pino.destination({
    dest: destinationPath,
    sync: true,
  })

  const auditLogger = pino(
    {
      level: 'info',
      timestamp: pino.stdTimeFunctions.isoTime,
      base: null,
    },
    destination,
  )

  return {
    write: async (event: UserOpAuditEvent) => {
      try {
        // ensure all sensitive data  about the userOps intent is redacted before logging
        const redactedEvent = {
          ...event,
          data: {
            ...event.data,
            userOp: {
              ...event.data.userOp,
              signature: '0x_REDACTED',
              callData: '0x_REDACTED',
              factoryData: '0x_REDACTED',
              eip7702Auth: '0x_REDACTED',
            },
          },
        }

        auditLogger.info(redactedEvent)
      } catch (err) {
        logger.error(
          { err, event },
          `Failed to write audit log event to ${destinationPath}.`,
        )
      }
    },
    healthCheck: async () => {
      return true
    },
  }
}

export const createPinoAuditLogWriter = withReadonly<
  PinoAuditLogWriterConfig,
  AuditLogWriter
>(_createPinoAuditLogWriter)
