import { BigNumber, BigNumberish } from 'ethers'

import { Logger } from '../../../shared/logger/index.js'
import { ReputationManager } from '../reputation/index.js'
import { RelayUserOpParam, UserOperation } from '../../../shared/types/index.js'
import {
  StakeInfo,
  ValidationErrors,
} from '../../../shared/validatation/index.js'
import { RpcError, requireCond } from '../../../shared/utils/index.js'
import { EntryCount, MempoolEntry, MempoolState } from './mempool.types.js'
import { MempoolStateService } from './mempool-state.js'

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

/* In-memory mempool with used to manage UserOperations.
  The MempoolManager class is a Hash Table data structure that provides efficient insertion, removal, and retrieval of items based on a hash string key. 
  It utilizes the async-mutex package to prevent race conditions when modifying or accessing the hash table state.

  Key methods and their functionality:
    - findByHash(): Retrieves the MempoolEntry associated with the given hash string key. It acquires the mutex to ensure thread-safety during access.
    - addUserOp(): Sets the value associated with the given userOpHash string key. It acquires the mutex to ensure thread-safety during modification.
    - removeUserOp(): Removes the MempoolEntry with the given userOpHash string key from the mempool. It acquires the mutex to ensure thread-safety during modification. Returns true if the item is successfully removed, and false if the item doesn't exist.
    - getNextIdle(): Gets items from the MempoolEntry in bundles of the specified bundleSize that have status of idle. It acquires the mutex to ensure thread-safety during modification. Returns an array of key-value pairs ([string, MempoolEntry]) representing the removed MempoolEntrys.
    - getNextIdle(): Gets all items from the MempoolEntry that have status of idle. It acquires the mutex to ensure thread-safety during modification. Returns an array of key-value pairs ([string, MempoolEntry]) representing the removed MempoolEntrys.
    - size: return current size of mempool for debugging
    - dump: print all items in mempool for debugging
    - clearState: clear all items in mempool for debugging
    */
