/* eslint-disable no-console */
import { createState, StateKey, StateService } from '../src/state/index.js'

const sharedState = createState()

/**
 * Simulating concurrent requests
 */
const simulateConcurrentRequests = async () => {
  const incrementPromises = Array.from({ length: 10 }, (_, i) =>
    sharedState.updateState(StateKey.StandardPool, (currentValue) => {
      return {
        standardPool: {
          ...currentValue.standardPool,
          [`0x_some_hash _${i}`]: {
            userOp: {
              sender: '',
              nonce: '',
              factory: '',
              factoryData: '',
              callData: '',
              callGasLimit: '',
              verificationGasLimit: '',
              preVerificationGas: '',
              maxFeePerGas: '',
              maxPriorityFeePerGas: '',
              paymaster: '',
              paymasterVerificationGasLimit: '',
              paymasterPostOpGasLimit: '',
              paymasterData: '',
              signature: '',
            },
            userOpHash: '',
            prefund: '',
            referencedContracts: {
              addresses: [],
              hash: '',
            },
            status: 'pending',
          },
        },
      }
    }),
  )

  const addEntryCountPromises = Array.from({ length: 5 }, (_, i) =>
    sharedState.updateState(
      StateKey.MempoolEntryCount,
      ({ mempoolEntryCount }) => {
        const address = `0x_some_address_${i}`
        if (mempoolEntryCount[address] === undefined) {
          return {
            mempoolEntryCount: {
              ...mempoolEntryCount,
              [address]: 1,
            },
          }
        }

        return {
          mempoolEntryCount: {
            ...mempoolEntryCount,
            [address]: mempoolEntryCount[address] + 1,
          },
        }
      },
    ),
  )

  await Promise.all([...incrementPromises, ...addEntryCountPromises])

  // Expected output
  console.log('Standard Pool')
  const { standardPool, mempoolEntryCount } = await sharedState.getState([
    StateKey.StandardPool,
    StateKey.MempoolEntryCount,
  ])
  Object.entries(standardPool).forEach(([key, value]) => {
    console.log(`Key: ${key}, Value: ${value}`)
  })

  console.log('Entry Count')
  Object.entries(mempoolEntryCount).forEach(([key, value]) => {
    console.log(`Key: ${key}, Value: ${value}`)
  })
}

/**
 * Simple manager to handle state updates
 *
 * @param passedSharedState - StateService.
 * @returns  - Manager object with methods to update state.
 */
const createManager = (passedSharedState: StateService) => {
  return {
    addEntry: async () => {
      await passedSharedState.updateState(
        StateKey.MempoolEntryCount,
        ({ mempoolEntryCount }) => {
          const address = '0x_some_address_100'
          return {
            mempoolEntryCount: {
              ...mempoolEntryCount,
              [address]: 1,
            },
          }
        },
      )
    },
  }
}

const main = async () => {
  await simulateConcurrentRequests()

  // After the concurrent requests
  const manager = createManager(sharedState)
  await manager.addEntry()
  console.log('Entry Count After')
  const { mempoolEntryCount } = await sharedState.getState(
    StateKey.MempoolEntryCount,
  )
  Object.entries(mempoolEntryCount).forEach(([key, value]) => {
    console.log(`Key: ${key}, Value: ${value}`)
  })
}

main().catch(async (error: any) => {
  console.error(error.message)
  process.exit(1)
})
