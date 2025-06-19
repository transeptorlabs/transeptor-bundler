import { BigNumberish } from 'ethers'

import { BundleTxs } from './bundle.types.js'
import { Capability, CapabilityTypes } from './ocaps.types.js'
import { ReputationEntry } from './reputation.types.js'
import { UserOperation } from './userop.types.js'
import { ReferencedCodeHashes } from './validation.types.js'

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

/**
 * Reputation entry per address
 *
 *  The key is the address of an entity(account/paymaster/deployer/aggregator)
 */
export type ReputationEntries = Record<string, ReputationEntry>

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
   * @param stateCapability - The capability assigned to to caller to access the specific state keys.
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
    stateCapability: Capability<CapabilityTypes.State>,
    keys: StateKey | StateKey[],
  ) => Promise<Pick<State, K>>

  /**
   * Allows atomic updates of any part of the state. A functional version to express general state transitions.
   *
   * @param stateCapability - The capability assigned to to caller to mutate the specific state keys.
   * @param keys - Specifies which parts of the state need to be updated
   * @param updateFn - A state transition function used by caller to make atomic updates to current state to produce the new state
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
   * const success = await mempoolStateService.updateState(
   *  [StateKey.StandardPool, StateKey.BlackList],
   * (currentValue) => {
   * return {
   *  standardPool: { ...currentValue.standardPool, newEntry: 'value' },
   *  blackList: [...currentValue.blackList, 'newBlackListedAddress'],
   * }})
   */
  updateState: <K extends keyof State>(
    stateCapability: Capability<CapabilityTypes.State>,
    key: StateKey | StateKey[],
    updateFn: (currentValue: Pick<State, K>) => Partial<State>,
  ) => Promise<boolean>
}
