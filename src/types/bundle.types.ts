import { UserOperation } from './userop.types.js'
import { Wallet } from 'ethers'

export type SendBundleReturn = {
  transactionHash: string
  userOpHashes: string[]
}

export type SendBundleReturnWithSigner = {
  transactionHash: string
  userOpHashes: string[]
  signerIndex: number
  crashedHandleOps?: {
    addressToBan: string | undefined
    failedOp: UserOperation
  }
}

export type BundleTxStatus = 'pending' | 'confirmed' | 'failed'

export type PendingTxDetails = {
  txHash: string
  signerIndex: number
  status: BundleTxStatus
}

/*
 * Hold the pending transactions for each bundle
 *
 * The key is the transaction hash
 */
export type BundleTxs = Record<string, PendingTxDetails>

// Signers
export type BundlerSignerWallets = Record<number, Wallet>

export type SignerService = {
  /**
   * Finds the first signer without a pending bundle transaction and returns the index.
   *
   * @param bundleTxs - Record of bundleTxs.
   * @returns - Return the index of the available signer, -1 if all are busy, or 0 immediately if bundleTxs is empty.
   */
  getReadySigner(bundleTxs: BundleTxs): Promise<number>
}
