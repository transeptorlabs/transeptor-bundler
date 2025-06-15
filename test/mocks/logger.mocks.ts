import { vi } from 'vitest'
import { TranseptorLogger } from '../../src/types'

export const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
} as unknown as TranseptorLogger
