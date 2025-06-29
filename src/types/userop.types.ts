import type { BigNumberish, BytesLike, ethers } from 'ethers'

import { EIP7702Authorization } from './eip-7702.types.js'
import { ReferencedCodeHashes, StakeInfo } from './validation.types.js'

// New transaction types for account-abstracted transactions
export type UserOperation = {
  sender: string // The account making the operation
  nonce: BigNumberish // Anti-replay parameter (see “Semi-abstracted Nonce Support” )
  factory?: string // account factory, only for new accounts
  factoryData?: BytesLike // data for account factory (only if account factory exists)
  callData: BytesLike // The data to pass to the sender during the main execution call
  callGasLimit: BigNumberish // The amount of gas to allocate the main execution call
  verificationGasLimit: BigNumberish // The amount of gas to allocate for the verification step
  preVerificationGas: BigNumberish // Extra gas to pay the bundler
  maxFeePerGas: BigNumberish // Maximum fee per gas (similar to EIP-1559 max_fee_per_gas) - https://eips.ethereum.org/EIPS/eip-1559
  maxPriorityFeePerGas: BigNumberish // Maximum priority fee per gas (similar to EIP-1559 max_priority_fee_per_gas)
  paymaster?: string // Address of paymaster contract, (or empty, if account pays for itself)
  paymasterVerificationGasLimit?: BigNumberish // The amount of gas to allocate for the paymaster validation code
  paymasterPostOpGasLimit?: BigNumberish // The amount of gas to allocate for the paymaster post-operation code
  paymasterData?: BytesLike // Data for paymaster (only if paymaster exists)
  signature: BytesLike // Data passed into the account to verify authorization
  eip7702Auth?: EIP7702Authorization
}

// When passed to on-chain contacts (the EntryPoint contract, and then to account and paymaster), a packed version of the above structure is used:
export type PackedUserOperation = {
  sender: string
  nonce: BigNumberish
  initCode: BytesLike // concatenation of factory address and factoryData (or empty)
  callData: BytesLike
  accountGasLimits: BytesLike // concatenation of verificationGas (16 bytes) and callGas (16 bytes)
  preVerificationGas: BigNumberish
  gasFees: BytesLike // concatenation of maxPriorityFee (16 bytes) and maxFeePerGas (16 bytes)
  paymasterAndData: BytesLike // concatenation of paymaster fields (or empty)
  signature: BytesLike
}

type TransactionReceipt = {
  to: string
  from: string
  contractAddress: string
  transactionIndex: number
  root?: string
  gasUsed: bigint
  logsBloom: string
  blockHash: string
  transactionHash: string
  logs: readonly ethers.Log[]
  blockNumber: number
  confirmations: number
  cumulativeGasUsed: bigint
  effectiveGasPrice: bigint
  // byzantium: boolean
  type: number
  status?: number // The status of this transaction, indicating success (i.e. 1) or a revert (i.e. 0).
}

export type UserOperationReceipt = {
  /// the request hash
  userOpHash: string
  /// the account sending this UserOperation
  sender: string
  /// account nonce
  nonce: BigNumberish
  /// the paymaster used for this userOp (or empty)
  paymaster?: string
  /// actual payment for this UserOperation (by either paymaster or account)
  actualGasCost: BigNumberish
  /// total gas used by this UserOperation (including preVerification, creation, validation and execution)
  actualGasUsed: BigNumberish
  /// did this execution completed without revert
  success: boolean
  /// in case of revert, this is the revert reason
  reason?: string
  /// the logs generated by this UserOperation (not including logs of other UserOperations in the same bundle)
  logs: ethers.Log[]

  // the transaction receipt for this transaction (of entire bundle, not only this UserOperation)
  receipt: TransactionReceipt
}

export type UserOperationByHashResponse = {
  userOperation: UserOperation
  entryPoint: string
  blockNumber: number
  blockHash: string
  transactionHash: string
}

export type EstimateUserOpGasResult = {
  /**
   * the preVerification gas used by this UserOperation.
   */
  preVerificationGas: BigNumberish
  /**
   * gas used for validation of this UserOperation, including account creation
   */
  verificationGasLimit: BigNumberish

  /**
   * (possibly future timestamp) after which this UserOperation is valid
   */
  validAfter?: BigNumberish

  /**
   * the deadline after which this UserOperation is invalid (not a gas estimation parameter, but returned by validation
   */
  validUntil?: BigNumberish

  /**
   * estimated cost of calling the account with the given callData
   */
  callGasLimit: BigNumberish

  /**
   * value used for paymaster verification (if paymaster exists in the UserOperation)
   */
  paymasterVerificationGasLimit?: BigNumberish

  /**
   * value used for paymaster post op execution (if paymaster exists in the UserOperation)
   */
  paymasterPostOpGasLimit?: BigNumberish
}

export type RelayUserOpParam = {
  userOp: UserOperation
  userOpHash: string
  prefund: BigNumberish
  referencedContracts: ReferencedCodeHashes
  senderInfo: StakeInfo
  paymasterInfo?: StakeInfo
  factoryInfo?: StakeInfo
  aggregatorInfo?: StakeInfo
}
