import { BigNumberish, BytesLike } from 'ethers'
import { BundlerCollectorReturn } from '../types/index.js'
import { ValidationResult } from '../validation/index.js'

export type StakeInfo = {
  stake: BigNumberish
  unstakeDelaySec: BigNumberish
}

export type AggregatorStakeInfo = {
  aggregator: string
  stakeInfo: StakeInfo
}

export type SimulateValidationReturnStruct = {
  returnInfo: {
    preOpGas: BigNumberish
    prefund: BigNumberish
    accountValidationData: BigNumberish
    paymasterValidationData: BigNumberish
    paymasterContext: BytesLike
  }

  senderInfo: StakeInfo
  factoryInfo: StakeInfo
  paymasterInfo: StakeInfo
  aggregatorInfo: AggregatorStakeInfo
}

export type ExecutionResultStruct = {
  preOpGas: BigNumberish
  paid: BigNumberish
  accountValidationData: BigNumberish
  paymasterValidationData: BigNumberish
  targetSuccess: boolean
  targetResult: BytesLike
}

export type StateOverride = {
  /**
   * Fake balance to set for the account before executing the call.
   */
  balance?: BigNumberish
  /**
   * Fake nonce to set for the account before executing the call.
   */
  nonce?: BigNumberish
  /**
   * Fake EVM bytecode to inject into the account before executing the call.
   */
  code?: string
  /**
   * Fake key-value mapping to override all slots in the account storage before executing the call.
   */
  state?: object
  /**
   * Fake key-value mapping to override individual slots in the account storage before executing the call.
   */
  stateDiff?: object
}

export type FullValidationResult = [ValidationResult, BundlerCollectorReturn]
