import { UserOperation } from './userop.types.js'
import { Wallet } from 'ethers'
import { StorageMap } from './validation.types.js'

export type SendBundleReturn = {
  transactionHash: string
  userOpHashes: string[]
}

export type SendBundleReturnWithSigner = {
  transactionHash: string
  userOpHashes: string[]
  signerIndex: number
  isSendBundleSuccess: boolean
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

// Bundle processor

/**
 * A bundle processor that sends a bundle of user operations
 */
export type BundleProcessor = {
  /**
   * submit a bundle.
   * after submitting the bundle, remove all UserOps from the mempool
   *
   * @param userOps
   * @param storageMap
   * @returns SendBundleReturnWithSigner the transaction and UserOp hashes on successful transaction, or null on failed transaction
   */
  sendBundle: (
    userOps: UserOperation[],
    storageMap: StorageMap,
  ) => Promise<SendBundleReturnWithSigner>
}

/**
 * Details of a user operation that crashed the handleOps function
 */
export type CrashedHandleOps = {
  addressToBan: string | undefined
  reasonStr: string
  failedUserOp: UserOperation
}

// Bundle builder

/**
 * A bundle builder that creates a bundle of user operations
 */
export type BundleBuilder = {
  /**
   * Create a bundle of user operations
   *
   * @param force - Whether to force the creation of a bundle
   * @returns A bundle of user operations
   */
  createBundle: (force?: boolean) => Promise<BundleReadyToSend>
}

/**
 * Details of a user operation that was not included in the bundle
 */
export type RemoveUserOpDetails = {
  userOpHash: string
  userOp: UserOperation
  reason: 'failed-2nd-validation' | 'banned'
  err?: any
}

/**
 * A bundle ready to send
 */
export type BundleReadyToSend = {
  bundle: UserOperation[]
  storageMap: StorageMap
}

/**
 * Result of the bundle builder
 */
export type BundleBuilderResult = {
  bundle: UserOperation[]
  storageMap: StorageMap
  notIncludedUserOpsHashes: string[]
  markedToRemoveUserOpsHashes: RemoveUserOpDetails[]
  totalGas: bigint
  paymasterDeposit: { [paymaster: string]: bigint }
  senders: Set<string>
  stakedEntityCount: { [addr: string]: number }
}
