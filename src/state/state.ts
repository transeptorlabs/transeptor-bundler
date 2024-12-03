import { Mutex } from 'async-mutex'
import { State, StateKey, StateService } from './state.types.js'

export const createState = (): StateService => {
  const mutex = new Mutex()
  let state: State = {
    standardPool: {},
    mempoolEntryCount: {},
    bundleTxs: {},

    blackList: [],
    whiteList: [],
    reputationEntries: {},
  }

  return {
    getState: async <K extends keyof State>(
      keys: StateKey | StateKey[],
    ): Promise<Pick<State, K>> => {
      const release = await mutex.acquire()
      try {
        if (Array.isArray(keys)) {
          const selectedState = {} as Pick<State, K>
          keys.forEach((key) => {
            selectedState[key] = state[key]
          })
          return selectedState
        } else {
          return { [keys]: state[keys] } as Pick<State, K>
        }
      } finally {
        release()
      }
    },

    updateState: async <K extends keyof State>(
      keys: StateKey | StateKey[],
      updateFn: (currentValue: Pick<State, K>) => Partial<State>,
    ): Promise<void> => {
      const release = await mutex.acquire()
      try {
        const newState = { ...state } // Create a shallow copy of the state

        if (Array.isArray(keys)) {
          const currentValues = {} as Pick<State, K>
          keys.forEach((key) => {
            currentValues[key] = state[key]
          })

          const updatedValues = updateFn(currentValues)

          // throw error if empty
          if (Object.keys(updatedValues).length === 0) {
            throw new Error('Updated value must not be empty(multiple)')
          }

          // throw error if does not have the same key
          keys.forEach((key) => {
            if (!updatedValues[key]) {
              throw new Error(
                `Updated value must contain the same key as input, missing ${key}(multiple)`,
              )
            }
          })

          // throw error of it contains other keys
          Object.keys(updatedValues).forEach((key) => {
            if (!keys.includes(key as StateKey)) {
              throw new Error(
                `Updated value must only contain the same keys as input: received ${key} (multiple)`,
              )
            }
          })

          // Destructure keys from updatedValues
          Object.entries(updatedValues).forEach(([key, value]) => {
            newState[key] = value
          })
        } else {
          const currentValue = { [keys]: state[keys] } as Pick<State, K>
          const updatedValue = updateFn(currentValue)

          // throw error if empty
          if (Object.keys(updatedValue).length === 0) {
            throw new Error('Updated value must not be empty(single)')
          }

          // throw error if more than one key
          if (Object.keys(updatedValue).length > 1) {
            throw new Error(
              `Updated value must contain a single key as input, received ${Object.keys(updatedValue).length} keys(single)`,
            )
          }

          // throw error if does not have the same key
          Object.keys(updatedValue).forEach((key) => {
            if (key !== keys) {
              throw new Error(
                `Updated value expected ${keys}, but found ${key}(single)`,
              )
            }
          })

          // Destructure keys from updatedValues
          Object.entries(updatedValue).forEach(([key, value]) => {
            newState[key] = value
          })
        }

        state = newState
      } finally {
        release()
      }
    },
  }
}
