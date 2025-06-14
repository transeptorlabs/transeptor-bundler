import { withReadonly } from '../../utils/index.js'
import {
  AuditLogWriter,
  UserOpAuditEvent,
  AuditLogQueue,
} from '../../types/index.js'
import { Logger } from 'pino'

export type AuditLogQueueConfig = {
  auditLogWriter: AuditLogWriter
  flushIntervalMs: number
  logger: Logger
}

/**
 * Creates an audit log queue that processes user operation audit events.
 * The queue collects events and writes them to the specified audit log writer
 * at regular intervals.
 *
 * @param config Configuration for the audit log queue.
 * @returns An instance of AuditLogQueue that can enqueue events and shutdown the queue.
 */
function _createAuditLogQueue(config: AuditLogQueueConfig): AuditLogQueue {
  let activeQueue: UserOpAuditEvent[] = []
  let drainQueue: UserOpAuditEvent[] = []
  let running = true
  const { auditLogWriter, logger } = config

  const drain = async (): Promise<void> => {
    drainQueue = activeQueue
    activeQueue = []

    for (const event of drainQueue) {
      try {
        auditLogWriter.write(event)
      } catch (err) {
        logger.error(
          { err, event },
          'Failed to write audit log event. Continuing with next event.',
        )
      }
    }

    drainQueue = []
  }

  /**
   * Worker function that processes the audit log queue.
   * It drains the queue at regular intervals defined by `flushIntervalMs`.
   * If the queue is empty, it waits for the next interval.
   */
  const worker = async (): Promise<void> => {
    while (running) {
      await drain()
      await new Promise((resolve) =>
        setTimeout(resolve, config.flushIntervalMs),
      )
    }
    await drain()
  }

  // Start the worker immediately
  worker()

  return {
    enqueue: (event: UserOpAuditEvent): void => {
      activeQueue.push(event)
    },
    shutdown: async (): Promise<void> => {
      running = false
    },
  }
}

export const createAuditLogQueue = withReadonly<
  AuditLogQueueConfig,
  AuditLogQueue
>(_createAuditLogQueue)
