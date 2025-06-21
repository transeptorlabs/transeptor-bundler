import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { createState } from '../src/state/state.js'
import { State, StateKey, StateService } from '../src/types/index.js'

import { mockCapabilityVerifier, mockLogger } from './mocks/index.js'
import { createTestStateCapability } from './test-helpers.js'

describe('createState', () => {
  let stateService: StateService

  beforeEach(() => {
    stateService = createState({
      logger: mockLogger,
      capabilityVerifier: mockCapabilityVerifier,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize state correctly', async () => {
    mockCapabilityVerifier.verifyStateCapability.mockReturnValue(true)
    const state = await stateService.getState(
      createTestStateCapability('test', [
        StateKey.StandardPool,
        StateKey.BlackList,
      ]),
      [StateKey.StandardPool, StateKey.BlackList],
    )
    expect(state).toEqual({
      standardPool: {},
      blackList: [],
    })
  })

  describe('getState', () => {
    it('should get a single key from state', async () => {
      mockCapabilityVerifier.verifyStateCapability.mockReturnValue(true)
      const state = await stateService.getState(
        createTestStateCapability('test', [StateKey.WhiteList]),
        StateKey.WhiteList,
      )
      expect(state).toEqual({ whiteList: [] })
    })

    it('should get multiple keys from state', async () => {
      mockCapabilityVerifier.verifyStateCapability.mockReturnValue(true)
      const state = await stateService.getState(
        createTestStateCapability('test', [
          StateKey.MempoolEntryCount,
          StateKey.BundleTxs,
        ]),
        [StateKey.MempoolEntryCount, StateKey.BundleTxs],
      )
      expect(state).toEqual({
        mempoolEntryCount: {},
        bundleTxs: {},
      })
    })

    it('should throw error when caller does not have access to the requested state keys', async () => {
      mockCapabilityVerifier.verifyStateCapability.mockReturnValue(false)

      await expect(
        stateService.getState(
          createTestStateCapability('test', [StateKey.BlackList]),
          StateKey.WhiteList,
        ),
      ).rejects.toThrow(
        'Caller does not have access to the requested state keys',
      )
    })
  })

  describe('updateState', () => {
    it('should update a single key in state', async () => {
      mockCapabilityVerifier.verifyStateCapability.mockReturnValue(true)
      await stateService.updateState(
        createTestStateCapability('test', [StateKey.BlackList]),
        StateKey.BlackList,
        (current) => ({
          blackList: [...current.blackList, 'newEntry'],
        }),
      )

      const updatedState = await stateService.getState(
        createTestStateCapability('test', [StateKey.BlackList]),
        StateKey.BlackList,
      )
      expect(updatedState).toEqual({ blackList: ['newEntry'] })
    })

    it('should update multiple keys in state', async () => {
      mockCapabilityVerifier.verifyStateCapability.mockReturnValue(true)
      await stateService.updateState(
        createTestStateCapability('test', [
          StateKey.BlackList,
          StateKey.WhiteList,
        ]),
        [StateKey.BlackList, StateKey.WhiteList],
        (current) => ({
          blackList: [...current.blackList, 'blackEntry'],
          whiteList: [...current.whiteList, 'whiteEntry'],
        }),
      )

      const updatedState = await stateService.getState(
        createTestStateCapability('test', [
          StateKey.BlackList,
          StateKey.WhiteList,
        ]),
        [StateKey.BlackList, StateKey.WhiteList],
      )
      expect(updatedState).toEqual({
        blackList: ['blackEntry'],
        whiteList: ['whiteEntry'],
      })
    })

    it('should return false if updated value is empty (single)', async () => {
      mockCapabilityVerifier.verifyStateCapability.mockReturnValue(true)
      const res = await stateService.updateState(
        createTestStateCapability('test', [StateKey.BlackList]),
        StateKey.BlackList,
        () => ({}) as Partial<State>,
      )
      expect(res).toBe(false)
    })

    it('should return false if updated value has incorrect keys (single)', async () => {
      mockCapabilityVerifier.verifyStateCapability.mockReturnValue(true)
      const res = await stateService.updateState(
        createTestStateCapability('test', [StateKey.BlackList]),
        StateKey.BlackList,
        () => ({ whiteList: [] }) as Partial<State>,
      )
      expect(res).toBe(false)
    })

    it('should return false if updated value is empty (multiple)', async () => {
      mockCapabilityVerifier.verifyStateCapability.mockReturnValue(true)
      const res = await stateService.updateState(
        createTestStateCapability('test', [
          StateKey.BlackList,
          StateKey.WhiteList,
        ]),
        [StateKey.BlackList, StateKey.WhiteList],
        () => ({}) as Partial<State>,
      )
      expect(res).toBe(false)
    })

    it('should return false if updated value is missing keys (multiple)', async () => {
      mockCapabilityVerifier.verifyStateCapability.mockReturnValue(true)
      const res = await stateService.updateState(
        createTestStateCapability('test', [
          StateKey.BlackList,
          StateKey.WhiteList,
        ]),
        [StateKey.BlackList, StateKey.WhiteList],
        () => ({
          blackList: [],
        }),
      )

      expect(res).toBe(false)
    })

    it('should return false if updated value has extra keys (multiple)', async () => {
      mockCapabilityVerifier.verifyStateCapability.mockReturnValue(true)
      const res = await stateService.updateState(
        createTestStateCapability('test', [
          StateKey.BlackList,
          StateKey.WhiteList,
        ]),
        [StateKey.BlackList, StateKey.WhiteList],
        () => ({
          blackList: [],
          whiteList: [],
          reputationEntries: {},
        }),
      )
      expect(res).toBe(false)
    })

    it('should throw error when caller does not have access to the requested state keys to update', async () => {
      mockCapabilityVerifier.verifyStateCapability.mockReturnValue(false)

      await expect(
        stateService.updateState(
          createTestStateCapability('test', [StateKey.WhiteList]),
          StateKey.BlackList,
          (current) => ({ blackList: [...current.blackList, 'newEntry'] }),
        ),
      ).rejects.toThrow(
        'Caller does not have access to the requested state keys to update',
      )
    })
  })
})
