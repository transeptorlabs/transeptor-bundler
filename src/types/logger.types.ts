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
    userOp: UserOpRedacted
    entryPoint: string
    chainId: number
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

/**
 * Redacts the signature and callData from the userOp to avoid logging sensitive data about the userOp intent.
 */
export type UserOpRedacted = Omit<
  UserOperation,
  'signature' | 'callData' | 'factoryData' | 'eip7702Auth'
>

export type LogUserOpLifecycleEvent = (eventInput: {
  lifecycleStage: LifecycleStage

  /**
   * The chain ID in Hex format.
   */
  chainId: number
  userOpHash: string
  entryPoint: string
  userOp: UserOperation
  details?: Record<string, unknown>
}) => Promise<void>

export type AuditLogger = {
  logUserOpLifecycleEvent: LogUserOpLifecycleEvent
  shutdown: () => Promise<void>
}
