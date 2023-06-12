import { Mutex } from 'async-mutex'
import { MempoolEntry, ReferencedCodeHashes, StakeInfo, UserOperation, ValidationErrors } from '../types'
import { Logger } from '../logger'
import { BigNumber, BigNumberish } from 'ethers'
import { getAddr, requireCond } from '../utils'
import { ReputationManager } from '../reputation'

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
  private readonly bundleSize: number // maximum # of pending mempool entities
  private readonly reputationManager: ReputationManager

  private entryCount: { [addr: string]: number | undefined } = {} // count entities in mempool.

  constructor(reputationManager: ReputationManager, bundleSize: number) {
    this.mempool = new Map<string, MempoolEntry>()
    this.mutex = new Mutex()
    this.bundleSize = bundleSize
    this.reputationManager = reputationManager
    Logger.info(`Mempool has bundleSize=${bundleSize} and MAX_MEMPOOL_USEROPS_PER_SENDER=${this.MAX_MEMPOOL_USEROPS_PER_SENDER}`)
    Logger.debug('MempoolManager initialized')
  }

  /* 
    * add userOp into the mempool, after initial validation.
    * replace existing, if any (and if new gas is higher)
    * revets if unable to add UserOp to mempool (too many UserOps with this sender)
  */ 
  public async addUserOp(userOp: UserOperation, userOpHash: string, prefund: BigNumberish, senderInfo: StakeInfo, referencedContracts: ReferencedCodeHashes, aggregator?: string): Promise<void> {
    const release = await this.mutex.acquire()
    try {
      const entry: MempoolEntry = {
        userOp,
        userOpHash,
        prefund,
        referencedContracts,
        aggregator,
        status: 'pending',
      }

      const oldEntry = this.findBySenderNonce(userOp.sender, userOp.nonce)
      if (oldEntry) {
        // TODO: check that the status is not 'bundling' before replacing
        this.checkReplaceUserOp(oldEntry, entry)
        Logger.debug({ sender: userOp.sender, nonce: userOp.nonce, userOpHash, status: entry.status }, 'replace userOp in mempool')
        this.mempool.delete(oldEntry.userOpHash)
        this.mempool.set(userOpHash, entry)
      } else {
        Logger.debug({ sender: userOp.sender, nonce: userOp.nonce, userOpHash, status: entry.status }, 'added userOp to mempool ')
        this.entryCount[userOp.sender] = (this.entryCount[userOp.sender] ?? 0) + 1
        this.checkSenderCountInMempool(userOp, senderInfo)
        this.mempool.set(userOpHash, entry)
      }
      this.updateSeenStatus(aggregator, userOp)
    } finally {
      release()
    }
  }

  /*
   * check if there are already too many entries in mempool for that sender.
    (allow 4 entities if unstaked, or any number if staked)
  */
  private checkSenderCountInMempool (userOp: UserOperation, senderInfo: StakeInfo): void {
    console.log('checkStake(test2):', senderInfo, this.entryCount[userOp.sender])
    if ((this.entryCount[userOp.sender] ?? 0) > this.MAX_MEMPOOL_USEROPS_PER_SENDER) {
      // already enough entities with this sender in mempool.
      // check that it is staked
      this.reputationManager.checkStake('account', senderInfo)
    }
  }

  private updateSeenStatus (aggregator: string | undefined, userOp: UserOperation): void {
    this.reputationManager.updateSeenStatus(aggregator)
    this.reputationManager.updateSeenStatus(getAddr(userOp.paymasterAndData))
    this.reputationManager.updateSeenStatus(getAddr(userOp.initCode))
  }

  private checkReplaceUserOp (oldEntry: MempoolEntry, entry: MempoolEntry): void {
    const oldMaxPriorityFeePerGas = BigNumber.from(oldEntry.userOp.maxPriorityFeePerGas).toNumber()
    const newMaxPriorityFeePerGas = BigNumber.from(entry.userOp.maxPriorityFeePerGas).toNumber()
    const oldMaxFeePerGas = BigNumber.from(oldEntry.userOp.maxFeePerGas).toNumber()
    const newMaxFeePerGas = BigNumber.from(entry.userOp.maxFeePerGas).toNumber()
    // the error is "invalid fields", even though it is detected only after validation
    requireCond(newMaxPriorityFeePerGas >= oldMaxPriorityFeePerGas * 1.1,
      `Replacement UserOperation must have higher maxPriorityFeePerGas (old=${oldMaxPriorityFeePerGas} new=${newMaxPriorityFeePerGas}) `, ValidationErrors.InvalidFields)
    requireCond(newMaxFeePerGas >= oldMaxFeePerGas * 1.1,
      `Replacement UserOperation must have higher maxFeePerGas (old=${oldMaxFeePerGas} new=${newMaxFeePerGas}) `, ValidationErrors.InvalidFields)
  }

  public async findByHash(userOpHash: string): Promise<MempoolEntry | undefined> {
    const release = await this.mutex.acquire()
    try {
      return this.mempool.get(userOpHash)
    } finally {
      release()
    }
  }

  private findBySenderNonce(sender: string, nonce: BigNumberish): MempoolEntry | undefined{
    for (const [key, value] of this.mempool.entries()) {
      if (value.userOp.sender === sender && value.userOp.nonce === nonce) {
        return value
      }
    }

    return  undefined
  }

  // TODO: add test
  public async removeUserOp(userOpOrHash: string | UserOperation): Promise<boolean> {
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
        count <= 0 ? delete this.entryCount[entry.userOp.sender] : this.entryCount[entry.userOp.sender] = count
      }

      return result
    } finally {
      release()
    }
  }

  public async getNextPending(): Promise< MempoolEntry[]> {
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

  public async getAllPending(): Promise< MempoolEntry[]> {
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
    Logger.debug(`_______________________________MEMPOOL DUMP____________________________________________`)
    Logger.debug(`Mempool size: ${this.mempool.size}`)
    Logger.debug({entryCount:this.entryCount }, `Mempool entryCount`)
    for (const [key, value] of this.mempool.entries()) {
      Logger.debug({uop: value }, `Key: ${key}`)
    }
    Logger.debug(`________________________________________________________________________________________`)
    return Array.from(this.mempool.values()).map((mempoolEntry) => mempoolEntry.userOp)
  }
}
