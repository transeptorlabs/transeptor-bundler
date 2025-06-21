import { vi, MockedObject } from 'vitest'

import { Either } from '../../src/monad/index.js'
import { MempoolManageSender } from '../../src/types/index.js'

export const mockMempoolManageSender: MockedObject<MempoolManageSender> = {
  addUserOp: vi.fn().mockResolvedValue(Either.Right('0x123')),
}
