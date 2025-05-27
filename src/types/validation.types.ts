import { BigNumberish, BytesLike } from 'ethers'

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
  paymasterInfo?: PaymasterValidationInfo
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

export type StakeInfoWithAddr = {
  addr: string
  stake: BigNumberish
  unstakeDelaySec: BigNumberish
}

export type PaymasterValidationInfo = StakeInfo & {
  context?: string
}

export type ValidationData = {
  aggregator: string
  validAfter: number
  validUntil: number
}
