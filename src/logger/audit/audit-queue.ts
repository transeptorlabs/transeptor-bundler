import { Mutex, Semaphore } from 'async-mutex'
import { withReadonly } from '../../utils/index.js'
import {
  AuditLogWriter,
  UserOpAuditEvent,
  AuditLogQueue,
  TranseptorLogger,
} from '../../types/index.js'

/**
 * Configuration options for the audit log queue.
 */
export type AuditLogQueueConfig = {
  auditLogWriter: AuditLogWriter
  logger: TranseptorLogger

  /**
   * Interval (in milliseconds) at which the queue will flush logs to the writer.
   * Shorter intervals improve flush latency but consume more CPU cycles.
   *
   * Recommended: 50-200ms depending on system load.
   */
  flushIntervalMs: number

  /**
   * Maximum buffer size for the audit log queue.
   * This value defines how many audit events can be enqueued before backpressure is applied.
   *
   * Recommended values:
   * - Low TPS (dev/test/small bundlers): 500 - 1,000
   * - Medium TPS (small production): 5,000 - 10,000
   * - High TPS (institutional): 25,000+
   *
   */
  bufferCapacity: number
}

/**
 * Creates an Audit Log Queue module that implements a fixed-capacity audit log queue based on the **classic Producer-Consumer Problem** (also known as the Bounded Buffer Problem)
 * The queue collects audit events and writes them to the specified audit log writer
 * at regular intervals.
 *
 * The system provides:
 * - Strict concurrency control via Semaphores and Mutexes.
 * - Deterministic memory usage via fixed bufferCapacity.
 * - Automatic backpressure applied to producers if the queue fills.
 * - Full audit durability: no dropped logs under normal operation.
 *
 * ⚠ Note: enqueue() will block if buffer capacity is exceeded.
 * Ensure bufferCapacity is properly sized to handle anticipated burst load.
 *
 * @param config The configuration for the audit log queue.
 * @returns An instance of AuditLogQueue that can enqueue events and shutdown the queue.
 */
function _createAuditLogQueue(config: AuditLogQueueConfig): AuditLogQueue {
  const { auditLogWriter, logger, bufferCapacity } = config

  // Circular buffer for storing audit events
  const eventBuffer: (UserOpAuditEvent | null)[] =
    Array(bufferCapacity).fill(null)
  let eventBufferHead = 0
  let eventBufferTail = 0

  const emptySlots = new Semaphore(bufferCapacity)
  const bufferLock = new Mutex()

  let running = true

  /**
   * Enqueues a new audit log event into the bounded buffer.
   * This function will block if the buffer is full until capacity becomes available.
   *
   * @param event The audit event to enqueue.
   *
   * **TODO: Improve Bounded Producer-Consumer Solution**
   *
   * Blocking the consumer running business logic is not ideal.
   * We should explore options to have a hybrid model as a Elastic Buffer with Early‑Flush Back‑pressure.
   *
   * Goal:
   * - Never drop events (durability).
   * - Never block producers (enqueue returns immediately).
   * - Still apply soft back‑pressure by flushing sooner and emitting metrics when you overflow.
   */
  const enqueue = async (event: UserOpAuditEvent): Promise<void> => {
    await emptySlots.acquire() // wait if no empty slots

    const release = await bufferLock.acquire()
    try {
      eventBuffer[eventBufferTail] = event
      eventBufferTail = (eventBufferTail + 1) % bufferCapacity
    } finally {
      release()
    }
  }

  /**
   * Drain all events currently in the buffer.
   * This function is run continuously by the worker loop.
   */
  const drain = async (): Promise<void> => {
    while (emptySlots.getValue() < bufferCapacity) {
      let event: UserOpAuditEvent | null = null
      const release = await bufferLock.acquire()
      try {
        event = eventBuffer[eventBufferHead]
        eventBuffer[eventBufferHead] = null
        eventBufferHead = (eventBufferHead + 1) % bufferCapacity
      } finally {
        release()
      }

      try {
        if (event) {
          await auditLogWriter.write(event)
        }
      } catch (err) {
        logger.error({ err, event }, 'Failed to write audit log event')
      }

      // Releasing the lock will increment the semaphore again indicating that there is one more empty slot.
      emptySlots.release(1)
    }
  }

  /**
   * Utility to pause execution for a given duration.
   *
   * @param ms - The duration to sleep in milliseconds.
   * @returns A promise that resolves after the given duration.
   */
  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms))

  /**
   * Background worker that continuously drains the audit queue at regular intervals.
   * It drains the queue at regular intervals defined by `flushIntervalMs`.
   * If the queue is empty, it waits for the next interval.
   */
  const worker = async (): Promise<void> => {
    try {
      while (running) {
        await drain()
        if (running) {
          await sleep(config.flushIntervalMs)
        }
      }

      // Final drain before shutdown
      await drain()
    } catch (err) {
      logger.error({ err }, 'Audit log worker crashed')
    }
  }

  // Start background drain worker immediately
  const workerPromise = worker()

  return {
    enqueue,
    shutdown: async (): Promise<void> => {
      running = false
      await workerPromise
    },
  }
}

export const createAuditLogQueue = withReadonly<
  AuditLogQueueConfig,
  AuditLogQueue
>(_createAuditLogQueue)
