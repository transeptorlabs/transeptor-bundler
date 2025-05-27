import { BigNumberish, BytesLike } from 'ethers'
import {
  ExecutionResult,
  StakeInfo,
  ValidationResult,
} from './validation.types.js'
import { Either } from '../monad/either.js'
import { RpcError } from './error.types.js'
import { UserOperation } from './userop.types.js'
import { ERC7562Call, ERC7562ValidationResults } from './erc-7562.types.js'

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

export type FullValidationResult = [ValidationResult, ERC7562Call]

export type Simulator = {
  partialSimulateValidation(
    userOp: UserOperation,
  ): Promise<Either<RpcError, ValidationResult>>
  fullSimulateValidation(
    userOp: UserOperation,
    stateOverride: { [address: string]: { code: string } },
  ): Promise<Either<RpcError, FullValidationResult>>
  simulateHandleOp(
    userOp: UserOperation,
    stateOverride?: StateOverride,
  ): Promise<Either<RpcError, ExecutionResult>>
  supportsDebugTraceCallWithNativeTracer(nativeTracer: string): Promise<boolean>
}

export type Erc7562Parser = {
  parseTracerResult(
    userOp: UserOperation,
    erc7562Call: ERC7562Call,
    validationResult: ValidationResult,
  ): Either<RpcError, ERC7562ValidationResults>
}
