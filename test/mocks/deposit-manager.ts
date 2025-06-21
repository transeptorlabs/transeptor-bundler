import { vi, MockedObject } from 'vitest'

import { DepositManager } from '../../src/deposit/index.js'

export const mockDepositManager: MockedObject<DepositManager> = {
  checkPaymasterDeposit: vi.fn(),
}
