import { vi, MockedObject } from 'vitest'
import { Simulator } from '../../src/types/index.js'

export const mockSimulator: MockedObject<Simulator> = {
  partialSimulateValidation: vi.fn(),
  fullSimulateValidation: vi.fn(),
  simulateHandleOp: vi.fn(),
  tracerResultParser: vi.fn(),
  supportsDebugTraceCall: vi.fn(),
  supportsDebugTraceCallWithNativeTracer: vi.fn(),
  erc7562TracerResultParser: vi.fn(),
}
