import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createAuditLogQueue } from '../../src/logger/audit/audit-queue.js'
import {
  UserOpAuditEvent,
  LifecycleStage,
  TranseptorLogger,
} from '../../src/types/index.js'

describe('createAuditLogQueue', () => {
  const mockAuditLogWriter = {
    write: vi.fn(),
    healthCheck: vi.fn().mockResolvedValue(true),
  }

  const mockLogger = {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  } as unknown as TranseptorLogger

  const config = {
    auditLogWriter: mockAuditLogWriter,
    logger: mockLogger,
    flushIntervalMs: 10,
    bufferCapacity: 3,
  }

  let queue: ReturnType<typeof createAuditLogQueue>

  beforeEach(() => {
    vi.clearAllMocks()
    queue = createAuditLogQueue(config)
  })

  afterEach(async () => {
    await queue.shutdown()
  }, 30000)

  describe('enqueue', () => {
    it('should successfully enqueue and process a single event', async () => {
      const event: UserOpAuditEvent = {
        kind: 'userOp-lifecycle',
        timestamp: new Date().toISOString(),
        clientVersion: 'test',
        nodeCommitHash: 'test',
        data: {
          lifecycleStage: 'userOpReceived' as LifecycleStage,
          userOpHash: '0x123',
          userOp: {
            sender: '0x123',
            nonce: '0x1',
            callData: '0x',
            callGasLimit: '0x100000',
            verificationGasLimit: '0x100000',
            preVerificationGas: '0x100000',
            maxFeePerGas: '0x100000',
            maxPriorityFeePerGas: '0x100000',
            signature: '0x',
          },
          entryPoint: '0x456',
          chainId: '1',
          details: {},
        },
      }

      await queue.enqueue(event)
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(mockAuditLogWriter.write).toHaveBeenCalledWith(event)
    }, 30000)

    it('should handle multiple events in sequence', async () => {
      const events: UserOpAuditEvent[] = [
        {
          kind: 'userOp-lifecycle',
          timestamp: new Date().toISOString(),
          clientVersion: 'test',
          nodeCommitHash: 'test',
          data: {
            lifecycleStage: 'userOpReceived' as LifecycleStage,
            userOpHash: '0x123',
            userOp: {
              sender: '0x123',
              nonce: '0x1',
              callData: '0x',
              callGasLimit: '0x100000',
              verificationGasLimit: '0x100000',
              preVerificationGas: '0x100000',
              maxFeePerGas: '0x100000',
              maxPriorityFeePerGas: '0x100000',
              signature: '0x',
            },
            entryPoint: '0x456',
            chainId: '1',
            details: {},
          },
        },
        {
          kind: 'userOp-lifecycle',
          timestamp: new Date().toISOString(),
          clientVersion: 'test',
          nodeCommitHash: 'test',
          data: {
            lifecycleStage: 'userOpValidated' as LifecycleStage,
            userOpHash: '0x123',
            userOp: {
              sender: '0x123',
              nonce: '0x1',
              callData: '0x',
              callGasLimit: '0x100000',
              verificationGasLimit: '0x100000',
              preVerificationGas: '0x100000',
              maxFeePerGas: '0x100000',
              maxPriorityFeePerGas: '0x100000',
              signature: '0x',
            },
            entryPoint: '0x456',
            chainId: '1',
            details: {},
          },
        },
      ]

      for (const event of events) {
        await queue.enqueue(event)
      }

      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(mockAuditLogWriter.write).toHaveBeenCalledTimes(2)
      events.forEach((event) => {
        expect(mockAuditLogWriter.write).toHaveBeenCalledWith(event)
      })
    }, 30000)

    it('should handle writer errors gracefully', async () => {
      const error = new Error('Write failed')
      mockAuditLogWriter.write.mockRejectedValueOnce(error)

      const event: UserOpAuditEvent = {
        kind: 'userOp-lifecycle',
        timestamp: new Date().toISOString(),
        clientVersion: 'test',
        nodeCommitHash: 'test',
        data: {
          lifecycleStage: 'userOpReceived' as LifecycleStage,
          userOpHash: '0x123',
          userOp: {
            sender: '0x123',
            nonce: '0x1',
            callData: '0x',
            callGasLimit: '0x100000',
            verificationGasLimit: '0x100000',
            preVerificationGas: '0x100000',
            maxFeePerGas: '0x100000',
            maxPriorityFeePerGas: '0x100000',
            signature: '0x',
          },
          entryPoint: '0x456',
          chainId: '1',
          details: {},
        },
      }

      await queue.enqueue(event)
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          err: error,
          event,
        }),
        'Failed to write audit log event',
      )
    }, 30000)
  })

  describe('shutdown', () => {
    it('should process remaining events during shutdown', async () => {
      const event: UserOpAuditEvent = {
        kind: 'userOp-lifecycle',
        timestamp: new Date().toISOString(),
        clientVersion: 'test',
        nodeCommitHash: 'test',
        data: {
          lifecycleStage: 'userOpReceived' as LifecycleStage,
          userOpHash: '0x123',
          userOp: {
            sender: '0x123',
            nonce: '0x1',
            callData: '0x',
            callGasLimit: '0x100000',
            verificationGasLimit: '0x100000',
            preVerificationGas: '0x100000',
            maxFeePerGas: '0x100000',
            maxPriorityFeePerGas: '0x100000',
            signature: '0x',
          },
          entryPoint: '0x456',
          chainId: '1',
          details: {},
        },
      }

      await queue.enqueue(event)
      await queue.shutdown()
      expect(mockAuditLogWriter.write).toHaveBeenCalledWith(event)
    }, 30000)

    it('should handle multiple events during shutdown', async () => {
      const events: UserOpAuditEvent[] = [
        {
          kind: 'userOp-lifecycle',
          timestamp: new Date().toISOString(),
          clientVersion: 'test',
          nodeCommitHash: 'test',
          data: {
            lifecycleStage: 'userOpReceived' as LifecycleStage,
            userOpHash: '0x123',
            userOp: {
              sender: '0x123',
              nonce: '0x1',
              callData: '0x',
              callGasLimit: '0x100000',
              verificationGasLimit: '0x100000',
              preVerificationGas: '0x100000',
              maxFeePerGas: '0x100000',
              maxPriorityFeePerGas: '0x100000',
              signature: '0x',
            },
            entryPoint: '0x456',
            chainId: '1',
            details: {},
          },
        },
        {
          kind: 'userOp-lifecycle',
          timestamp: new Date().toISOString(),
          clientVersion: 'test',
          nodeCommitHash: 'test',
          data: {
            lifecycleStage: 'userOpValidated' as LifecycleStage,
            userOpHash: '0x123',
            userOp: {
              sender: '0x123',
              nonce: '0x1',
              callData: '0x',
              callGasLimit: '0x100000',
              verificationGasLimit: '0x100000',
              preVerificationGas: '0x100000',
              maxFeePerGas: '0x100000',
              maxPriorityFeePerGas: '0x100000',
              signature: '0x',
            },
            entryPoint: '0x456',
            chainId: '1',
            details: {},
          },
        },
      ]

      for (const event of events) {
        await queue.enqueue(event)
      }

      await queue.shutdown()

      expect(mockAuditLogWriter.write).toHaveBeenCalledTimes(2)
      events.forEach((event) => {
        expect(mockAuditLogWriter.write).toHaveBeenCalledWith(event)
      })
    }, 30000)
  })

  describe('buffer behavior', () => {
    it('should process events in order when buffer is not full', async () => {
      const events: UserOpAuditEvent[] = Array(2)
        .fill(null)
        .map((_, i) => ({
          kind: 'userOp-lifecycle',
          timestamp: new Date().toISOString(),
          clientVersion: 'test',
          nodeCommitHash: 'test',
          data: {
            lifecycleStage: 'userOpReceived' as LifecycleStage,
            userOpHash: `0x${i}`,
            userOp: {
              sender: '0x123',
              nonce: '0x1',
              callData: '0x',
              callGasLimit: '0x100000',
              verificationGasLimit: '0x100000',
              preVerificationGas: '0x100000',
              maxFeePerGas: '0x100000',
              maxPriorityFeePerGas: '0x100000',
              signature: '0x',
            },
            entryPoint: '0x456',
            chainId: '1',
            details: {},
          },
        }))

      // Enqueue events
      for (const event of events) {
        await queue.enqueue(event)
      }

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Verify events were processed in order
      expect(mockAuditLogWriter.write).toHaveBeenCalledTimes(2)
      expect(mockAuditLogWriter.write.mock.calls[0][0]).toEqual(events[0])
      expect(mockAuditLogWriter.write.mock.calls[1][0]).toEqual(events[1])
    }, 30000)

    it('should process events in order and handle backpressure', async () => {
      // Given
      const bufferCapacity = 3
      const queue = createAuditLogQueue({
        auditLogWriter: mockAuditLogWriter,
        logger: mockLogger,
        bufferCapacity,
        flushIntervalMs: 10,
      })

      // When
      // Create events
      const events = Array.from({ length: bufferCapacity + 1 }, (_, i) => ({
        kind: 'userOp' as const,
        timestamp: new Date().toISOString(),
        clientVersion: 'test',
        nodeCommitHash: 'test',
        data: {
          lifecycleStage: 'submitted' as LifecycleStage,
          userOpHash: `0x${i}`,
          userOp: {
            sender: '0x123',
            nonce: '0x0',
            factory: '0x',
            factoryData: '0x',
            callData: '0x',
            callGasLimit: '0x0',
            verificationGasLimit: '0x0',
            preVerificationGas: '0x0',
            maxFeePerGas: '0x0',
            maxPriorityFeePerGas: '0x0',
            paymaster: '0x',
            paymasterVerificationGasLimit: '0x0',
            paymasterPostOpGasLimit: '0x0',
            paymasterData: '0x',
            signature: '0x',
          },
          entryPoint: '0x456',
          chainId: '1',
          details: {},
        },
      }))

      // Enqueue first bufferCapacity events
      const enqueuePromises = events
        .slice(0, bufferCapacity)
        .map((event) => queue.enqueue(event))
      await Promise.all(enqueuePromises)

      // Wait for initial events to be processed
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Then verify initial events were processed
      expect(mockAuditLogWriter.write).toHaveBeenCalledTimes(bufferCapacity)
      events.slice(0, bufferCapacity).forEach((event, index) => {
        expect(mockAuditLogWriter.write).toHaveBeenNthCalledWith(
          index + 1,
          event,
        )
      })

      // When enqueueing the last event, it should be processed after some events are drained
      const lastEventPromise = queue.enqueue(events[bufferCapacity])
      await new Promise((resolve) => setTimeout(resolve, 50))
      await lastEventPromise

      // Then verify the last event was processed
      expect(mockAuditLogWriter.write).toHaveBeenCalledTimes(bufferCapacity + 1)
      expect(mockAuditLogWriter.write).toHaveBeenLastCalledWith(
        events[bufferCapacity],
      )

      await queue.shutdown()
    }, 30000)
  })

  describe('worker behavior', () => {
    it('should handle worker errors gracefully and continue processing', async () => {
      // Given
      const error = new Error('Worker error')
      mockAuditLogWriter.write.mockRejectedValueOnce(error)

      const event: UserOpAuditEvent = {
        kind: 'userOp' as const,
        timestamp: new Date().toISOString(),
        clientVersion: 'test',
        nodeCommitHash: 'test',
        data: {
          lifecycleStage: 'submitted' as LifecycleStage,
          userOpHash: '0x123',
          userOp: {
            sender: '0x123',
            nonce: '0x0',
            factory: '0x',
            factoryData: '0x',
            callData: '0x',
            callGasLimit: '0x0',
            verificationGasLimit: '0x0',
            preVerificationGas: '0x0',
            maxFeePerGas: '0x0',
            maxPriorityFeePerGas: '0x0',
            paymaster: '0x',
            paymasterVerificationGasLimit: '0x0',
            paymasterPostOpGasLimit: '0x0',
            paymasterData: '0x',
            signature: '0x',
          },
          entryPoint: '0x456',
          chainId: '1',
          details: {},
        },
      }

      // When
      await queue.enqueue(event)
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Then
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          err: error,
          event,
        }),
        'Failed to write audit log event',
      )

      // Verify worker continues running by enqueueing another event
      const secondEvent = {
        ...event,
        data: { ...event.data, userOpHash: '0x456' },
      }
      await queue.enqueue(secondEvent)
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(mockAuditLogWriter.write).toHaveBeenCalledWith(secondEvent)
    }, 30000)
  })
})
