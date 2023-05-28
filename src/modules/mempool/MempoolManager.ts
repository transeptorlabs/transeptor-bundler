import { Mutex } from 'async-mutex'
import { MempoolEntry, ReferencedCodeHashes, UserOperation } from '../types'
import { Logger } from '../logger'

/* In-memory mempool with used to manage UserOperations.
  The MempoolManager class is a Hash Table data structure that provides efficient insertion, removal, and retrieval of items based on a hash string key. 
  It utilizes the async-mutex package to prevent race conditions when modifying or accessing the hash table state.

  Key methods and their functionality:
    - findByHash(): Retrieves the MempoolEntry associated with the given hash string key. It acquires the mutex to ensure thread-safety during access.
    - addUserOp(): Sets the value associated with the given userOpHash string key. It acquires the mutex to ensure thread-safety during modification.
    - removeUserOp(): Removes the MempoolEntry with the given userOpHash string key from the mempool. It acquires the mutex to ensure thread-safety during modification. Returns true if the item is successfully removed, and false if the item doesn't exist.
    - createNextUserOpBundle(): Removes items from the MempoolEntry in bundles of the specified bundleSize. It acquires the mutex to ensure thread-safety during modification. Returns an array of key-value pairs ([string, MempoolEntry]) representing the removed MempoolEntrys.
    - size: return current size of mempool for debugging
    - dump: print all items in mempool for debugging
    - clearState: clear all items in mempool for debugging
    */
export class MempoolManager {
  private readonly mempool: Map<string, MempoolEntry>
  private readonly mutex: Mutex
  private readonly MAX_MEMPOOL_USEROPS_PER_SENDER = 4
  private readonly bundleSize: number

  // count entities in mempool.
  private entryCount: { [addr: string]: number | undefined } = {}

  constructor(bundleSize: number) {
    this.mempool = new Map<string, MempoolEntry>()
    this.mutex = new Mutex()
    this.bundleSize = bundleSize
    Logger.debug('MempoolManager initialized')
  }

  public async findByHash(userOpHash: string): Promise<MempoolEntry | undefined> {
    const release = await this.mutex.acquire()
    try {
      return this.mempool.get(userOpHash)
    } finally {
      release()
    }
  }

  public async addUserOp(userOpHash: string, userOp:UserOperation, referencedContracts: ReferencedCodeHashes): Promise<void> {
    const release = await this.mutex.acquire()
    try {
      const entry: MempoolEntry = {
        userOp,
        userOpHash,
        referencedContracts,
        status: 'idle',
      }
      this.entryCount[entry.userOp.sender] = (this.entryCount[entry.userOp.sender] ?? 0) + 1
      this.mempool.set(userOpHash, entry)
    } finally {
      release()
    }
  }

  public async removeUserOp(userOpHash: string): Promise<boolean> {
    const release = await this.mutex.acquire()
    try {
      const entry = this.mempool.get(userOpHash)
      const result = this.mempool.delete(userOpHash)
      if (result && entry) {
        const count = (this.entryCount[entry.userOp.sender] ?? 0) - 1
        count <= 0 ? delete this.entryCount[entry.userOp.sender] : this.entryCount[entry.userOp.sender] = count
      }

      return result
    } finally {
      release()
    }
  }

  public async getNextEntriesToBundle(): Promise< MempoolEntry[]> {
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
    Logger.debug(`Mempool size: ${this.mempool.size}`)
    Logger.debug(`Mempool entryCount: ${this.entryCount}`)
    for (const [key, value] of this.mempool.entries()) {
      Logger.debug(`Key: ${key}, Value: ${value}`)
    }
    return Array.from(this.mempool.values()).map((mempoolEntry) => mempoolEntry.userOp)
  }
}
