import { vi, MockedObject } from 'vitest'
import { MempoolManageSender } from '../../src/types/index.js'
import { Either } from '../../src/monad/index.js'

export const mockMempoolManageSender: MockedObject<MempoolManageSender> = {
  addUserOp: vi.fn().mockResolvedValue(Either.Right('0x123')),
}
