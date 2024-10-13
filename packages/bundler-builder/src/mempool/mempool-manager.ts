import { BigNumber, BigNumberish } from 'ethers'

import { Logger } from '../../../shared/logger/index.js'
import { ReputationManager } from '../reputation/index.js'
import { RelayUserOpParam, UserOperation } from '../../../shared/types/index.js'
import {
  StakeInfo,
  ValidationErrors,
} from '../../../shared/validatation/index.js'
import { RpcError, requireCond } from '../../../shared/utils/index.js'
import {
  EntryCount,
  EntryStatus,
  MempoolEntry,
  MempoolStateKey,
  MempoolStateService,
} from './mempool.types.js'

export type MempoolManager = {
  /**
   * Returns all addresses that are currently known to be "senders" according to the current mempool.
   *
   * @returns - An array of known sender addresses in lowercase.
   */
  getKnownSenders(): Promise<string[]>

  /**
   * Returns all addresses that are currently known to be any kind of entity according to the current mempool.
   * Note that "sender" addresses are not returned by this function. Use {@link getKnownSenders} instead.
   *
   * @returns - An array of known entity addresses in lowercase.
   */
  getKnownEntities(): Promise<string[]>

  /**
   * Add userOp into the mempool, after initial validation.
   * replace existing, if any (and if new gas is higher)
   * reverts if unable to add UserOp to mempool (too many UserOps with this sender)
   *
   * @param relayUserOpParam - The UserOperation to add to the mempool.
   */
  addUserOp(relayUserOpParam: RelayUserOpParam): Promise<void>

  /**
   * Retrieves the MempoolEntry associated with the given hash string key.
   *
   * @param userOpHash - The userOpHash to search for.
   * @returns - The MempoolEntry associated with the userOpHash, or undefined if not found.
   */
  findByHash(userOpHash: string): Promise<MempoolEntry | undefined>

  /**
   * Removes the MempoolEntry with the given userOpHash string key from the mempool.
   *
   * @param userOpOrHash - The UserOperation or its hash to remove from the mempool.
   * @returns - True if the UserOperation was removed, false otherwise.
   */
  removeUserOp(userOpOrHash: string | UserOperation): Promise<boolean>

  /**
   * Retrieves the next pending UserOperation from the mempool.
   * Updates the status of the retrieved UserOperation to 'bundling'.
   *
   * @returns - An array of MempoolEntry objects that are pending.
   */
  getNextPending(): Promise<MempoolEntry[]>

  /**
   * Retrieves all pending UserOperations from the mempool.
   * Updates the status of the retrieved UserOperations to 'bundling'.
   *
   * @returns - An array of MempoolEntry objects that are pending.
   */
  getAllPending(): Promise<MempoolEntry[]>

  /**
   * Updates the status of the UserOperation with the given userOpHash to the given status.
   *
   * @param userOpHash - The hash of the UserOperation to update.
   * @param status - The new status of the UserOperation.
   */
  updateEntryStatus(userOpHash: string, status: EntryStatus): Promise<void>

  /**
   * Checks if the mempool is overloaded using the current bundleSize.
   *
   * @returns - True if the mempool is overloaded, false otherwise.
   */
  isMempoolOverloaded(): Promise<boolean>

  /**
   * Returns the current size of the mempool(i.e. the number of UserOperations in the mempool).
   *
   * @returns - The number of UserOperations in the mempool.
   */
  size(): Promise<number>

  /**
   * Clears the state of the mempool.
   */
  clearState(): Promise<void>

  /**
   * Dumps the current state of the mempool to the log.
   *
   * @returns - An array of UserOperation objects in the mempool
   */
  dump(): Promise<UserOperation[]>
}

