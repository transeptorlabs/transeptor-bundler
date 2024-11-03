import { BigNumberish, BytesLike } from 'ethers'

import { StorageMap } from '../types/bundle.types.js'

/**
 * result from successful simulateValidation
 */
export type ValidationResult = {
  returnInfo: {
    preOpGas: BigNumberish
    prefund: BigNumberish
    sigFailed: boolean
    validAfter: number
    validUntil: number
  }

  senderInfo: StakeInfo
  factoryInfo?: StakeInfo
  paymasterInfo?: StakeInfo
  aggregatorInfo?: StakeInfo
}

export type ExecutionResult = {
  validAfter: number
  validUntil: number
  preOpGas: BigNumberish
  targetSuccess: boolean
  targetResult: BytesLike
}

export type ReferencedCodeHashes = {
  // addresses accessed during this user operation
  addresses: string[]

  // keccak over the code of all referenced addresses
  hash: string
}

export type ValidateUserOpResult = ValidationResult & {
  referencedContracts: ReferencedCodeHashes
  storageMap: StorageMap
}

export enum ValidationErrors {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidFields = -32602,
  InternalError = -32603,

  SimulateValidation = -32500,
  SimulatePaymasterValidation = -32501,
  OpcodeValidation = -32502,
  NotInTimeRange = -32503,
  Reputation = -32504,
  InsufficientStake = -32505,
  UnsupportedSignatureAggregator = -32506,
  InvalidSignature = -32507,
  PaymasterDepositTooLow = -32508,
  UserOperationReverted = -32521,
}

export type StakeInfo = {
  addr: string
  stake: BigNumberish
  unstakeDelaySec: BigNumberish
}
