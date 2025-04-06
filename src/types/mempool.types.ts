import { RelayUserOpParam, UserOperation } from './userop.types.js'

import { Either } from '../monad/index.js'
import { EntryStatus, MempoolEntry } from './state.types.js'
import { StakeInfo } from './validation.types.js'
import { RpcError } from './error.types.js'

export type MempoolManagerCore = {
  /**
   * Returns all addresses that are currently known to be "senders" according to the current mempool.
   *
   * @returns - An array of known sender addresses in lowercase.
   */
  getKnownSenders(): Promise<string[]>

  /**
   * Returns all addresses that are currently known to be any kind of entity according to the current mempool.
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
   * @returns - The userOpHash of the added UserOperation.
   */
  addUserOp(
    relayUserOpParam: RelayUserOpParam,
  ): Promise<Either<RpcError, string>>

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
  clearState(): Promise<boolean>

  /**
   * Dumps the current state of the mempool to the log.
   *
   * @returns - An array of UserOperation objects in the mempool
   */
  dump(): Promise<UserOperation[]>

  /**
   * [GREP-010] - A `BANNED` address is not allowed into the mempool.
   *
   * @param addr - The address to remove from the mempool.
   */
  removeUserOpsForBannedAddr(addr: string): Promise<void>
}

export type MempoolManageSender = Pick<MempoolManagerCore, 'addUserOp'>

export type MempoolManageUpdater = Pick<
  MempoolManagerCore,
  'removeUserOp' | 'updateEntryStatus'
>

export type MempoolManagerBuilder = Pick<
  MempoolManagerCore,
  | 'size'
  | 'getAllPending'
  | 'getNextPending'
  | 'getKnownSenders'
  | 'updateEntryStatus'
  | 'removeUserOp'
  | 'removeUserOpsForBannedAddr'
>

export type MempoolEntryMetadata = {
  senderInfo: StakeInfo
  paymasterInfo?: StakeInfo
  factoryInfo?: StakeInfo
  aggregatorInfo?: StakeInfo
  oldEntry?: MempoolEntry
}

export type MempoolEntryWithMetadata = [MempoolEntry, MempoolEntryMetadata]
