import { Logger, pino } from 'pino'
import { AuditLogWriter, UserOpAuditEvent } from '../../types/index.js'
import { withReadonly } from '../../utils/index.js'

export type PinoAuditLogWriterConfig = {
  destinationPath: string
  logger: Logger
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
        auditLogger.info(event)
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
