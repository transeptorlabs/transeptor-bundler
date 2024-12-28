import { BigNumberish } from 'ethers'

import { ReferencedCodeHashes } from '../validation/index.js'
import { UserOperation } from '../types/index.js'
import { ReputationEntry } from '../reputation/index.js'

export type EntryStatus = 'bundling' | 'pending' | 'bundled' | 'failed'

export type MempoolEntry = {
  userOp: UserOperation
  userOpHash: string
  prefund: BigNumberish
  referencedContracts: ReferencedCodeHashes
  status: EntryStatus
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

export type BundleTxStatus = 'pending' | 'confirmed' | 'failed'

export type PendingTxDetails = {
  txHash: string
  signerIndex: number
  status: BundleTxStatus
}

/**
 * Reputation entry per address
 *
 *  The key is the address of an entity(account/paymaster/deployer/aggregator)
 */
export type ReputationEntries = Record<string, ReputationEntry>

/*
 * Hold the pending transactions for each bundle
 *
 * The key is the transaction hash
 */
export type BundleTxs = Record<string, PendingTxDetails>

export type State = {
  standardPool: StandardPool
  mempoolEntryCount: EntryCount // count entities in mempool.
  bundleTxs: BundleTxs

  // reputation
  blackList: string[] // black-listed entities - always banned
  whiteList: string[] // white-listed entities - always OK.
  reputationEntries: ReputationEntries
}

export enum StateKey {
  StandardPool = 'standardPool',
  MempoolEntryCount = 'mempoolEntryCount',
  BundleTxs = 'bundleTxs',
  BlackList = 'blackList',
  WhiteList = 'whiteList',
  ReputationEntries = 'reputationEntries',
}

export type StateService = {
  /**
   * Getter for the state. It allows for retrieving any part of the state.
   * Consumers of the getState function will get the proper return type based on the key they pass,
   * without needing to cast the result manually.
   *
   * @param keys - A single key or an array of keys to retrieve from the state.
   * @returns A promise that resolves to the requested state value.
   *
   * @example
   * // single value can be retrieved:
   * const { standardPool } = await mempoolStateService.getState(StateKey.StandardPool);
   * console.log(standardPool)  // Logs the standardPool value
   *
   * // multiple values can be retrieved at once:
   * const { standardPool, blackList } = await mempoolStateService.getState([
   *   StateKey.StandardPool,
   *   StateKey.BlackList,
   * ])
   * console.log(standardPool)  // Logs the standardPool value
   * console.log(blackList)     // Logs the blackList value
   */
  getState: <K extends keyof State>(
    keys: StateKey | StateKey[],
  ) => Promise<Pick<State, K>>

  /**
   * Single setter to allow for atomic updates of any part of the state.
   *
   * @param updateFn A function that receives the current state value and returns a new value.
   * @returns A promise that resolves to true if the update was successful and false otherwise.
   *
   *
   * @example
   *
   * // single value can be updated:
   * await mempoolStateService.updateState(
   *  StateKey.StandardPool,
   * (currentValue) => {
   *  return { standardPool: { ...currentValue.standardPool, newEntry: 'value' } }
   * })
   *
   * // multiple values can be updated at once:
   * const sucess = await mempoolStateService.updateState(
   *  [StateKey.StandardPool, StateKey.BlackList],
   * (currentValue) => {
   * return {
   *  standardPool: { ...currentValue.standardPool, newEntry: 'value' },
   *  blackList: [...currentValue.blackList, 'newBlackListedAddress'],
   * }})
   */
  updateState: <K extends keyof State>(
    key: StateKey | StateKey[],
    updateFn: (currentValue: Pick<State, K>) => Partial<State>,
  ) => Promise<boolean>
}
