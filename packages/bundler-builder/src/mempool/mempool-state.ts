import { Mutex } from 'async-mutex'
import {
  MempoolState,
  StandardPool,
  EntryCount,
  ReputationEntries,
} from './mempool.types.js'

export type MempoolStateService = {
  getStandardPool: () => StandardPool
  getEntryCount: () => EntryCount
  getBlackList: () => string[]
  getWhitelist: () => string[]
  getReputationEntries: () => ReputationEntries

  /**
   * Single setter to allow for atomic updates of any part of the state.
   *
   * @param updateFn A function that takes the current state and returns the new state.
   * @returns  A promise that resolves when the state has been updated.
   */
  updateState: (
    updateFn: (state: MempoolState) => MempoolState,
  ) => Promise<void>
}

export const createMempoolState = (): MempoolStateService => {
  const mutex = new Mutex()
  let state: MempoolState = {
    standardPool: {},
    entryCount: {},

    blackList: [],
    whitelist: [],
    reputationEntries: {},
  }

  return {
    getStandardPool: (): StandardPool => state.standardPool,
    getEntryCount: (): EntryCount => state.entryCount,
    getBlackList: (): string[] => state.blackList,
    getWhitelist: (): string[] => state.whitelist,
    getReputationEntries: () => state.reputationEntries,
    updateState: (
      updateFn: (state: MempoolState) => MempoolState,
    ): Promise<void> => {
      return mutex.runExclusive(() => {
        state = updateFn(state)
      })
    },
  }
}
