import { vi } from 'vitest'
import { DepositManager } from '../../src/deposit/index.js'

export const mockDepositManager: DepositManager = {
  checkPaymasterDeposit: vi.fn().mockResolvedValue(Promise.resolve()),
}