export const createMempoolManager = (
  mp: MempoolStateService,
  reputationManager: ReputationManager,
  bundleSize: number, // maximum # of pending mempool entities
): MempoolManager => {
  const MAX_MEMPOOL_USEROPS_PER_SENDER = 4 // max # of pending mempool entities per sender
  const THROTTLED_ENTITY_MEMPOOL_COUNT = 4
  Logger.info(
    `Setting bundleSize=${bundleSize} and MAX_MEMPOOL_USEROPS_PER_SENDER=${MAX_MEMPOOL_USEROPS_PER_SENDER}`,
  )

  const checkReplaceUserOp = (
    oldEntry: MempoolEntry,
    entry: MempoolEntry,
  ): void => {
    const oldMaxPriorityFeePerGas = BigNumber.from(
      oldEntry.userOp.maxPriorityFeePerGas,
    ).toNumber()
    const newMaxPriorityFeePerGas = BigNumber.from(
      entry.userOp.maxPriorityFeePerGas,
    ).toNumber()
    const oldMaxFeePerGas = BigNumber.from(
      oldEntry.userOp.maxFeePerGas,
    ).toNumber()
    const newMaxFeePerGas = BigNumber.from(entry.userOp.maxFeePerGas).toNumber()
    // the error is "invalid fields", even though it is detected only after validation
    requireCond(
      newMaxPriorityFeePerGas >= oldMaxPriorityFeePerGas * 1.1,
      `Replacement UserOperation must have higher maxPriorityFeePerGas (old=${oldMaxPriorityFeePerGas} new=${newMaxPriorityFeePerGas}) `,
      ValidationErrors.InvalidFields,
    )
    requireCond(
      newMaxFeePerGas >= oldMaxFeePerGas * 1.1,
      `Replacement UserOperation must have higher maxFeePerGas (old=${oldMaxFeePerGas} new=${newMaxFeePerGas}) `,
      ValidationErrors.InvalidFields,
    )
  }

  // Funtions to interface with reputationManager
  const checkReputationStatus = async (
    title: 'account' | 'paymaster' | 'aggregator' | 'deployer',
    stakeInfo: StakeInfo,
    maxTxMempoolAllowedOverride?: number,
  ): Promise<void> => {
    const maxTxMempoolAllowedEntity =
      maxTxMempoolAllowedOverride ??
      (await reputationManager.calculateMaxAllowedMempoolOpsUnstaked(
        stakeInfo.addr,
      ))

    await reputationManager.checkBanned(title, stakeInfo)

    const { mempoolEntryCount } = await mp.getState(
      MempoolStateKey.MempoolEntryCount,
    )
    const foundCount = mempoolEntryCount[stakeInfo.addr.toLowerCase()] ?? 0
    if (foundCount > THROTTLED_ENTITY_MEMPOOL_COUNT) {
      await reputationManager.checkThrottled(title, stakeInfo)
    }
    if (foundCount > maxTxMempoolAllowedEntity) {
      await reputationManager.checkStake(title, stakeInfo)
    }
  }

  const checkReputation = async (
    senderInfo: StakeInfo,
    paymasterInfo?: StakeInfo,
    factoryInfo?: StakeInfo,
    aggregatorInfo?: StakeInfo,
  ): Promise<void> => {
    await checkReputationStatus(
      'account',
      senderInfo,
      MAX_MEMPOOL_USEROPS_PER_SENDER,
    )

    if (paymasterInfo != null) {
      await checkReputationStatus('paymaster', paymasterInfo)
    }

    if (factoryInfo != null) {
      await checkReputationStatus('deployer', factoryInfo)
    }

    if (aggregatorInfo != null) {
      await checkReputationStatus('aggregator', aggregatorInfo)
    }
  }

  const updateSeenStatus = async (
    aggregator: string | undefined,
    userOp: UserOperation,
    senderInfo: StakeInfo,
  ): Promise<void> => {
    try {
      await reputationManager.checkStake('account', senderInfo)
      await reputationManager.updateSeenStatus(userOp.sender)
    } catch (e: any) {
      if (!(e instanceof RpcError)) throw e
    }

    // TODO: This can be batched to optimize performance
    await reputationManager.updateSeenStatus(aggregator)
    await reputationManager.updateSeenStatus(userOp.paymaster)
    await reputationManager.updateSeenStatus(userOp.factory)
  }

  const getKnownSenders = async (): Promise<string[]> => {
    const { standardPool } = await mp.getState(MempoolStateKey.StandardPool)
    const entries = Object.values(standardPool)
    if (entries.length === 0) {
      return []
    }

    const initialValue: string[] = []
    return entries
      .map((mempoolEntry) => mempoolEntry.userOp)
      .reduce((acc, userOp) => {
        return [...acc, userOp.sender.toLowerCase()]
      }, initialValue)
  }

  const getKnownEntities = async (): Promise<string[]> => {
    const { standardPool } = await mp.getState(MempoolStateKey.StandardPool)
    const entries = Object.values(standardPool)
    if (entries.length === 0) {
      return []
    }

    const initialValue: string[] = []
    const res = entries
      .map((mempoolEntry) => mempoolEntry.userOp)
      .reduce((acc, userOp) => {
        return [
          ...acc,
          userOp.paymaster ? userOp.paymaster : '0x',
          userOp.factory ? userOp.factory : '0x',
        ]
      }, initialValue)

    return res
      .filter((entryAddress) => entryAddress != '0x')
      .map((it) => (it as string).toLowerCase())
  }

  /**
   * Checks if the UserOperation violates the multiple roles rule.
   * If the factory or paymaster is the same as the sender, an error is thrown.
   *
   * @param userOp - The UserOperation to check for multiple roles violation.
   * @throws - If the sender is found in the known entities or if the paymaster or factory is found in known senders.
   */
  const checkMultipleRolesViolation = async (
    userOp: UserOperation,
  ): Promise<void> => {
    const knownEntities = await getKnownEntities()
    requireCond(
      !knownEntities.includes(userOp.sender.toLowerCase()),
      `The sender address "${userOp.sender}" is used as a different entity in another UserOperation currently in mempool`,
      ValidationErrors.OpcodeValidation,
    )

    const knownSenders = await getKnownSenders()
    const paymaster = userOp.paymaster
    const factory = userOp.factory

    const isPaymasterSenderViolation = knownSenders.includes(
      paymaster?.toLowerCase() ?? '',
    )
    const isFactorySenderViolation = knownSenders.includes(
      factory?.toLowerCase() ?? '',
    )

    requireCond(
      !isPaymasterSenderViolation,
      `A Paymaster at ${paymaster as string} in this UserOperation is used as a sender entity in another UserOperation currently in mempool.`,
      ValidationErrors.OpcodeValidation,
    )
    requireCond(
      !isFactorySenderViolation,
      `A Factory at ${factory as string} in this UserOperation is used as a sender entity in another UserOperation currently in mempool.`,
      ValidationErrors.OpcodeValidation,
    )
  }

  /**
   * Finds a MempoolEntry by the sender address and nonce.
   *
   * @param sender - The sender address to search for.
   * @param nonce - The nonce to search for.
   * @returns - The MempoolEntry associated with the sender and nonce, or undefined if not found.
   */
  const findBySenderNonce = async (
    sender: string,
    nonce: BigNumberish,
  ): Promise<MempoolEntry | undefined> => {
    const { standardPool } = await mp.getState(MempoolStateKey.StandardPool)
    const entries = Object.values(standardPool)
    if (entries.length === 0) {
      return undefined
    }

    const res = entries.find((entry) => {
      return (
        entry.userOp.sender.toLowerCase() === sender.toLowerCase() &&
        BigNumber.from(entry.userOp.nonce).eq(nonce)
      )
    })

    return res
  }

  return {
    getKnownSenders,
    getKnownEntities,

    addUserOp: async (relayUserOpParam: RelayUserOpParam): Promise<void> => {
      Logger.debug('Attempting to add UserOperation to mempool')
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

      const entry: MempoolEntry = {
        userOp,
        userOpHash,
        prefund,
        referencedContracts,
        status: 'pending',
        aggregator: aggregatorInfo?.addr,
      }

      const oldEntry = await findBySenderNonce(userOp.sender, userOp.nonce)
      if (oldEntry) {
        checkReplaceUserOp(oldEntry, entry)
        await mp.updateState(
          MempoolStateKey.StandardPool,
          ({ standardPool }) => {
            delete standardPool[oldEntry.userOpHash]
            return {
              standardPool: {
                ...standardPool,
                [userOpHash]: entry,
              },
            }
          },
        )

        Logger.debug(
          {
            sender: userOp.sender,
            nonce: userOp.nonce,
            userOpHash,
            status: entry.status,
          },
          'replace userOp in mempool',
        )
      } else {
        Logger.debug('New entry, checking reputation and throttling...')
        await checkReputation(
          senderInfo,
          paymasterInfo,
          factoryInfo,
          aggregatorInfo,
        )
        await checkMultipleRolesViolation(userOp)

        Logger.debug(
          'Reputation and throttling checks passed, adding to mempool...',
        )
        await mp.updateState(
          [MempoolStateKey.StandardPool, MempoolStateKey.MempoolEntryCount],
          ({ standardPool, mempoolEntryCount }) => {
            Logger.debug({ addr: userOp.sender }, 'Updating sender count...')
            const sender = userOp.sender.toLowerCase()
            const entriesCountToUpdate: EntryCount = {
              [sender]: (mempoolEntryCount[sender] ?? 0) + 1,
            }

            if (userOp.paymaster) {
              const paymaster = userOp.paymaster.toLowerCase()
              if (paymaster !== '0x') {
                Logger.debug({ addr: paymaster }, 'Updating paymaster count...')
                entriesCountToUpdate[paymaster] =
                  (mempoolEntryCount[paymaster] ?? 0) + 1
              }
            }

            if (userOp.factory) {
              const factory = userOp.factory.toLowerCase()
              if (factory !== '0x') {
                Logger.debug({ addr: factory }, 'Updating factory count...')
                entriesCountToUpdate[factory] =
                  (mempoolEntryCount[factory] ?? 0) + 1
              }
            }

            return {
              standardPool: {
                ...standardPool,
                [userOpHash]: entry,
              },
              mempoolEntryCount: {
                ...mempoolEntryCount,
                ...entriesCountToUpdate,
              },
            }
          },
        )
      }

      await updateSeenStatus(aggregatorInfo?.addr, userOp, senderInfo)
      Logger.debug(
        {
          sender: userOp.sender,
          nonce: userOp.nonce,
          userOpHash,
          status: entry.status,
        },
        'Successfully added UserOperation to mempool',
      )
    },

    findByHash: async (
      userOpHash: string,
    ): Promise<MempoolEntry | undefined> => {
      const { standardPool } = await mp.getState(MempoolStateKey.StandardPool)
      return standardPool[userOpHash]
    },

    removeUserOp: async (
      userOpOrHash: string | UserOperation,
    ): Promise<boolean> => {
      let entry: MempoolEntry | undefined
      if (typeof userOpOrHash === 'string') {
        const { standardPool } = await mp.getState(MempoolStateKey.StandardPool)
        entry = standardPool[userOpOrHash]
      } else {
        entry = await findBySenderNonce(userOpOrHash.sender, userOpOrHash.nonce)
      }

      if (!entry) {
        return false
      }

      const userOpHash = entry.userOpHash
      await mp.updateState(
        [MempoolStateKey.StandardPool, MempoolStateKey.MempoolEntryCount],
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

    getNextPending: async (): Promise<MempoolEntry[]> => {
      const { standardPool } = await mp.getState(MempoolStateKey.StandardPool)

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
      await mp.updateState(MempoolStateKey.StandardPool, ({ standardPool }) => {
        userOpHashes.forEach((hash) => {
          standardPool[hash].status = 'bundling'
        })
        return { standardPool }
      })

      return foundPendingEntries
    },

    getAllPending: async (): Promise<MempoolEntry[]> => {
      const { standardPool } = await mp.getState(MempoolStateKey.StandardPool)

      const entries = Object.values(standardPool).filter(
        (entry) => entry.status === 'pending',
      )

      // Update the status of the entries to 'bundling'
      const userOpHashes = entries.map((entry) => entry.userOpHash)
      await mp.updateState(MempoolStateKey.StandardPool, ({ standardPool }) => {
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
      const { standardPool } = await mp.getState(MempoolStateKey.StandardPool)
      const entry = standardPool[userOpHash]
      if (entry) {
        await mp.updateState(
          MempoolStateKey.StandardPool,
          ({ standardPool }) => {
            return {
              standardPool: {
                ...standardPool,
                [userOpHash]: {
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
      const { standardPool } = await mp.getState(MempoolStateKey.StandardPool)
      return Object.keys(standardPool).length >= bundleSize
    },

    size: async (): Promise<number> => {
      const { standardPool } = await mp.getState(MempoolStateKey.StandardPool)
      return Object.keys(standardPool).length
    },

    clearState: async (): Promise<void> => {
      await mp.updateState(
        [MempoolStateKey.StandardPool, MempoolStateKey.MempoolEntryCount],
        (_) => {
          return {
            standardPool: {},
            mempoolEntryCount: {},
          }
        },
      )
    },

    dump: async (): Promise<UserOperation[]> => {
      const { standardPool, mempoolEntryCount } = await mp.getState([
        MempoolStateKey.StandardPool,
        MempoolStateKey.MempoolEntryCount,
      ])

      Logger.debug(
        '_______________________________MEMPOOL DUMP____________________________________________',
      )
      Logger.debug(`Mempool size: ${Object.keys(standardPool).length}`)
      Logger.debug({ entryCount: mempoolEntryCount }, 'Mempool entryCount')
      Logger.debug(
        '________________________________________________________________________________________',
      )

      return Object.values(standardPool).map(
        (mempoolEntry) => mempoolEntry.userOp,
      )
    },
  }
}
