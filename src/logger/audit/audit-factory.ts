import { withReadonly } from '../../utils/index.js'
import { AuditLogWriter } from '../../types/index.js'
import { createPinoAuditLogWriter } from './audit-log-writer.js'
import { Logger } from 'pino'

export type AuditLogConfig = Readonly<{
  backend: 'pino'
  destinationPath: string
  logger: Logger
}>

/**
 * Creates an audit log writer based on the provided configuration.
 *
 * @param config Configuration for the audit log writer.
 * @param config.backend The backend to use for audit logging (currently only 'pino').
 * @param config.destinationPath The file path where audit logs will be written.
 * @returns An instance of AuditLogWriter that can write user operation events.
 */
function _createAuditLogWriter(
  config: Readonly<AuditLogConfig>,
): AuditLogWriter {
  switch (config.backend) {
    case 'pino':
      return createPinoAuditLogWriter({
        destinationPath: config.destinationPath,
        logger: config.logger,
      })
    default:
      throw new Error(`Unknown audit log backend: ${config.backend}`)
  }
}

export const createAuditLogWriter = withReadonly<
  AuditLogConfig,
  AuditLogWriter
>(_createAuditLogWriter)
