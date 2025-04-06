import { Logger } from '../logger/index.js'
import {
  RelayUserOpParam,
  UserOperation,
  ReputationManager,
  RpcError,
} from '../types/index.js'
import {
  StateKey,
  StateService,
  EntryStatus,
  MempoolEntry,
} from '../types/index.js'
import { DepositManager } from '../deposit/index.js'
import { Either } from '../monad/index.js'
import {
  MempoolManagerBuilder,
  MempoolManagerCore,
  MempoolManageSender,
  MempoolManageUpdater,
} from '../types/index.js'
import {
  doUpdateMempoolState,
  findBySenderNonce,
  getKnownEntities,
  getKnownSenders,
  replaceOrAddUserOpChecks,
  updateSeenStatus,
} from './mempool-helper.js'

export const createMempoolManageSender = (
  mempoolManagerCore: MempoolManagerCore,
): MempoolManageSender => {
  return {
    addUserOp: mempoolManagerCore.addUserOp,
  }
}

export const createMempoolManageUpdater = (
  mempoolManagerCore: MempoolManagerCore,
): MempoolManageUpdater => {
  return {
    removeUserOp: mempoolManagerCore.removeUserOp,
    updateEntryStatus: mempoolManagerCore.updateEntryStatus,
  }
}

export const createMempoolManagerBuilder = (
  mempoolManagerCore: MempoolManagerCore,
): MempoolManagerBuilder => {
  return {
    size: mempoolManagerCore.size,
    getAllPending: mempoolManagerCore.getAllPending,
    getNextPending: mempoolManagerCore.getNextPending,
    getKnownSenders: mempoolManagerCore.getKnownSenders,
    updateEntryStatus: mempoolManagerCore.updateEntryStatus,
    removeUserOp: mempoolManagerCore.removeUserOp,
    removeUserOpsForBannedAddr: mempoolManagerCore.removeUserOpsForBannedAddr,
  }
}

