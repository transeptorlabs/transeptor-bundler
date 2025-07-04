import { describe, it, expect, vi, beforeEach } from 'vitest'

import { createAuditLogger } from '../../src/logger/audit/audit-logger.js'
import type { LifecycleStage } from '../../src/types/index.js'

describe('AuditLogger', () => {
  const mockAuditLogQueue = {
    enqueue: vi.fn(),
    shutdown: vi.fn(),
  }

  const defaultDeps = {
    auditLogQueue: mockAuditLogQueue,
    clientVersion: '1.0.0',
    nodeCommitHash: 'abc123',
    environment: 'production',
    auditTrailEnabled: true,
  }

  const mockUserOp = {
    sender: '0x123',
    nonce: '0x1',
    initCode: '0x',
    callData: '0x',
    callGasLimit: '0x1',
    verificationGasLimit: '0x1',
    preVerificationGas: '0x1',
    maxFeePerGas: '0x1',
    maxPriorityFeePerGas: '0x1',
    paymasterAndData: '0x',
    signature: '0x',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createAuditLogger', () => {
    it('should create an audit logger with readonly properties', () => {
      const logger = createAuditLogger(defaultDeps)

      // Verify the logger has the expected methods
      expect(logger).toHaveProperty('logUserOpLifecycleEvent')
      expect(logger).toHaveProperty('shutdown')

      // Verify the properties are readonly
      expect(() => {
        ;(logger as any).newProperty = 'test'
      }).toThrow()
    })
  })

  describe('logUserOpLifecycleEvent', () => {
    it('should enqueue audit event in production environment', async () => {
      const logger = createAuditLogger(defaultDeps)
      const userOpHash = '0xabc'
      const chainId = 1
      const entryPoint = '0x456'
      const details = { reason: 'test' }

      await logger.logUserOpLifecycleEvent({
        lifecycleStage: 'RECEIVED' as LifecycleStage,
        userOp: mockUserOp,
        userOpHash,
        chainId,
        entryPoint,
        details,
      })

      expect(mockAuditLogQueue.enqueue).toHaveBeenCalledTimes(1)
      const event = mockAuditLogQueue.enqueue.mock.calls[0][0]

      expect(event).toMatchObject({
        kind: 'userOp-lifecycle',
        clientVersion: defaultDeps.clientVersion,
        nodeCommitHash: defaultDeps.nodeCommitHash,
        data: {
          lifecycleStage: 'RECEIVED',
          userOpHash,
          userOp: mockUserOp,
          chainId,
          entryPoint,
          details,
        },
      })
      expect(event.timestamp).toBeDefined()
    })

    it('should not enqueue audit event in non-production environment if audit trail is disabled', async () => {
      const logger = createAuditLogger({
        ...defaultDeps,
        environment: 'development',
        auditTrailEnabled: false,
      })

      await logger.logUserOpLifecycleEvent({
        lifecycleStage: 'RECEIVED' as LifecycleStage,
        userOp: mockUserOp,
        userOpHash: '0xabc',
        chainId: 1,
        entryPoint: '0x456',
        details: { reason: 'test' },
      })

      expect(mockAuditLogQueue.enqueue).not.toHaveBeenCalled()
    })

    it('should enqueue audit event in non-production environment if audit trail is enabled', async () => {
      const logger = createAuditLogger({
        ...defaultDeps,
        environment: 'development',
        auditTrailEnabled: true,
      })

      await logger.logUserOpLifecycleEvent({
        lifecycleStage: 'RECEIVED' as LifecycleStage,
        userOp: mockUserOp,
        userOpHash: '0xabc',
        chainId: 1,
        entryPoint: '0x456',
        details: { reason: 'test' },
      })

      expect(mockAuditLogQueue.enqueue).toHaveBeenCalled()
    })
  })

  describe('shutdown', () => {
    it('should call shutdown on the audit log queue', async () => {
      const logger = createAuditLogger(defaultDeps)

      await logger.shutdown()

      expect(mockAuditLogQueue.shutdown).toHaveBeenCalledTimes(1)
    })
  })
})
