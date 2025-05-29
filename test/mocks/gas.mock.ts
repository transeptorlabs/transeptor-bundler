import { vi, MockedObject } from 'vitest'
import { PreVerificationGasCalculator } from '../../src/gas/pre-verification-gas.js'

export const mockPreVerificationGasCalculator: MockedObject<PreVerificationGasCalculator> =
  {
    estimatePreVerificationGas: vi.fn(),
    validatePreVerificationGas: vi.fn(),
    calculatePreVerificationGas: vi.fn(),
    updateGasConfig: vi.fn(),
  }
