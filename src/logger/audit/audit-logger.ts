import {
  AuditLogQueue,
  UserOpAuditEvent,
  LifecycleStage,
  UserOperation,
  AuditLogger,
} from '../../types/index.js'
import { withReadonly } from '../../utils/index.js'

export type AuditLoggerDeps = {
  auditLogQueue: AuditLogQueue
  clientVersion: string
  nodeCommitHash: string

  /**
   * The environment in which the logger is running, e.g., 'production', 'development'.
   * This is used to control whether events are logged based on the environment.
   */
  environment: string
}

/**
 * Creates an audit logger that writes user operation events to a specified log writer.
 *
 * @param deps Dependencies for the audit logger.
 * @param deps.auditLogWriter The audit log writer to use for writing events.
 * @param deps.clientVersion The version of the bundler.
 * @param deps.nodeCommitHash The commit hash of the node.
 * @returns An instance of AuditLogger that can log user operation events.
 */
function _createAuditLogger(deps: Readonly<AuditLoggerDeps>): AuditLogger {
  const { clientVersion, nodeCommitHash, auditLogQueue, environment } = deps

  return {
    logUserOpLifecycleEvent: async (eventInput: {
      lifecycleStage: LifecycleStage
      chainId: number
      userOp: UserOperation
      userOpHash: string
      entryPoint: string
      details?: Record<string, unknown>
    }): Promise<void> => {
      const {
        lifecycleStage,
        chainId,
        userOp,
        userOpHash,
        entryPoint,
        details,
      } = eventInput
      if (environment !== 'production') {
        // only log in production so that we don't clutter the logs in development
        return
      }
      const event: UserOpAuditEvent = {
        timestamp: new Date().toISOString(),
        kind: 'userOp-lifecycle',
        clientVersion,
        nodeCommitHash,
        data: {
          lifecycleStage,
          userOpHash,
          userOp,
          chainId,
          entryPoint,
          details,
        },
      }
      auditLogQueue.enqueue(event)
    },
    shutdown: auditLogQueue.shutdown,
  }
}

export const createAuditLogger = withReadonly<AuditLoggerDeps, AuditLogger>(
  _createAuditLogger,
)
