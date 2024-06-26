import { Mutex } from 'async-mutex'
import { BigNumber, BigNumberish } from 'ethers'

import { Logger } from '../logger/index.js'
import { ReputationManager } from '../reputation/index.js'
import {
  MempoolEntry,
  ReferencedCodeHashes,
  StakeInfo,
  UserOperation,
  ValidationErrors,
} from '../types/index.js'
import { RpcError, requireCond } from '../utils/index.js'

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
export class MempoolManager {
  private readonly mempool: Map<string, MempoolEntry>
  private readonly mutex: Mutex
  private readonly MAX_MEMPOOL_USEROPS_PER_SENDER = 4 // max # of pending mempool entities per sender
  private readonly THROTTLED_ENTITY_MEMPOOL_COUNT = 4
  private readonly bundleSize: number // maximum # of pending mempool entities
  private readonly reputationManager: ReputationManager

  private entryCount: { [addr: string]: number | undefined } = {} // count entities in mempool.

  constructor(reputationManager: ReputationManager, bundleSize: number) {
    this.mempool = new Map<string, MempoolEntry>()
    this.mutex = new Mutex()
    this.bundleSize = bundleSize
    this.reputationManager = reputationManager
    Logger.info(
      `In-memory Mempool initialized with bundleSize=${bundleSize} and MAX_MEMPOOL_USEROPS_PER_SENDER=${this.MAX_MEMPOOL_USEROPS_PER_SENDER}`
    )
  }

  /**
   * Returns all addresses that are currently known to be "senders" according to the current mempool.
   */
  public getKnownSenders(): string[] {
    const userOps = Array.from(this.mempool.values()).map(
      (mempoolEntry) => mempoolEntry.userOp
    )

    return userOps.map(op => {
      return op.sender.toLowerCase()
    })
  }

  /**
   * Returns all addresses that are currently known to be any kind of entity according to the current mempool.
   * Note that "sender" addresses are not returned by this function. Use {@link getKnownSenders} instead.
   */
  public getKnownEntities (): string[] {
    const res = []
    const userOps = Array.from(this.mempool.values()).map(
      (mempoolEntry) => mempoolEntry.userOp
    )
    res.push(
      ...userOps.map(op => op.paymaster)
    )
    res.push(
      ...userOps.map(op => op.factory)
    )

    return res.filter(entryAddress => entryAddress != null && entryAddress != '0x').map(it => (it as string).toLowerCase())
  }

  private incrementEntryCount(address?: string): void {
    address = address?.toLowerCase()
    if (address == null) {
      return
    }

    if(address === '0x') {
      return
    }

    this.entryCount[address] = (this.entryCount[address] ?? 0) + 1
  }

  /*
   * add userOp into the mempool, after initial validation.
   * replace existing, if any (and if new gas is higher)
   * revets if unable to add UserOp to mempool (too many UserOps with this sender)
   */
  public async addUserOp(
    userOp: UserOperation,
    userOpHash: string,
    prefund: BigNumberish,
    referencedContracts: ReferencedCodeHashes,
    senderInfo: StakeInfo,
    paymasterInfo?: StakeInfo,
    factoryInfo?: StakeInfo,
    aggregatorInfo?: StakeInfo
  ): Promise<void> {
    const release = await this.mutex.acquire()
    try {
      const entry: MempoolEntry = {
        userOp,
        userOpHash,
        prefund,
        referencedContracts,
        status: 'pending',
        aggregator: aggregatorInfo?.addr
      }

      const oldEntry = this.findBySenderNonce(userOp.sender, userOp.nonce)
      if (oldEntry) {
        this.checkReplaceUserOp(oldEntry, entry)
        this.mempool.delete(oldEntry.userOpHash)
        this.mempool.set(userOpHash, entry)
        Logger.debug(
          {
            sender: userOp.sender,
            nonce: userOp.nonce,
            userOpHash,
            status: entry.status,
          },
          'replace userOp in mempool'
        )
      } else {
        // check reputation and throttling
        this.checkReputation(senderInfo, paymasterInfo, factoryInfo, aggregatorInfo)
        this.checkMultipleRolesViolation(userOp)

        // update entity entryCount and add to mempool if all checks passed
        this.mempool.set(userOpHash, entry)
        this.incrementEntryCount(userOp.sender)
        if (userOp.paymaster != null) {
          this.incrementEntryCount(userOp.paymaster)
        }
        if (userOp.factory != null) {
          this.incrementEntryCount(userOp.factory)
        }
      }
      this.updateSeenStatus(aggregatorInfo?.addr, userOp, senderInfo)
      Logger.debug(
        {
          sender: userOp.sender,
          nonce: userOp.nonce,
          userOpHash,
          status: entry.status,
        },
        'added userOp to mempool'
      )
    } finally {
      release()
    }
  }

