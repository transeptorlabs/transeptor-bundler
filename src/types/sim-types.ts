import { BigNumberish, BytesLike } from 'ethers'
import { BundlerCollectorReturn } from './bundler-collector-tracer.types.js'
import {
  ExecutionResult,
  StakeInfo,
  StorageMap,
  ValidationResult,
} from './validation.types.js'
import { Either } from 'src/monad/either.js'
import { RpcError } from './error.types.js'
import { UserOperation } from './userop.types.js'

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

export type Simulator = {
  partialSimulateValidation(
    userOp: UserOperation,
  ): Promise<Either<RpcError, ValidationResult>>
  fullSimulateValidation(
    userOp: UserOperation,
    nativeTracerEnabled: boolean,
    stateOverride: { [address: string]: { code: string } },
  ): Promise<Either<RpcError, FullValidationResult>>
  simulateHandleOp(
    userOp: UserOperation,
    stateOverride?: StateOverride,
  ): Promise<Either<RpcError, ExecutionResult>>
  tracerResultParser(
    userOp: UserOperation,
    tracerResults: BundlerCollectorReturn,
    validationResult: ValidationResult,
  ): Either<RpcError, [string[], StorageMap]>
  supportsDebugTraceCall(): Promise<Either<RpcError, boolean>>
  supportsNativeTracer(
    nativeTracer: string,
    useNativeTracerProvider?: boolean,
  ): Promise<boolean>
}
