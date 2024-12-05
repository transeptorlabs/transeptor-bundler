import { describe, it, expect } from 'vitest'
import { createState } from './state.js'
import { State, StateKey } from './state.types.js'

describe('createState', () => {
  it('should initialize state correctly', async () => {
    const stateService = createState()
    const state = await stateService.getState([
      StateKey.StandardPool,
      StateKey.BlackList,
    ])
    expect(state).toEqual({
      standardPool: {},
      blackList: [],
    })
  })

  describe('getState', () => {
    it('should get a single key from state', async () => {
      const stateService = createState()
      const state = await stateService.getState(StateKey.WhiteList)
      expect(state).toEqual({ whiteList: [] })
    })

    it('should get multiple keys from state', async () => {
      const stateService = createState()
      const state = await stateService.getState([
        StateKey.MempoolEntryCount,
        StateKey.BundleTxs,
      ])
      expect(state).toEqual({
        mempoolEntryCount: {},
        bundleTxs: {},
      })
    })
  })

  describe('updateState', () => {
    it('should update a single key in state', async () => {
      const stateService = createState()
      await stateService.updateState(StateKey.BlackList, (current) => ({
        blackList: [...current.blackList, 'newEntry'],
      }))

      const updatedState = await stateService.getState(StateKey.BlackList)
      expect(updatedState).toEqual({ blackList: ['newEntry'] })
    })

    it('should update multiple keys in state', async () => {
      const stateService = createState()
      await stateService.updateState(
        [StateKey.BlackList, StateKey.WhiteList],
        (current) => ({
          blackList: [...current.blackList, 'blackEntry'],
          whiteList: [...current.whiteList, 'whiteEntry'],
        }),
      )

      const updatedState = await stateService.getState([
        StateKey.BlackList,
        StateKey.WhiteList,
      ])
      expect(updatedState).toEqual({
        blackList: ['blackEntry'],
        whiteList: ['whiteEntry'],
      })
    })

    it('should throw an error if updated value is empty (single)', async () => {
      const stateService = createState()
      await expect(
        stateService.updateState(
          StateKey.BlackList,
          () => ({}) as Partial<State>,
        ),
      ).rejects.toThrowError('Updated value must not be empty(single)')
    })

    it('should throw an error if updated value has incorrect keys (single)', async () => {
      const stateService = createState()
      await expect(
        stateService.updateState(
          StateKey.BlackList,
          () => ({ whiteList: [] }) as Partial<State>,
        ),
      ).rejects.toThrowError(
        'Updated value must contain the same keys as input, missing blackList(single)',
      )
    })

    it('should throw an error if updated value is empty (multiple)', async () => {
      const stateService = createState()
      await expect(
        stateService.updateState(
          [StateKey.BlackList, StateKey.WhiteList],
          () => ({}) as Partial<State>,
        ),
      ).rejects.toThrowError('Updated value must not be empty(multiple)')
    })

    it('should throw an error if updated value is missing keys (multiple)', async () => {
      const stateService = createState()
      await expect(
        stateService.updateState(
          [StateKey.BlackList, StateKey.WhiteList],
          () => ({
            blackList: [],
          }),
        ),
      ).rejects.toThrowError(
        'Updated value must contain the same keys as input, missing whiteList(multiple)',
      )
    })

    it('should throw an error if updated value has extra keys (multiple)', async () => {
      const stateService = createState()
      await expect(
        stateService.updateState(
          [StateKey.BlackList, StateKey.WhiteList],
          () => ({
            blackList: [],
            whiteList: [],
            reputationEntries: {},
          }),
        ),
      ).rejects.toThrowError(
        'Updated value must only contain the same keys as input: received reputationEntries(multiple)',
      )
    })
  })
})
