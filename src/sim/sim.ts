import { BytesLike, ethers, Interface } from 'ethers'

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
import { packUserOp, sum } from '../utils/index.js'
import { ProviderService } from '../provider/index.js'
import { tracerResultParser } from './parseTracerResult.js'
import { Either } from '../monad/index.js'
import {
  decodeRevertReason,
  generateValidationResult,
  getBundlerCollectorTracerString,
  getStakes,
  parseExecutionResult,
  parseTracerResultCallsForRevert,
  parseSimulateValidationResult,
  runErc7562NativeTracer,
} from './sim.helper.js'
import { PreVerificationGasCalculator } from '../gas/index.js'

export type SimulatorConfig = {
  providerService: ProviderService
  entryPoint: ethers.Contract
  epAddress: string
  preVerificationGasCalculator: PreVerificationGasCalculator
}

export const createSimulator = (config: SimulatorConfig): Simulator => {
  const {
    providerService: ps,
    entryPoint,
    epAddress,
    preVerificationGasCalculator,
  } = config

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
          return Either.Right(parseSimulateValidationResult(userOp, res))
        },
      )
    },

    fullSimulateValidation: async (
      userOp: UserOperation,
    ): Promise<Either<RpcError, FullValidationResult>> => {
      Logger.debug(
        'Running full validation with storage/opcode checks on userOp',
      )

      const prevg = BigInt(
        preVerificationGasCalculator.calcPreVerificationGas(userOp),
      )

      /**
       * The simulation gas limit is calculated as follows give simulation enough gas to run validations, but not more:
       * - prevg: The pre-verification gas calculated by the preVerificationGasCalculator.
       * - verificationGasLimit: The user-supplied verification gas limit.
       * - paymasterVerificationGasLimit: The user-supplied paymaster verification gas limit (if any).
       */
      const simulationGas = sum(
        prevg,
        BigInt(userOp.verificationGasLimit),
        BigInt(userOp.paymasterVerificationGasLimit ?? 0),
      )

      const tx: any = {
        from: ethers.ZeroAddress,
        to: epAddress,
        data: entryPoint.interface.encodeFunctionData('handleOps', [
          [packUserOp(userOp)],
          ethers.ZeroAddress,
        ]),
        gasLimit: simulationGas.toString(),
        authorizationList:
          userOp.eip7702Auth == null ? null : [userOp.eip7702Auth],
      }

      const tracerResult = await runErc7562NativeTracer(
        ps,
        tx,
        defaultStateOverrides,
      )

      const stakeResults = await getStakes(
        entryPoint,
        userOp.sender,
        userOp.paymaster,
        userOp.factory,
      )

      return tracerResult
        .flatMap(parseTracerResultCallsForRevert)
        .flatMap((parsedTracerResult) =>
          generateValidationResult(userOp, parsedTracerResult, stakeResults),
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
        (error: NetworkCallError) => {
          const decodedError = decodeRevertReason(error)

          // throw with specific error codes:
          if (decodedError.startsWith('FailedOp(0,"AA24')) {
            return Either.Left(
              new RpcError(
                'AA24: Invalid UserOp signature',
                ValidationErrors.InvalidSignature,
              ),
            )
          }

          if (decodedError.startsWith('FailedOp(0,"AA34')) {
            return Either.Left(
              new RpcError(
                'AA34: Invalid Paymaster signature',
                ValidationErrors.InvalidSignature,
              ),
            )
          }

          return Either.Left(
            new RpcError(decodedError, ValidationErrors.SimulateValidation),
          )
        },
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

    supportsDebugTraceCallWithNativeTracer: async (
      nativeTracer: string,
    ): Promise<boolean> => {
      return (
        await ps.debug_traceCall(
          {},
          {
            tracer: nativeTracer,
          },
        )
      ).fold(
        (_) => false,
        (_) => true,
      )
    },
  }
}
