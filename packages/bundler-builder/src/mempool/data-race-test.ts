import { createMempoolState, MempoolStateService } from './mempool-state.js'
import {
  MempoolEntry,
  MempoolState,
  MempoolStateKeys,
} from './mempool.types.js'

const sharedState = createMempoolState()

// Pure functions to define how the state should be updated
const addMempoolEntry =
  (hash: string, opEntry: MempoolEntry) => (state: MempoolState) => {
    return {
      ...state,
      standardPool: {
        ...state.standardPool,
        [hash]: opEntry,
      },
    }
  }

const addToEntryCount = (address: string) => (state: MempoolState) => {
  if (state.mempoolEntryCount[address] === undefined) {
    return {
      ...state,
      mempoolEntryCount: {
        ...state.mempoolEntryCount,
        [address]: 1,
      },
    }
  }

  return {
    ...state,
    entryCount: {
      ...state.mempoolEntryCount,
      [address]: state.mempoolEntryCount[address] + 1,
    },
  }
}

/**
 * Simulating concurrent requests
 */
const simulateConcurrentRequests = async () => {
  const incrementPromises = Array.from({ length: 10 }, (_, i) =>
    sharedState.updateState(
      addMempoolEntry(`0x_some_hash _${i}`, {
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
      }),
    ),
  )
  const addEntryCountPromises = Array.from({ length: 5 }, (_, i) =>
    sharedState.updateState(addToEntryCount(`0x_some_address_${i}`)),
  )

  await Promise.all([...incrementPromises, ...addEntryCountPromises])

  // Expected output
  console.log('Standard Pool')
  const { standardPool, mempoolEntryCount } = await sharedState.getState([
    MempoolStateKeys.StandardPool,
    MempoolStateKeys.MempoolEntryCount,
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
 * @param passedSharedState - MempoolStateService.
 * @returns  - Manager object with methods to update state.
 */
const createManager = (passedSharedState: MempoolStateService) => {
  return {
    addEntry: async () => {
      await passedSharedState.updateState(
        addToEntryCount(`0x_some_address_manager_${100}`),
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
    MempoolStateKeys.MempoolEntryCount,
  )
  Object.entries(mempoolEntryCount).forEach(([key, value]) => {
    console.log(`Key: ${key}, Value: ${value}`)
  })
}

main().catch(async (error: any) => {
  console.error(error.message)
  process.exit(1)
})
