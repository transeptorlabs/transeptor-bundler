import { vi, MockedObject } from 'vitest'
import { PreVerificationGasCalculator } from '../../src/gas/pre-verification-gas.js'

export const mockPreVerificationGasCalculator: MockedObject<PreVerificationGasCalculator> =
  {
    calcPreVerificationGas: vi.fn(),
    validatePreVerificationGas: vi.fn(),
    updateGasConfig: vi.fn(),
  }
