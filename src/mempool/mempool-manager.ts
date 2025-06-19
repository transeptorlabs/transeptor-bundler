import { DepositManager } from '../deposit/index.js'
import { Either } from '../monad/index.js'
import {
  StateKey,
  StateService,
  EntryStatus,
  MempoolEntry,
  MempoolManagerBuilder,
  MempoolManagerCore,
  MempoolManageSender,
  MempoolManageUpdater,
  RelayUserOpParam,
  UserOperation,
  ReputationManager,
  RpcError,
  TranseptorLogger,
  Capability,
  CapabilityTypes,
} from '../types/index.js'
import {
  doUpdateMempoolState,
  findBySenderNonce,
  getKnownEntities,
  getKnownSenders,
  replaceOrAddUserOpChecks,
  updateSeenStatus,
} from './mempool-helper.js'
import { withReadonly } from '../utils/index.js'

export type MempoolManagerCoreConfig = {
  state: StateService
  reputationManager: ReputationManager
  depositManager: DepositManager
  logger: TranseptorLogger
  stateCapability: Capability<CapabilityTypes.State>

  /**
   * maximum # of entities allowed in a bundle
   */
  bundleSize: number
}

/**
 * Creates an instance of the MempoolManageSender module.
 *
 * @param mempoolManagerCore - The MempoolManagerCore instance.
 * @returns An instance of the MempoolManageSender module.
 */
function _createMempoolManageSender(
  mempoolManagerCore: Readonly<MempoolManagerCore>,
): MempoolManageSender {
  return {
    addUserOp: mempoolManagerCore.addUserOp,
  }
}

/**
 * Creates an instance of the MempoolManageUpdater module.
 *
 * @param mempoolManagerCore - The MempoolManagerCore instance.
 * @returns An instance of the MempoolManageUpdater module.
 */
function _createMempoolManageUpdater(
  mempoolManagerCore: Readonly<MempoolManagerCore>,
): MempoolManageUpdater {
  return {
    removeUserOp: mempoolManagerCore.removeUserOp,
    updateEntryStatus: mempoolManagerCore.updateEntryStatus,
  }
}

/**
 * Creates an instance of the MempoolManagerBuilder module.
 *
 * @param mempoolManagerCore - The MempoolManagerCore instance.
 * @returns An instance of the MempoolManagerBuilder module.
 */
