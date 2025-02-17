import { describe, it, expect } from 'vitest'
import { createState } from '../src/state/state.js'
import { State, StateKey } from '../src/types/index.js'

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

    it('should return false if updated value is empty (single)', async () => {
      const stateService = createState()
      const res = await stateService.updateState(
        StateKey.BlackList,
        () => ({}) as Partial<State>,
      )
      expect(res).toBe(false)
    })

    it('should return false if updated value has incorrect keys (single)', async () => {
      const stateService = createState()
      const res = await stateService.updateState(
        StateKey.BlackList,
        () => ({ whiteList: [] }) as Partial<State>,
      )
      expect(res).toBe(false)
    })

    it('should return false if updated value is empty (multiple)', async () => {
      const stateService = createState()
      const res = await stateService.updateState(
        [StateKey.BlackList, StateKey.WhiteList],
        () => ({}) as Partial<State>,
      )
      expect(res).toBe(false)
    })

    it('should return false if updated value is missing keys (multiple)', async () => {
      const stateService = createState()
      const res = await stateService.updateState(
        [StateKey.BlackList, StateKey.WhiteList],
        () => ({
          blackList: [],
        }),
      )

      expect(res).toBe(false)
    })

    it('should return false if updated value has extra keys (multiple)', async () => {
      const stateService = createState()
      const res = await stateService.updateState(
        [StateKey.BlackList, StateKey.WhiteList],
        () => ({
          blackList: [],
          whiteList: [],
          reputationEntries: {},
        }),
      )
      expect(res).toBe(false)
    })
  })
})
