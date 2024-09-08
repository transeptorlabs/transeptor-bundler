import { BigNumberish, BytesLike } from 'ethers'

import { StorageMap } from '../types/bundle.types.js'

/**
 * result from successful simulateValidation
 */
export interface ValidationResult {
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

export interface ExecutionResult {
    validAfter: number
    validUntil: number,
    preOpGas: BigNumberish;
    targetSuccess: boolean;
    targetResult: BytesLike;
}

export interface ReferencedCodeHashes {
    // addresses accessed during this user operation
    addresses: string[]
  
    // keccak over the code of all referenced addresses
    hash: string
}
  
export interface ValidateUserOpResult extends ValidationResult {
    referencedContracts: ReferencedCodeHashes
    storageMap: StorageMap
}

export enum ValidationErrors {
    InvalidFields = -32602,
    SimulateValidation = -32500,
    SimulatePaymasterValidation = -32501,
    OpcodeValidation = -32502,
    NotInTimeRange = -32503,
    Reputation = -32504,
    InsufficientStake = -32505,
    UnsupportedSignatureAggregator = -32506,
    InvalidSignature = -32507,
    UserOperationReverted = -32521
}

export interface StakeInfo {
    addr: string
    stake: BigNumberish
    unstakeDelaySec: BigNumberish
}
