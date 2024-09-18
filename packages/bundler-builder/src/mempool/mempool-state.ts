import { Mutex } from 'async-mutex'
import { MempoolState, MempoolStateKeys } from './mempool.types.js'

export type MempoolStateService = {
  /**
   * Getter for the state. It allows for retrieving any part of the state.
   * Consumers of the getState function will get the proper return type based on the key they pass,
   * without needing to cast the result manually.
   *
   * @param keys - A single key or an array of keys to retrieve from the state.
   * @returns A promise that resolves to the requested state value.
   *
   * @throws Error if the key is invalid.
   *
   * @example
   * // single value can be retrieved:
   * const { standardPool } = await mempoolStateService.getState(MempoolStateKeys.StandardPool);
   * console.log(standardPool)  // Logs the standardPool value
   *
   * // multiple values can be retrieved at once:
   * const { standardPool, blackList } = await mempoolStateService.getState([
   *   MempoolStateKeys.StandardPool,
   *   MempoolStateKeys.BlackList,
   * ])
   * console.log(standardPool)  // Logs the standardPool value
   * console.log(blackList)     // Logs the blackList value
   */
  getState: <K extends keyof MempoolState>(
    keys: MempoolStateKeys | MempoolStateKeys[],
  ) => Promise<Pick<MempoolState, K>>

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
    mempoolEntryCount: {},

    blackList: [],
    whiteList: [],
    reputationEntries: {},
  }

  return {
    getState: async <K extends keyof MempoolState>(
      keys: MempoolStateKeys | MempoolStateKeys[],
    ): Promise<Pick<MempoolState, K>> => {
      const release = await mutex.acquire()
      try {
        if (Array.isArray(keys)) {
          const selectedState = {} as Pick<MempoolState, K>
          keys.forEach((key) => {
            selectedState[key] = state[key]
          })
          return selectedState
        } else {
          return { [keys]: state[keys] } as Pick<MempoolState, K>
        }
      } finally {
        release()
      }
    },
    updateState: async (
      updateFn: (state: MempoolState) => MempoolState,
    ): Promise<void> => {
      const release = await mutex.acquire()
      try {
        state = updateFn(state)
      } finally {
        release()
      }
    },
  }
}