export const createMempoolManagerCore = (
  state: StateService,
  reputationManager: ReputationManager,
  depositManager: DepositManager,
  bundleSize: number, // maximum # of entities allowed in a bundle
): MempoolManagerCore => {
  return {
    getKnownSenders: async (): Promise<string[]> => {
      const standardPool = await state.getState(StateKey.StandardPool)
      return getKnownSenders(standardPool.standardPool)
    },

    getKnownEntities: async (): Promise<string[]> => {
      const standardPool = await state.getState(StateKey.StandardPool)
      return getKnownEntities(standardPool.standardPool)
    },

    addUserOp: async (
      relayUserOpParam: RelayUserOpParam,
    ): Promise<Either<RpcError, string>> => {
      Logger.debug('Attempting to replace/add UserOperation to mempool')
      const {
        userOp,
        userOpHash,
        prefund,
        referencedContracts,
        senderInfo,
        paymasterInfo,
        factoryInfo,
        aggregatorInfo,
      } = relayUserOpParam

      await depositManager.checkPaymasterDeposit(userOp)
      const { standardPool, mempoolEntryCount } = await state.getState([
        StateKey.StandardPool,
        StateKey.MempoolEntryCount,
      ])

      const res = await replaceOrAddUserOpChecks(
        reputationManager,
        mempoolEntryCount,
        standardPool,
        [
          {
            userOp,
            userOpHash,
            prefund,
            referencedContracts,
            status: 'pending',
            aggregator: aggregatorInfo?.addr,
          },
          {
            senderInfo,
            paymasterInfo,
            factoryInfo,
            aggregatorInfo,
          },
        ],
      )

      return res.foldAsync(
        async (error) => Either.Left(error),
        async ([entry, metadata]) => {
          await state.updateState(
            [StateKey.StandardPool, StateKey.MempoolEntryCount],
            (stateData) =>
              doUpdateMempoolState(
                [entry, metadata],
                stateData.standardPool,
                stateData.mempoolEntryCount,
              ),
          )

          await updateSeenStatus(
            aggregatorInfo?.addr,
            userOp,
            reputationManager,
          )
          Logger.debug(
            {
              sender: userOp.sender,
              nonce: userOp.nonce,
              userOpHash,
              status: entry.status,
            },
            'Successfully added/updated UserOperation to mempool',
          )

          return Either.Right(userOpHash)
        },
      )
    },

    findByHash: async (
      userOpHash: string,
    ): Promise<MempoolEntry | undefined> => {
      const { standardPool } = await state.getState(StateKey.StandardPool)
      return standardPool[userOpHash]
    },

    removeUserOp: async (
      userOpOrHash: string | UserOperation,
    ): Promise<boolean> => {
      let entry: MempoolEntry | undefined
      const { standardPool } = await state.getState(StateKey.StandardPool)
      if (typeof userOpOrHash === 'string') {
        entry = standardPool[userOpOrHash]
      } else {
        entry = findBySenderNonce(
          userOpOrHash.sender,
          userOpOrHash.nonce,
          standardPool,
        )
      }

      if (!entry) {
        return false
      }

      const userOpHash = entry.userOpHash
      await state.updateState(
        [StateKey.StandardPool, StateKey.MempoolEntryCount],
        ({ standardPool, mempoolEntryCount }) => {
          delete standardPool[userOpHash]

          const count = (mempoolEntryCount[entry.userOp.sender] ?? 0) - 1
          count <= 0
            ? delete mempoolEntryCount[entry.userOp.sender]
            : (mempoolEntryCount[entry.userOp.sender] = count)

          return {
            standardPool,
            mempoolEntryCount,
          }
        },
      )

      return true
    },

    removeUserOpsForBannedAddr: async (addr: string): Promise<void> => {
      const { standardPool } = await state.getState(StateKey.StandardPool)
      const opsToRemove = Object.values(standardPool).filter((entry) => {
        const userOp = entry.userOp
        if (
          userOp.sender === addr ||
          userOp.paymaster === addr ||
          userOp.factory === addr
        ) {
          return [userOp, entry.userOpHash] as [UserOperation, string]
        }
      })

      await state.updateState(
        [StateKey.StandardPool, StateKey.MempoolEntryCount],
        ({ standardPool, mempoolEntryCount }) => {
          opsToRemove.forEach((entry) => {
            delete standardPool[entry.userOpHash]
            delete mempoolEntryCount[entry.userOp.sender]

            if (entry.userOp.paymaster) {
              delete mempoolEntryCount[entry.userOp.paymaster]
            }

            if (entry.userOp.factory) {
              delete mempoolEntryCount[entry.userOp.factory]
            }
          })
          return {
            standardPool,
            mempoolEntryCount,
          }
        },
      )
    },

    getNextPending: async (): Promise<MempoolEntry[]> => {
      const { standardPool } = await state.getState(StateKey.StandardPool)

      let count = 0
      const foundPendingEntries: MempoolEntry[] = []
      Object.values(standardPool).forEach((entry) => {
        if (count < bundleSize && entry.status === 'pending') {
          count++
          foundPendingEntries.push(entry)
        }
      })

      // Update the status of the entries to 'bundling'
      const userOpHashes = foundPendingEntries.map((entry) => entry.userOpHash)
      await state.updateState(StateKey.StandardPool, ({ standardPool }) => {
        userOpHashes.forEach((hash) => {
          standardPool[hash].status = 'bundling'
        })
        return { standardPool }
      })

      return foundPendingEntries
    },

    getAllPending: async (): Promise<MempoolEntry[]> => {
      const { standardPool } = await state.getState(StateKey.StandardPool)

      const entries = Object.values(standardPool).filter(
        (entry) => entry.status === 'pending',
      )

      // Update the status of the entries to 'bundling'
      const userOpHashes = entries.map((entry) => entry.userOpHash)
      await state.updateState(StateKey.StandardPool, ({ standardPool }) => {
        userOpHashes.forEach((hash) => {
          standardPool[hash].status = 'bundling'
        })
        return { standardPool }
      })

      return entries
    },

    updateEntryStatus: async (
      userOpHash: string,
      status: EntryStatus,
    ): Promise<void> => {
      const { standardPool } = await state.getState(StateKey.StandardPool)
      const entry = standardPool[userOpHash]
      if (entry) {
        await state.updateState(StateKey.StandardPool, ({ standardPool }) => {
          return {
            standardPool: {
              ...standardPool,
              [userOpHash]: {
                ...entry,
                status,
              },
            },
          }
        })
      }
    },

    isMempoolOverloaded: async (): Promise<boolean> => {
      const { standardPool } = await state.getState(StateKey.StandardPool)
      return Object.keys(standardPool).length >= bundleSize
    },

    size: async (): Promise<number> => {
      const { standardPool } = await state.getState(StateKey.StandardPool)
      return Object.keys(standardPool).length
    },

    clearState: async (): Promise<boolean> => {
      return state.updateState(
        [StateKey.StandardPool, StateKey.MempoolEntryCount],
        (_) => {
          return {
            standardPool: {},
            mempoolEntryCount: {},
          }
        },
      )
    },

    dump: async (): Promise<UserOperation[]> => {
      const { standardPool } = await state.getState(StateKey.StandardPool)

      return Object.values(standardPool).map(
        (mempoolEntry) => mempoolEntry.userOp,
      )
    },
  }
}