function _createMempoolManagerBuilder(
  mempoolManagerCore: Readonly<MempoolManagerCore>,
): MempoolManagerBuilder {
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

/**
 * Creates an instance of the MempoolManagerCore module.
 *
 * @param config - The configuration object for the MempoolManagerCore instance.
 * @returns An instance of the MempoolManagerCore module.
 */
function _createMempoolManagerCore(
  config: Readonly<MempoolManagerCoreConfig>,
): MempoolManagerCore {
  const {
    state,
    reputationManager,
    depositManager,
    bundleSize,
    logger,
    stateCapability,
  } = config

  return {
    getKnownSenders: async (): Promise<string[]> => {
      const standardPool = await state.getState(
        stateCapability,
        StateKey.StandardPool,
      )
      return getKnownSenders(standardPool.standardPool)
    },

    getKnownEntities: async (): Promise<string[]> => {
      const standardPool = await state.getState(
        stateCapability,
        StateKey.StandardPool,
      )
      return getKnownEntities(standardPool.standardPool)
    },

    addUserOp: async (
      relayUserOpParam: RelayUserOpParam,
    ): Promise<Either<RpcError, string>> => {
      logger.debug('Attempting to replace/add UserOperation to mempool')
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
      const { standardPool, mempoolEntryCount } = await state.getState(
        stateCapability,
        [StateKey.StandardPool, StateKey.MempoolEntryCount],
      )

      logger.debug('Old entry found, checking if needs replacement...')
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

      logger.debug('Reputation and throttling checks passed')
      return res.foldAsync(
        async (error) => Either.Left(error),
        async ([entry, metadata]) => {
          await state.updateState(
            stateCapability,
            [StateKey.StandardPool, StateKey.MempoolEntryCount],
            (stateData) =>
              doUpdateMempoolState(
                [entry, metadata],
                stateData.standardPool,
                stateData.mempoolEntryCount,
              ),
          )

          if (metadata.oldEntry) {
            await updateSeenStatus(
              metadata.oldEntry.aggregator,
              metadata.oldEntry.userOp,
              reputationManager,
              senderInfo,
              'decrement',
            )
          }

          await updateSeenStatus(
            aggregatorInfo?.addr,
            userOp,
            reputationManager,
            senderInfo,
            'increment',
          )
          logger.debug(
            {
              sender: userOp.sender,
              nonce: userOp.nonce,
              userOpHash,
              status: entry.status,
              is7702: userOp.eip7702Auth != null,
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
      const { standardPool } = await state.getState(
        stateCapability,
        StateKey.StandardPool,
      )
      return standardPool[userOpHash]
    },

    removeUserOp: async (
      userOpOrHash: string | UserOperation,
    ): Promise<boolean> => {
      let entry: MempoolEntry | undefined
      const { standardPool } = await state.getState(
        stateCapability,
        StateKey.StandardPool,
      )
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
        stateCapability,
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
      const { standardPool } = await state.getState(
        stateCapability,
        StateKey.StandardPool,
      )
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
        stateCapability,
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
      const { standardPool } = await state.getState(
        stateCapability,
        StateKey.StandardPool,
      )

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
      await state.updateState(
        stateCapability,
        StateKey.StandardPool,
        ({ standardPool }) => {
          userOpHashes.forEach((hash) => {
            standardPool[hash].status = 'bundling'
          })
          return { standardPool }
        },
      )

      return foundPendingEntries
    },

    getAllPending: async (): Promise<MempoolEntry[]> => {
      const { standardPool } = await state.getState(
        stateCapability,
        StateKey.StandardPool,
      )

      const entries = Object.values(standardPool).filter(
        (entry) => entry.status === 'pending',
      )

      // Update the status of the entries to 'bundling'
      const userOpHashes = entries.map((entry) => entry.userOpHash)
      await state.updateState(
        stateCapability,
        StateKey.StandardPool,
        ({ standardPool }) => {
          userOpHashes.forEach((hash) => {
            standardPool[hash].status = 'bundling'
          })
          return { standardPool }
        },
      )

      return entries
    },

    updateEntryStatus: async (
      userOpOrHash: string | UserOperation,
      status: EntryStatus,
    ): Promise<void> => {
      let entry: MempoolEntry | undefined
      const { standardPool } = await state.getState(
        stateCapability,
        StateKey.StandardPool,
      )
      if (typeof userOpOrHash === 'string') {
        entry = standardPool[userOpOrHash]
      } else {
        entry = findBySenderNonce(
          userOpOrHash.sender,
          userOpOrHash.nonce,
          standardPool,
        )
      }

      if (entry) {
        logger.debug(
          `Updating UserOperation status: ${entry.userOpHash} to ${status}`,
        )
        await state.updateState(
          stateCapability,
          StateKey.StandardPool,
          ({ standardPool }) => {
            return {
              standardPool: {
                ...standardPool,
                [entry.userOpHash]: {
                  ...entry,
                  status,
                },
              },
            }
          },
        )
      }
    },

    isMempoolOverloaded: async (): Promise<boolean> => {
      const { standardPool } = await state.getState(
        stateCapability,
        StateKey.StandardPool,
      )
      return Object.keys(standardPool).length >= bundleSize
    },

    size: async (): Promise<number> => {
      const { standardPool } = await state.getState(
        stateCapability,
        StateKey.StandardPool,
      )
      return Object.keys(standardPool).length
    },

    clearState: async (): Promise<boolean> => {
      return state.updateState(
        stateCapability,
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
      const { standardPool } = await state.getState(
        stateCapability,
        StateKey.StandardPool,
      )

      return Object.values(standardPool).map(
        (mempoolEntry) => mempoolEntry.userOp,
      )
    },
  }
}

export const createMempoolManageSender = withReadonly<
  MempoolManagerCore,
  MempoolManageSender
>(_createMempoolManageSender)

export const createMempoolManagerBuilder = withReadonly<
  MempoolManagerCore,
  MempoolManagerBuilder
>(_createMempoolManagerBuilder)

export const createMempoolManageUpdater = withReadonly<
  MempoolManagerCore,
  MempoolManageUpdater
>(_createMempoolManageUpdater)

export const createMempoolManagerCore = withReadonly<
  MempoolManagerCoreConfig,
  MempoolManagerCore
>(_createMempoolManagerCore)