  private checkReputation (
    senderInfo: StakeInfo,
    paymasterInfo?: StakeInfo,
    factoryInfo?: StakeInfo,
    aggregatorInfo?: StakeInfo): void {
    this.checkReputationStatus('account', senderInfo, this.MAX_MEMPOOL_USEROPS_PER_SENDER)

    if (paymasterInfo != null) {
      this.checkReputationStatus('paymaster', paymasterInfo)
    }

    if (factoryInfo != null) {
      this.checkReputationStatus('deployer', factoryInfo)
    }

    if (aggregatorInfo != null) {
      this.checkReputationStatus('aggregator', aggregatorInfo)
    }
  }

  private checkMultipleRolesViolation (userOp: UserOperation): void {
    const knownEntities = this.getKnownEntities()
    requireCond(
      !knownEntities.includes(userOp.sender.toLowerCase()),
      `The sender address "${userOp.sender}" is used as a different entity in another UserOperation currently in mempool`,
      ValidationErrors.OpcodeValidation
    )

    const knownSenders = this.getKnownSenders()
    const paymaster = userOp.paymaster
    const factory = userOp.factory

    const isPaymasterSenderViolation = knownSenders.includes(paymaster?.toLowerCase() ?? '')
    const isFactorySenderViolation = knownSenders.includes(factory?.toLowerCase() ?? '')

    requireCond(
      !isPaymasterSenderViolation,
      `A Paymaster at ${paymaster as string} in this UserOperation is used as a sender entity in another UserOperation currently in mempool.`,
      ValidationErrors.OpcodeValidation
    )
    requireCond(
      !isFactorySenderViolation,
      `A Factory at ${factory as string} in this UserOperation is used as a sender entity in another UserOperation currently in mempool.`,
      ValidationErrors.OpcodeValidation
    )
  }

  private checkReputationStatus (
    title: 'account' | 'paymaster' | 'aggregator' | 'deployer',
    stakeInfo: StakeInfo,
    maxTxMempoolAllowedOverride?: number
  ): void {
    const maxTxMempoolAllowedEntity = maxTxMempoolAllowedOverride ??
      this.reputationManager.calculateMaxAllowedMempoolOpsUnstaked(stakeInfo.addr)
    this.reputationManager.checkBanned(title, stakeInfo)
    const entryCount = this.entryCount[stakeInfo.addr.toLowerCase()] ?? 0
    if (entryCount > this.THROTTLED_ENTITY_MEMPOOL_COUNT) {
      this.reputationManager.checkThrottled(title, stakeInfo)
    }
    if (entryCount > maxTxMempoolAllowedEntity) {
      this.reputationManager.checkStake(title, stakeInfo)
    }
  }

