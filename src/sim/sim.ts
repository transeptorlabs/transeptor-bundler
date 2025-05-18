import { BytesLike, ethers, Interface, TransactionRequest } from 'ethers'

import {
  EntryPointSimulationsDeployedBytecode,
  I_ENTRY_POINT_SIMULATIONS,
} from '../abis/index.js'
import { Logger } from '../logger/index.js'
import {
  BundlerCollectorReturn,
  StorageMap,
  UserOperation,
  ExecutionResult,
  ValidationErrors,
  ValidationResult,
  NetworkCallError,
  RpcError,
  FullValidationResult,
  Simulator,
  StateOverride,
} from '../types/index.js'
import { packUserOp } from '../utils/index.js'
import { ProviderService } from '../provider/index.js'
import { tracerResultParser } from './parseTracerResult.js'
import { Either } from '../monad/index.js'
import {
  decodeRevertReason,
  getBundlerCollectorTracerString,
  parseExecutionResult,
  parseTracerResultCalls,
  parseValidationResult,
  parseValidationResultSafe,
  runNativeTracer,
  runStandardTracer,
} from './sim.helper.js'

export const createSimulator = (
  ps: ProviderService,
  epAddress: string,
): Simulator => {
  const epSimsInterface = new Interface(I_ENTRY_POINT_SIMULATIONS)
  const simFunctionName = 'simulateValidation'
  const defaultStateOverrides: { [address: string]: { code: string } } = {
    [epAddress]: {
      code: EntryPointSimulationsDeployedBytecode,
    },
  }

  return {
    partialSimulateValidation: async (
      userOp: UserOperation,
    ): Promise<Either<RpcError, ValidationResult>> => {
      Logger.debug(
        'Running partial validation no stake or opcode checks on userOp',
      )

      const ethCallResult = await ps.send<BytesLike>('eth_call', [
        {
          to: epAddress,
          data: epSimsInterface.encodeFunctionData(simFunctionName, [
            packUserOp(userOp),
          ]),
        },
        'latest',
        defaultStateOverrides,
      ])

      return ethCallResult.fold(
        (error: NetworkCallError) => {
          let errorData
          const { body, data } = error.payload
          if (body) {
            const bodyParse = JSON.parse(body)
            if (
              bodyParse.error.data &&
              bodyParse.error.message === 'execution reverted'
            ) {
              errorData = bodyParse.error.data
            }
          } else if (data) {
            errorData = data
          }

          const decodedError = decodeRevertReason(errorData)
          if (decodedError != null) {
            return Either.Left(
              new RpcError(decodedError, ValidationErrors.SimulateValidation),
            )
          }
          return Either.Left(
            new RpcError(
              'Could not decode revert reason, unsupported errorSignature',
              ValidationErrors.SimulateValidation,
              errorData,
            ),
          )
        },
        (simulationResult: BytesLike) => {
          const [res] = epSimsInterface.decodeFunctionResult(
            simFunctionName,
            simulationResult,
          )
          return Either.Right(parseValidationResult(userOp, res))
        },
      )
    },

    fullSimulateValidation: async (
      userOp: UserOperation,
      nativeTracerEnabled: boolean,
      stateOverride: { [address: string]: { code: string } },
    ): Promise<Either<RpcError, FullValidationResult>> => {
      Logger.debug(
        { nativeTracerEnabled, stateOverride },
        'Running full validation with storage/opcode checks on userOp',
      )
      const tx: TransactionRequest = {
        from: ethers.ZeroAddress,
        to: epAddress,
        data: epSimsInterface.encodeFunctionData(simFunctionName, [
          packUserOp(userOp),
        ]),
        gasLimit: (
          BigInt(userOp.preVerificationGas) +
          BigInt(userOp.verificationGasLimit)
        ).toString(),
      }

      const combinedStateOverride = {
        ...defaultStateOverrides,
        ...stateOverride,
      }

      const tracerResult = nativeTracerEnabled
        ? await runNativeTracer(ps, tx, combinedStateOverride)
        : await getBundlerCollectorTracerString().foldAsync(
            async (tracerFileErr) =>
              Either.Left<RpcError, BundlerCollectorReturn>(tracerFileErr),
            async (tracerStr) =>
              runStandardTracer(ps, tx, tracerStr, combinedStateOverride),
          )

      return tracerResult
        .flatMap(parseTracerResultCalls)
        .flatMap(([tracer, exitInfoData]) =>
          parseValidationResultSafe(userOp, exitInfoData, tracer, {
            simFunctionName,
            epSimsInterface,
          }),
        )
    },

    simulateHandleOp: async (
      userOp: UserOperation,
      stateOverride?: StateOverride,
    ): Promise<Either<RpcError, ExecutionResult>> => {
      Logger.debug('Running simulateHandleOp on userOp')
      const ethCallResult = await ps.send<BytesLike>('eth_call', [
        {
          to: epAddress,
          data: epSimsInterface.encodeFunctionData('simulateHandleOp', [
            packUserOp(userOp),
            ethers.ZeroAddress,
            '0x',
          ]),
        },
        'latest',
        {
          ...stateOverride,
          ...defaultStateOverrides,
        },
      ])

      return ethCallResult.fold(
        (error: NetworkCallError) =>
          Either.Left(
            new RpcError(
              decodeRevertReason(error) as string,
              ValidationErrors.SimulateValidation,
            ),
          ),
        (simulateHandleOpResult: BytesLike) => {
          const [res] = epSimsInterface.decodeFunctionResult(
            'simulateHandleOp',
            simulateHandleOpResult,
          )
          return Either.Right(parseExecutionResult(res))
        },
      )
    },

    tracerResultParser: (
      userOp: UserOperation,
      tracerResults: BundlerCollectorReturn,
      validationResult: ValidationResult,
    ): Either<RpcError, [string[], StorageMap]> => {
      return tracerResultParser(
        userOp,
        tracerResults,
        validationResult,
        epAddress,
      )
    },

    supportsDebugTraceCall: async (): Promise<Either<RpcError, boolean>> => {
      Logger.debug(
        'Checking if network provider supports debug_traceCall to run full validation with standard javascript tracer',
      )
      const checkTracerSupport = async (tracerStr: string) => {
        const traceCallRes = await ps.debug_traceCall<BundlerCollectorReturn>(
          {
            from: ethers.ZeroAddress,
            to: ethers.ZeroAddress,
            data: '0x',
          },
          {
            tracer: tracerStr,
          },
        )

        return traceCallRes.fold(
          (traceCallErr) => Either.Left<RpcError, boolean>(traceCallErr),
          (tracerResult) =>
            Either.Right<RpcError, boolean>(tracerResult.logs != null),
        )
      }

      return getBundlerCollectorTracerString().foldAsync(
        async (tracerFileErr) => Either.Left(tracerFileErr),
        async (tracerStr) => checkTracerSupport(tracerStr),
      )
    },

    supportsNativeTracer: async (
      nativeTracer,
      useNativeTracerProvider = false,
    ): Promise<boolean> => {
      return (
        await ps.debug_traceCall(
          {},
          {
            tracer: nativeTracer,
          },
          useNativeTracerProvider,
        )
      ).fold(
        (_) => false,
        (_) => true,
      )
    },
  }
}
