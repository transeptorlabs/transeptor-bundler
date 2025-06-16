import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinoAuditLogWriter } from '../../src/logger/audit/pino-audit-log-writer.js'
import { Logger, pino } from 'pino'
import { UserOpAuditEvent, LifecycleStage } from '../../src/types/index.js'
import * as fs from 'fs'

// Mock pino
vi.mock('pino', () => {
  const mockAuditLogger = {
    info: vi.fn().mockImplementation(() => Promise.resolve()),
    error: vi.fn().mockImplementation(() => Promise.resolve()),
  }

  const mockDestination = {
    write: vi.fn().mockImplementation(() => Promise.resolve()),
  }

  // pino is a function
  const pinoFn = vi.fn().mockReturnValue(mockAuditLogger) as any
  // Attach static properties to the function
  pinoFn.destination = vi.fn().mockReturnValue(mockDestination)
  pinoFn.stdTimeFunctions = { isoTime: vi.fn() }

  return {
    __esModule: true,
    default: pinoFn,
    pino: pinoFn,
    destination: pinoFn.destination,
    stdTimeFunctions: pinoFn.stdTimeFunctions,
  }
})

describe('createPinoAuditLogWriter', () => {
  const mockLogger = {
    error: vi.fn().mockImplementation(() => Promise.resolve()),
    info: vi.fn().mockImplementation(() => Promise.resolve()),
  } as unknown as Logger

  const config = {
    destinationPath: '/tmp/audit.log',
    logger: mockLogger,
  }

  const mockUserOpEvent: UserOpAuditEvent = {
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
        callGasLimit: '0x100000',
        verificationGasLimit: '0x100000',
        preVerificationGas: '0x100000',
        maxFeePerGas: '0x100000',
        maxPriorityFeePerGas: '0x100000',
      },
      entryPoint: '0x456',
      chainId: 1,
      details: {},
    },
  }

  let mockAuditLogger: {
    info: ReturnType<typeof vi.fn>
    error: ReturnType<typeof vi.fn>
  }
  let mockDestination: { write: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.clearAllMocks()
    mockAuditLogger = vi.mocked(pino())
    mockDestination = vi.mocked(pino.destination())
  })

  afterEach(() => {
    // Clean up any test files
    if (fs.existsSync(config.destinationPath)) {
      fs.unlinkSync(config.destinationPath)
    }
  })

  it('should create a pino audit log writer with correct configuration', () => {
    const writer = createPinoAuditLogWriter(config)

    expect(writer).toBeDefined()
    expect(writer.write).toBeDefined()
    expect(writer.healthCheck).toBeDefined()
  })

  it('should write audit log event successfully', async () => {
    const writer = createPinoAuditLogWriter(config)
    await writer.write(mockUserOpEvent)

    // Verify pino logger was called with correct event
    expect(mockAuditLogger.info).toHaveBeenCalledWith({
      ...mockUserOpEvent,
      data: {
        ...mockUserOpEvent.data,
        userOp: {
          ...mockUserOpEvent.data.userOp,
          signature: '0x_REDACTED',
          callData: '0x_REDACTED',
          factoryData: '0x_REDACTED',
          eip7702Auth: '0x_REDACTED',
        },
      },
    })
  })

  it('should handle write errors gracefully', async () => {
    const writer = createPinoAuditLogWriter(config)
    const error = new Error('Write failed')
    // Mock pino logger to throw error
    mockAuditLogger.info.mockImplementationOnce(() => {
      throw error
    })

    // Should not throw
    await expect(writer.write(mockUserOpEvent)).resolves.not.toThrow()

    // Verify error was logged
    expect(mockLogger.error).toHaveBeenCalledWith(
      { err: error, event: mockUserOpEvent },
      `Failed to write audit log event to ${config.destinationPath}.`,
    )
  })

  it('should return true for health check', async () => {
    const writer = createPinoAuditLogWriter(config)
    const isHealthy = await writer.healthCheck()

    expect(isHealthy).toBe(true)
  })

  it('should create destination with correct configuration', () => {
    createPinoAuditLogWriter(config)

    // Verify pino destination was created with correct config
    expect(pino.destination).toHaveBeenCalledWith({
      dest: config.destinationPath,
      sync: true,
    })
  })

  it('should create logger with correct configuration', () => {
    createPinoAuditLogWriter(config)

    // Verify pino logger was created with correct config
    expect(pino).toHaveBeenCalledWith(
      {
        level: 'info',
        timestamp: pino.stdTimeFunctions.isoTime,
        base: null,
      },
      mockDestination,
    )
  })
})