export const createMempoolManager = (
  mp: MempoolStateService,
  bundleSize: number, // maximum # of pending mempool entities
  reputationManager: ReputationManager,
) => {
  const MAX_MEMPOOL_USEROPS_PER_SENDER = 4 // max # of pending mempool entities per sender
  const THROTTLED_ENTITY_MEMPOOL_COUNT = 4
  Logger.info(
    `In-memory Mempool initialized with bundleSize=${bundleSize} and MAX_MEMPOOL_USEROPS_PER_SENDER=${MAX_MEMPOOL_USEROPS_PER_SENDER}`,
  )

  // Funtions to interface with reputationManager
  const checkReputationStatus = (
    title: 'account' | 'paymaster' | 'aggregator' | 'deployer',
    stakeInfo: StakeInfo,
    maxTxMempoolAllowedOverride?: number,
  ): void => {
    const maxTxMempoolAllowedEntity =
      maxTxMempoolAllowedOverride ??
      reputationManager.calculateMaxAllowedMempoolOpsUnstaked(stakeInfo.addr)

    reputationManager.checkBanned(title, stakeInfo)

    const entryCount = mp.getMempoolEntryCount()
    const foundCount = entryCount[stakeInfo.addr.toLowerCase()] ?? 0
    if (foundCount > THROTTLED_ENTITY_MEMPOOL_COUNT) {
      reputationManager.checkThrottled(title, stakeInfo)
    }
    if (foundCount > maxTxMempoolAllowedEntity) {
      reputationManager.checkStake(title, stakeInfo)
    }
  }

  const checkReputation = (
    senderInfo: StakeInfo,
    paymasterInfo?: StakeInfo,
    factoryInfo?: StakeInfo,
    aggregatorInfo?: StakeInfo,
  ): void => {
    checkReputationStatus('account', senderInfo, MAX_MEMPOOL_USEROPS_PER_SENDER)

    if (paymasterInfo != null) {
      checkReputationStatus('paymaster', paymasterInfo)
    }

    if (factoryInfo != null) {
      checkReputationStatus('deployer', factoryInfo)
    }

    if (aggregatorInfo != null) {
      checkReputationStatus('aggregator', aggregatorInfo)
    }
  }

  const updateSeenStatus = (
    aggregator: string | undefined,
    userOp: UserOperation,
    senderInfo: StakeInfo,
  ): void => {
    try {
      reputationManager.checkStake('account', senderInfo)
      reputationManager.updateSeenStatus(userOp.sender)
    } catch (e: any) {
      if (!(e instanceof RpcError)) throw e
    }
    reputationManager.updateSeenStatus(aggregator)
    reputationManager.updateSeenStatus(userOp.paymaster)
    reputationManager.updateSeenStatus(userOp.factory)
  }

  /**
   * Returns all addresses that are currently known to be "senders" according to the current mempool.
   *
   * @returns - An array of known sender addresses in lowercase.
   */
  const getKnownSenders = async (): Promise<string[]> => {
    const currentMempool = await mp.getStandardPool()
    const entries = Object.values(currentMempool)
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

  /**
   * Returns all addresses that are currently known to be any kind of entity according to the current mempool.
   * Note that "sender" addresses are not returned by this function. Use {@link getKnownSenders} instead.
   *
   * @returns - An array of known entity addresses in lowercase.
   */
  const getKnownEntities = async (): Promise<string[]> => {
    const currentMempool = await mp.getStandardPool()
    const entries = Object.values(currentMempool)
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
  const checkMultipleRolesViolation = (userOp: UserOperation): void => {
    const knownEntities = getKnownEntities()
    requireCond(
      !knownEntities.includes(userOp.sender.toLowerCase()),
      `The sender address "${userOp.sender}" is used as a different entity in another UserOperation currently in mempool`,
      ValidationErrors.OpcodeValidation,
    )

    const knownSenders = getKnownSenders()
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

  const findBySenderNonce = async (
    sender: string,
    nonce: BigNumberish,
  ): Promise<MempoolEntry | undefined> => {
    const currentMempool = await mp.getStandardPool()
    const entries = Object.values(currentMempool)
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

    /*
     * add userOp into the mempool, after initial validation.
     * replace existing, if any (and if new gas is higher)
     * revets if unable to add UserOp to mempool (too many UserOps with this sender)
     */
    addUserOp: async (relayUserOpParam: RelayUserOpParam): Promise<void> => {
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
        await mp.updateState((state: MempoolState) => {
          return {
            ...state,
            standardPool: {
              ...state.standardPool,
              [userOpHash]: entry,
            },
          }
        })

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
        // check reputation and throttling
        checkReputation(senderInfo, paymasterInfo, factoryInfo, aggregatorInfo)
        checkMultipleRolesViolation(userOp)

        // update entity entryCount and add to mempool if all checks passed
        await mp.updateState((state: MempoolState) => {
          const sender = userOp.sender.toLowerCase()
          const entriesCountToUpdate: EntryCount = {
            [sender]: (state.mempoolEntryCount[sender] ?? 0) + 1,
          }

          // update paymaster and factory counts
          if (userOp.paymaster != null) {
            if (userOp.paymaster !== '0x') {
              entriesCountToUpdate[userOp.paymaster.toLowerCase()] =
                (state.mempoolEntryCount[userOp.paymaster.toLowerCase()] ?? 0) +
                1
            }
          }
          if (userOp.factory != null) {
            if (userOp.factory !== '0x') {
              entriesCountToUpdate[userOp.factory.toLowerCase()] =
                (state.mempoolEntryCount[userOp.factory.toLowerCase()] ?? 0) + 1
            }
          }

          return {
            ...state,
            standardPool: {
              ...state.standardPool,
              [userOpHash]: entry,
            },
            mempoolEntryCount: {
              ...state.mempoolEntryCount,
              ...entriesCountToUpdate,
            },
          }
        })
      }
      updateSeenStatus(aggregatorInfo?.addr, userOp, senderInfo)
      Logger.debug(
        {
          sender: userOp.sender,
          nonce: userOp.nonce,
          userOpHash,
          status: entry.status,
        },
        'added userOp to mempool',
      )
    },

    findByHash: async (
      userOpHash: string,
    ): Promise<MempoolEntry | undefined> => {
      const currentMempool = await mp.getStandardPool()
      return currentMempool[userOpHash]
    },

    removeUserOp: async (
      userOpOrHash: string | UserOperation,
    ): Promise<boolean> => {
      const release = await this.mutex.acquire()
      try {
        let entry: MempoolEntry | undefined
        if (typeof userOpOrHash === 'string') {
          entry = this.mempool.get(userOpOrHash)
        } else {
          entry = this.findBySenderNonce(
            userOpOrHash.sender,
            userOpOrHash.nonce,
          )
        }

        if (!entry) {
          return false
        }

        const userOpHash = entry.userOpHash
        const result = this.mempool.delete(userOpHash)
        if (result) {
          const count = (this.entryCount[entry.userOp.sender] ?? 0) - 1
          count <= 0
            ? delete this.entryCount[entry.userOp.sender]
            : (this.entryCount[entry.userOp.sender] = count)
        }

        return result
      } finally {
        release()
      }
    },

    getNextPending: async (): Promise<MempoolEntry[]> => {
      const release = await this.mutex.acquire()
      try {
        const entries: MempoolEntry[] = []
        let count = 0
        for (const [key, value] of this.mempool.entries()) {
          if (count >= this.bundleSize) {
            break
          }

          if (value.status === 'bundling') {
            continue
          }

          value.status = 'bundling'
          entries.push(value)
          count++
        }
        return entries
      } finally {
        release()
      }
    },

    getAllPending: async (): Promise<MempoolEntry[]> => {
      const release = await this.mutex.acquire()
      try {
        const entries: MempoolEntry[] = []
        for (const [key, value] of this.mempool.entries()) {
          if (value.status === 'pending') {
            value.status = 'bundling'
            entries.push(value)
          }
        }
        return entries
      } finally {
        release()
      }
    },

    updateEntryStatusPending: async (userOpHash: string): Promise<void> => {
      const release = await this.mutex.acquire()
      try {
        const entry = this.mempool.get(userOpHash)
        if (entry) {
          entry.status = 'pending'
        }
      } finally {
        release()
      }
    },

    isMempoolOverloaded: (): boolean => {
      return this.size() >= this.bundleSize
    },

    size: (): number => {
      return this.mempool.size
    },

    clearState: async (): Promise<void> => {
      const release = await this.mutex.acquire()
      try {
        this.mempool.clear()
        this.entryCount = {}
      } finally {
        release()
      }
    },

    dump: (): Array<UserOperation> => {
      Logger.debug(
        '_______________________________MEMPOOL DUMP____________________________________________',
      )
      Logger.debug(`Mempool size: ${this.mempool.size}`)
      Logger.debug({ entryCount: this.entryCount }, 'Mempool entryCount')
      Logger.debug(
        '________________________________________________________________________________________',
      )
      return Array.from(this.mempool.values()).map(
        (mempoolEntry) => mempoolEntry.userOp,
      )
    },
  }
}