  private updateSeenStatus (aggregator: string | undefined, userOp: UserOperation, senderInfo: StakeInfo): void {
    try {
      this.reputationManager.checkStake('account', senderInfo)
      this.reputationManager.updateSeenStatus(userOp.sender)
    } catch (e: any) {
      if (!(e instanceof RpcError)) throw e
    }
    this.reputationManager.updateSeenStatus(aggregator)
    this.reputationManager.updateSeenStatus(userOp.paymaster)
    this.reputationManager.updateSeenStatus(userOp.factory)
  }

  private checkReplaceUserOp(
    oldEntry: MempoolEntry,
    entry: MempoolEntry
  ): void {
    const oldMaxPriorityFeePerGas = BigNumber.from(
      oldEntry.userOp.maxPriorityFeePerGas
    ).toNumber()
    const newMaxPriorityFeePerGas = BigNumber.from(
      entry.userOp.maxPriorityFeePerGas
    ).toNumber()
    const oldMaxFeePerGas = BigNumber.from(
      oldEntry.userOp.maxFeePerGas
    ).toNumber()
    const newMaxFeePerGas = BigNumber.from(
      entry.userOp.maxFeePerGas
    ).toNumber()
    // the error is "invalid fields", even though it is detected only after validation
    requireCond(
      newMaxPriorityFeePerGas >= oldMaxPriorityFeePerGas * 1.1,
      `Replacement UserOperation must have higher maxPriorityFeePerGas (old=${oldMaxPriorityFeePerGas} new=${newMaxPriorityFeePerGas}) `,
      ValidationErrors.InvalidFields
    )
    requireCond(
      newMaxFeePerGas >= oldMaxFeePerGas * 1.1,
      `Replacement UserOperation must have higher maxFeePerGas (old=${oldMaxFeePerGas} new=${newMaxFeePerGas}) `,
      ValidationErrors.InvalidFields
    )
  }

  public async findByHash(
    userOpHash: string
  ): Promise<MempoolEntry | undefined> {
    const release = await this.mutex.acquire()
    try {
      return this.mempool.get(userOpHash)
    } finally {
      release()
    }
  }

  private findBySenderNonce(
    sender: string,
    nonce: BigNumberish
  ): MempoolEntry | undefined {
    for (const [key, value] of this.mempool.entries()) {
      if (value.userOp.sender === sender && value.userOp.nonce === nonce) {
        return value
      }
    }

    return undefined
  }

  public async removeUserOp(
    userOpOrHash: string | UserOperation
  ): Promise<boolean> {
    const release = await this.mutex.acquire()
    try {
      let entry: MempoolEntry | undefined
      if (typeof userOpOrHash === 'string') {
        entry = this.mempool.get(userOpOrHash)
      } else {
        entry = this.findBySenderNonce(userOpOrHash.sender, userOpOrHash.nonce)
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
  }

  public async getNextPending(): Promise<MempoolEntry[]> {
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
  }

  public async getAllPending(): Promise<MempoolEntry[]> {
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
  }

  public async updateEntryStatusPending(userOpHash: string): Promise<void> {
    const release = await this.mutex.acquire()
    try {
      const entry = this.mempool.get(userOpHash)
      if (entry) {
        entry.status = 'pending'
      }
    } finally {
      release()
    }
  }

  public isMempoolOverloaded(): boolean {
    return this.size() >= this.bundleSize
  }

  public size(): number {
    return this.mempool.size
  }

  public async clearState(): Promise<void> {
    const release = await this.mutex.acquire()
    try {
      this.mempool.clear()
      this.entryCount = {}
    } finally {
      release()
    }
  }

  public dump(): Array<UserOperation> {
    Logger.debug(
      '_______________________________MEMPOOL DUMP____________________________________________'
    )
    Logger.debug(`Mempool size: ${this.mempool.size}`)
    Logger.debug({ entryCount: this.entryCount }, 'Mempool entryCount')
    Logger.debug(
      '________________________________________________________________________________________'
    )
    return Array.from(this.mempool.values()).map(
      (mempoolEntry) => mempoolEntry.userOp
    )
  }
}
