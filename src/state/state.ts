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
        }
        return { [keys]: state[keys] } as Pick<State, K>
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
        const newState = { ...state }

        // Helper functions
        const validateNonEmpty = (
          updatedValues: Partial<State>,
          keyType: 'single' | 'multiple',
        ) => {
          if (Object.keys(updatedValues).length === 0) {
            throw new Error(`Updated value must not be empty(${keyType})`)
          }
        }

        const validateKeysMatch = (
          updatedKeys: string[],
          expectedKeys: string[],
          keyType: 'single' | 'multiple',
        ) => {
          const missingKeys = expectedKeys.filter(
            (key) => !updatedKeys.includes(key),
          )
          if (missingKeys.length > 0) {
            throw new Error(
              `Updated value must contain the same keys as input, missing ${missingKeys.join(', ')}(${keyType})`,
            )
          }

          const extraKeys = updatedKeys.filter(
            (key) => !expectedKeys.includes(key),
          )
          if (extraKeys.length > 0) {
            throw new Error(
              `Updated value must only contain the same keys as input: received ${extraKeys.join(', ')}(${keyType})`,
            )
          }
        }

        // Process state update
        if (Array.isArray(keys)) {
          const currentValues = keys.reduce(
            (acc, key) => {
              acc[key] = state[key]
              return acc
            },
            {} as Pick<State, K>,
          )

          const updatedValues = updateFn(currentValues)

          validateNonEmpty(updatedValues, 'multiple')
          validateKeysMatch(Object.keys(updatedValues), keys, 'multiple')

          Object.assign(newState, updatedValues)
        } else {
          const currentValue = { [keys]: state[keys] } as Pick<State, K>
          const updatedValue = updateFn(currentValue)

          validateNonEmpty(updatedValue, 'single')
          validateKeysMatch(Object.keys(updatedValue), [keys], 'single')

          Object.assign(newState, updatedValue)
        }

        state = newState
      } finally {
        release()
      }
    },
  }
}
