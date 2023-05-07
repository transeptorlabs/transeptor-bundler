import { Mutex } from 'async-mutex'
import { UserOperation } from './Types'

export interface MempoolEntry {
  userOp: UserOperation;
  userOpHash: string;
}

/* In-memory mempool with used to manage UserOperations.
  The MempoolManager Singleton class is a Hash Table data structure that provides efficient insertion, removal, and retrieval of items based on a hash string key. 
  It utilizes the async-mutex package to prevent race conditions when modifying or accessing the hash table state.

  Key methods and their functionality:
    - findByHash(): Retrieves the MempoolEntry associated with the given hash string key. It acquires the mutex to ensure thread-safety during access.
    - addUserOp(): Sets the value associated with the given userOpHash string key. It acquires the mutex to ensure thread-safety during modification.
    - removeUserOp(): Removes the MempoolEntry with the given userOpHash string key from the mempool. It acquires the mutex to ensure thread-safety during modification. Returns true if the item is successfully removed, and false if the item doesn't exist.
    - createNextUserOpBundle(): Removes items from the MempoolEntry in bundles of the specified bundleSize. It acquires the mutex to ensure thread-safety during modification. Returns an array of key-value pairs ([string, MempoolEntry]) representing the removed MempoolEntrys.
    - size: return current size of mempool for debugging
    - dump: print all items in mempool for debugging
    - resetInstance: reset the singleton instance for testing
    */
export class MempoolManager {
  private static instance: MempoolManager

  private readonly mempool: Map<string, MempoolEntry>
  private readonly mutex: Mutex
  private readonly bundleSize: number
  private readonly MAX_MEMPOOL_USEROPS_PER_SENDER = 4

  // count entities in mempool.
  private entryCount: { [addr: string]: number | undefined } = {}

  private constructor(bundleSize: number) {
    this.mempool = new Map<string, MempoolEntry>()
    this.mutex = new Mutex()
    this.bundleSize = bundleSize
  }

  public static getInstance(bundleSize?: number): MempoolManager {
    if (!this.instance) {
      this.instance = new MempoolManager(bundleSize? bundleSize : 5)
    }
    return this.instance
  }

  public async findByHash(userOpHash: string): Promise<MempoolEntry | undefined> {
    const release = await this.mutex.acquire()
    try {
      return this.mempool.get(userOpHash)
    } finally {
      release()
    }
  }

  public async addUserOp(userOpHash: string, value: MempoolEntry): Promise<void> {
    const release = await this.mutex.acquire()
    try {
      this.entryCount[value.userOp.sender] = (this.entryCount[value.userOp.sender] ?? 0) + 1
      this.mempool.set(userOpHash, value)
    } finally {
      release()
    }
  }

  public async removeUserOp(userOpHash: string): Promise<boolean> {
    const release = await this.mutex.acquire()
    try {
      return this.mempool.delete(userOpHash)
    } finally {
      release()
    }
  }

  public async createNextUserOpBundle(): Promise<Array<[string, MempoolEntry]>> {
    const release = await this.mutex.acquire()
    try {
      const removedItems: Array<[string, MempoolEntry]> = []
      let count = 0
      for (const [key, value] of this.mempool.entries()) {
        if (count >= this.bundleSize) {
          break
        }
        this.mempool.delete(key)
        removedItems.push([key, value])
        count++
      }
      return removedItems
    } finally {
      release()
    }
  }

  public size(): number {
    return this.mempool.size
  }

  /**
   * debug: dump mempool content
   */
  public dump(): void {
    for (const [key, value] of this.mempool.entries()) {
      console.log(`Key: ${key}, Value: ${value}`)
    }
  }

  /**
    * for debugging/testing: clear current in-memory instance of MempoolManager
   */
  public resetInstance(): void {
    MempoolManager.instance = null;
  }
}

