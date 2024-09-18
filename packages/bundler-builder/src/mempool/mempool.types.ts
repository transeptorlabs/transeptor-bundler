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

export enum MempoolStateKeys {
  StandardPool = 'standardPool',
  MempoolEntryCount = 'mempoolEntryCount',
  BlackList = 'blackList',
  WhiteList = 'whiteList',
  ReputationEntries = 'reputationEntries',
}
