import { EventLog } from 'ethers'
import { vi, MockedObject } from 'vitest'

import { EventManager } from '../../src/event/index.js'

export const mockEventLog: EventLog = {
  args: {
    sender: '0x123',
    nonce: '0x0',
    actualGasCost: '0x0',
    actualGasUsed: '0x0',
    success: true,
  },
  getTransactionReceipt: vi.fn().mockResolvedValue({
    to: '0x456',
    from: '0x123',
    contractAddress: '0x789',
    index: 0,
    root: '0x',
    gasUsed: '0x0',
    logsBloom: '0x',
    blockHash: '0x',
    hash: '0x',
    logs: [],
    blockNumber: 1,
    confirmations: vi.fn().mockResolvedValue(1),
    cumulativeGasUsed: '0x0',
    gasPrice: '0x0',
    type: 0,
    status: 1,
  }),
  getTransaction: vi.fn().mockResolvedValue({
    to: '0x456',
    hash: '0x',
    blockHash: '0x',
    blockNumber: 1,
  }),
} as unknown as EventLog

export const mockEventManager: MockedObject<EventManager> = {
  handlePastEvents: vi.fn(),
  getUserOperationEvent: vi.fn(),
  filterLogs: vi.fn(),
}
