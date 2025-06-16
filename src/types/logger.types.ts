import { Logger } from 'pino'
import { UserOperation } from './userop.types.js'

/**
 * Alias for the Pino logger.
 */
export type TranseptorLogger = Logger

export type LifecycleStage =
  | 'userOpReceived'
  | 'userOpValidationStarted'
  | 'userOpValidated'
  | 'userOpValidationFailed'
  | 'userOpSimulationStarted'
  | 'userOpSimulationCompleted'
  | 'userOpIncluded'
  | 'userOpSubmittedOnChain'
  | 'userOpOnChainReceipt'
  | 'userOpRejected'

export type UserOpAuditEvent = Readonly<{
  kind: string
  timestamp: string
  clientVersion: string
  nodeCommitHash: string
  data: {
    lifecycleStage: LifecycleStage
    userOpHash: string
    userOp: UserOperation
    entryPoint: string
    chainId: string
    details: Record<string, unknown>
  }
}>

export type AuditLogQueue = {
  enqueue: (event: UserOpAuditEvent) => Promise<void>
  shutdown: () => Promise<void>
}

export interface AuditLogWriter {
  write(event: UserOpAuditEvent): Promise<void>
  healthCheck(): Promise<boolean>
}

export type LogUserOpLifecycleEvent = (
  eventType: LifecycleStage,
  userOp: UserOperation,
  chainId: string,
  userOpHash: string,
  entryPoint: string,
  details?: Record<string, unknown>,
) => Promise<void>

export type AuditLogger = {
  logUserOpLifecycleEvent: LogUserOpLifecycleEvent
  shutdown: () => Promise<void>
}
