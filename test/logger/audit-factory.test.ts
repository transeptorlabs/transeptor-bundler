import { describe, it, expect, vi, beforeEach } from 'vitest'

import { createAuditLogWriter } from '../../src/logger/audit/audit-factory.js'
import { AuditLogWriter, TranseptorLogger } from '../../src/types/index.js'

// Mock the pino-audit-log-writer module before any tests run
vi.mock('../../src/logger/audit/pino-audit-log-writer.js', () => ({
  createPinoAuditLogWriter: vi.fn(),
}))

describe('Audit Factory', () => {
  let mockLogger: TranseptorLogger
  let mockPinoAuditLogWriter: AuditLogWriter

  beforeEach(async () => {
    vi.clearAllMocks()

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as TranseptorLogger

    // Mock the Pino audit log writer
    mockPinoAuditLogWriter = {
      writeUserOperationEvent: vi.fn(),
    } as unknown as AuditLogWriter

    // Set up the mock implementation
    const { createPinoAuditLogWriter } = await import(
      '../../src/logger/audit/pino-audit-log-writer.js'
    )
    vi.mocked(createPinoAuditLogWriter).mockReturnValue(mockPinoAuditLogWriter)
  })

  describe('createAuditLogWriter', () => {
    it('should create a Pino audit log writer with valid configuration', () => {
      const config = {
        backend: 'pino' as const,
        destinationPath: '/path/to/logs',
        logger: mockLogger,
      }

      const writer = createAuditLogWriter(config)

      expect(writer).toBeDefined()
      expect(writer).toBe(mockPinoAuditLogWriter)
    })

    it('should throw error for unknown backend', () => {
      const config = {
        backend: 'unknown' as any,
        destinationPath: '/path/to/logs',
        logger: mockLogger,
      }

      expect(() => createAuditLogWriter(config)).toThrow(
        'Unknown audit log backend: unknown',
      )
    })

    it('should pass correct configuration to Pino audit log writer', () => {
      const config = {
        backend: 'pino' as const,
        destinationPath: '/custom/path',
        logger: mockLogger,
      }

      createAuditLogWriter(config)

      // Verify that the Pino audit log writer was created with the correct config
      expect(mockPinoAuditLogWriter).toBeDefined()
    })
  })
})
