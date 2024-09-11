import { BigNumberish } from 'ethers'

import { ReferencedCodeHashes } from '../../../shared/validatation/index.js'
import { ReputationEntry, UserOperation } from '../../../shared/types/index.js'

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
  entryCount: EntryCount

  // reputation
  blackList: string[]
  whitelist: string[]
  reputationEntries: ReputationEntries
}
