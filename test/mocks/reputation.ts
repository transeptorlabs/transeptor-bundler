import { vi } from 'vitest'
import { StakeInfo } from '../../src/validatation/index.js'
import {
  ReputationManager,
  ReputationStatus,
} from '../../src/reputation/index.js'

/**
 * @example Usage:
 *
 * const mockReputationManager: ReputationManager = mockReputationManager
 * mockReputationManager.getStatus.mockResolvedValueOnce(expectedStatus)
 */
export const mockReputationManager: ReputationManager = {
  startHourlyCron: vi.fn().mockResolvedValue(Promise.resolve()),
  stopHourlyCron: vi.fn(),
  clearState: vi.fn().mockResolvedValue(Promise.resolve()),
  getStatus: vi.fn().mockResolvedValue({} as ReputationStatus),
  dump: vi.fn().mockResolvedValue([]),
  addWhitelist: vi.fn().mockResolvedValue(Promise.resolve()),
  addBlacklist: vi.fn().mockResolvedValue(Promise.resolve()),
  updateSeenStatus: vi.fn().mockResolvedValue(Promise.resolve()),
  updateIncludedStatus: vi.fn().mockResolvedValue(Promise.resolve()),
  getStakeStatus: vi.fn().mockResolvedValue({
    stakeInfo: {} as StakeInfo,
    isStaked: true,
  }),
  crashedHandleOps: vi.fn().mockResolvedValue(Promise.resolve()),
  setReputation: vi.fn().mockResolvedValue([]),
  checkBanned: vi.fn().mockResolvedValue(Promise.resolve()),
  checkThrottled: vi.fn().mockResolvedValue(Promise.resolve()),
  checkStake: vi.fn().mockResolvedValue(Promise.resolve()),
  calculateMaxAllowedMempoolOpsUnstaked: vi.fn().mockResolvedValue(100),
  updateSeenStatusBatch: vi.fn().mockResolvedValue(Promise.resolve()),
}
