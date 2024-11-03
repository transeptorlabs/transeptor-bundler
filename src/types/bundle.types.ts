import { UserOperation } from '../types/index.js'

export type SlotMap = {
  [slot: string]: string
}

/**
 * map of storage
 * for each address, either a root hash, or a map of slot:value
 */
export type StorageMap = {
  [address: string]: string | SlotMap
}

export type SendBundleReturn = {
  transactionHash: string
  userOpHashes: string[]
}

export type SendBundleReturnWithSigner = {
  transactionHash: string
  userOpHashes: string[]
  signerIndex: number
  crashedHandleOps?: {
    addressToban: string | undefined
    failedOp: UserOperation
  }
}
