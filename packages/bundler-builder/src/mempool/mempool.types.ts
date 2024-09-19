import { BigNumberish } from 'ethers'

import { ReferencedCodeHashes } from '../../../shared/validatation/index.js'
import { UserOperation } from '../../../shared/types/index.js'
import { ReputationEntry } from '../reputation/index.js'

export type MempoolEntry = {
  userOp: UserOperation
  userOpHash: string
  prefund: BigNumberish
  referencedContracts: ReferencedCodeHashes
  status: 'bundling' | 'pending'
  // aggregator, if one was found during simulation
  aggregator?: string
}
/**
 * Hold userOp and status of the operation
 *
 * The key is the hash of the userOp
 */
export type StandardPool = Record<string, MempoolEntry>

/**
 * Count of entries per address
 *
 * The key is the sender address of the userOp
 */
export type EntryCount = Record<string, number>

/**
 * Reputation entry per address
 *
 *  The key is the address of an entity(account/paymaster/deployer/aggregator)
 */
export type ReputationEntries = Record<string, ReputationEntry>

export type MempoolState = {
  standardPool: StandardPool
  mempoolEntryCount: EntryCount // count entities in mempool.

  // reputation
  blackList: string[] // black-listed entities - always banned
  whiteList: string[] // white-listed entities - always OK.
  reputationEntries: ReputationEntries
}

export enum MempoolStateKey {
  StandardPool = 'standardPool',
  MempoolEntryCount = 'mempoolEntryCount',
  BlackList = 'blackList',
  WhiteList = 'whiteList',
  ReputationEntries = 'reputationEntries',
}

export type MempoolStateService = {
  /**
   * Getter for the state. It allows for retrieving any part of the state.
   * Consumers of the getState function will get the proper return type based on the key they pass,
   * without needing to cast the result manually.
   *
   * @param keys - A single key or an array of keys to retrieve from the state.
   * @returns A promise that resolves to the requested state value.
   *
   * @throws Error if the key is invalid.
   *
   * @example
   * // single value can be retrieved:
   * const { standardPool } = await mempoolStateService.getState(MempoolStateKey.StandardPool);
   * console.log(standardPool)  // Logs the standardPool value
   *
   * // multiple values can be retrieved at once:
   * const { standardPool, blackList } = await mempoolStateService.getState([
   *   MempoolStateKey.StandardPool,
   *   MempoolStateKey.BlackList,
   * ])
   * console.log(standardPool)  // Logs the standardPool value
   * console.log(blackList)     // Logs the blackList value
   */
  getState: <K extends keyof MempoolState>(
    keys: MempoolStateKey | MempoolStateKey[],
  ) => Promise<Pick<MempoolState, K>>

  /**
   * Single setter to allow for atomic updates of any part of the state.
   *
   * @param updateFn A function that receives the current state value and returns a new value.
   * @returns A promise that resolves when the state has been updated.
   *
   * @throws Error if the updated value does not contain the same key as input.
   *
   * @example
   *
   * // single value can be updated:
   * await mempoolStateService.updateState(
   *  MempoolStateKey.StandardPool,
   * (currentValue) => {
   *  return { standardPool: { ...currentValue.standardPool, newEntry: 'value' } }
   * })
   *
   * // multiple values can be updated at once:
   * await mempoolStateService.updateState(
   *  [MempoolStateKey.StandardPool, MempoolStateKey.BlackList],
   * (currentValue) => {
   * return {
   *  standardPool: { ...currentValue.standardPool, newEntry: 'value' },
   *  blackList: [...currentValue.blackList, 'newBlackListedAddress'],
   * }})
   */
  updateState: <K extends keyof MempoolState>(
    key: MempoolStateKey | MempoolStateKey[],
    updateFn: (currentValue: Pick<MempoolState, K>) => Partial<MempoolState>,
  ) => Promise<void>
}
