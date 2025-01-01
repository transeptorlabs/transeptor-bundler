import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

import {
  AbiCoder,
  BytesLike,
  ethers,
  Interface,
  keccak256,
  toUtf8Bytes,
  TransactionRequest,
} from 'ethers'

import {
  EntryPointSimulationsDeployedBytecode,
  IENTRY_POINT_ABI,
  I_ENTRY_POINT_SIMULATIONS,
  I_TestERC20_factory_ABI,
  I_TestPaymasterRevertCustomError_abi,
} from '../abis/index.js'
import { Logger } from '../logger/index.js'
import {
  BundlerCollectorReturn,
  ExitInfo,
  StorageMap,
  UserOperation,
} from '../types/index.js'
import {
  ExecutionResult,
  StakeInfo as StakeInfoWithAddr,
  ValidationErrors,
  ValidationResult,
} from '../validation/index.js'
import {
  NetworkCallError,
  RpcError,
  mergeValidationDataValues,
  packUserOp,
} from '../utils/index.js'
import { ProviderService } from '../provider/index.js'
import { tracerResultParser } from './parseTracerResult.js'
import {
  bundlerNativeTracerName,
  prestateTracerName,
} from './gethTracer.types.js'
import { Either } from '../monad/index.js'
import {
  ExecutionResultStruct,
  FullValidationResult,
  SimulateValidationReturnStruct,
  StateOverride,
} from './sim-types.js'

const parseValidationResult = (
  userOp: UserOperation,
  res: SimulateValidationReturnStruct,
): ValidationResult => {
  const mergedValidation = mergeValidationDataValues(
    res.returnInfo.accountValidationData,
    res.returnInfo.paymasterValidationData,
  )

  /**
   * Fill entity with address and stake info.
   *
   * @param addr - The address.
   * @param info - StakeInfo for the address.
   * @returns StakeInfoWithAddr | undefined
   */
  function fillEntity(
    addr: string | undefined,
    info: any,
  ): StakeInfoWithAddr | undefined {
    if (addr == null || addr === ethers.ZeroAddress) return undefined
    return {
      addr,
      stake: info.stake,
      unstakeDelaySec: info.unstakeDelaySec,
    }
  }

  const returnInfo = {
    sigFailed: mergedValidation.aggregator !== ethers.ZeroAddress,
    validUntil: mergedValidation.validUntil,
    validAfter: mergedValidation.validAfter,
    preOpGas: res.returnInfo.preOpGas,
    prefund: res.returnInfo.prefund,
  }

  return {
    returnInfo,
    senderInfo: fillEntity(userOp.sender, res.senderInfo) as StakeInfoWithAddr,
    paymasterInfo: fillEntity(userOp.paymaster, res.paymasterInfo),
    factoryInfo: fillEntity(userOp.factory, res.factoryInfo),
    aggregatorInfo: fillEntity(
      res.aggregatorInfo.aggregator,
      res.aggregatorInfo.stakeInfo,
    ),
  }
}

const parseExecutionResult = (res: ExecutionResultStruct): ExecutionResult => {
  const { validAfter, validUntil } = mergeValidationDataValues(
    res.accountValidationData,
    res.paymasterValidationData,
  )

  return {
    preOpGas: res.preOpGas,
    targetSuccess: res.targetSuccess,
    targetResult: res.targetResult,
    validAfter,
    validUntil,
  }
}

const decodeErrorReason = (
  error: string | Error,
):
  | {
      reason: string //Revert reason. see FailedOp(uint256,string), above
      opIndex?: number //Index into the array of ops to the failed one (in simulateValidation, this is always zero).
    }
  | undefined => {
  if (typeof error !== 'string') {
    const err = error as any
    error = (err.data ?? err.error.data) as string
  }

  const ErrorSig = keccak256(toUtf8Bytes('Error(string)')).slice(0, 10)
  const FailedOpSig = keccak256(toUtf8Bytes('FailedOp(uint256,string)')).slice(
    0,
    10,
  )
  const dataParams = '0x' + error.substring(10)

  if (error.startsWith(ErrorSig)) {
    const [message] = AbiCoder.defaultAbiCoder().decode(['string'], dataParams)
    return { reason: message }
  } else if (error.startsWith(FailedOpSig)) {
    const [opIndex, message] = AbiCoder.defaultAbiCoder().decode(
      ['uint256', 'string'],
      dataParams,
    )
    const errorMessage = `FailedOp: ${message as string}`
    return {
      reason: errorMessage,
      opIndex,
    }
  }
}

const decodeRevertReason = (
  data: string | NetworkCallError,
  nullIfNoMatch = true,
): string | null => {
  const decodeRevertReasonContracts = new Interface([
    ...new Interface(IENTRY_POINT_ABI).fragments,
    ...new Interface(I_TestPaymasterRevertCustomError_abi).fragments,
    ...new Interface(I_TestERC20_factory_ABI).fragments, // for OZ errors,
    'error ECDSAInvalidSignature()',
  ])

  const panicCodes: { [key: number]: string } = {
    // from https://docs.soliditylang.org/en/v0.8.0/control-structures.html
    0x01: 'assert(false)',
    0x11: 'arithmetic overflow/underflow',
    0x12: 'divide by zero',
    0x21: 'invalid enum value',
    0x22: 'storage byte array that is incorrectly encoded',
    0x31: '.pop() on an empty array.',
    0x32: 'array sout-of-bounds or negative index',
    0x41: 'memory overflow',
    0x51: 'zero-initialized variable of internal function type',
  }

  if (typeof data !== 'string') {
    const err = data.payload
    data = (err.data ?? err.error?.data) as string
    if (typeof data !== 'string') throw err
  }

  const methodSig = data.slice(0, 10)
  const dataParams = '0x' + data.slice(10)

  // can't add Error(string) to xface...
  if (methodSig === '0x08c379a0') {
    const [err] = AbiCoder.defaultAbiCoder().decode(['string'], dataParams)
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    return `Error(${err})`
  } else if (methodSig === '0x4e487b71') {
    const [code] = AbiCoder.defaultAbiCoder().decode(['uint256'], dataParams)
    return `Panic(${panicCodes[code] ?? code} + ')`
  }

  try {
    const err = decodeRevertReasonContracts.parseError(data)
    // treat any error "bytes" argument as possible error to decode (e.g. FailedOpWithRevert, PostOpReverted)
    const args = err.args.map((arg: any, index) => {
      switch (err.fragment.inputs[index].type) {
        case 'bytes':
          return decodeRevertReason(arg)
        case 'string':
          return `"${arg as string}"`
        default:
          return arg
      }
    })
    return `${err.name}(${args.join(',')})`
  } catch (e) {
    if (!nullIfNoMatch) {
      return data
    }
    return null
  }
}

const getBundlerCollectorTracerString = () => {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)

  const jsFilePath = join(__dirname, './tracer.js')
  let tracer: string
  try {
    tracer = readFileSync(jsFilePath).toString()
  } catch (error: any) {
    Logger.error({ path: jsFilePath }, 'Tracer file path not found')
    throw new Error('Tracer not found')
  }

  if (tracer == null) {
    Logger.error({ path: jsFilePath }, 'Tracer not found')
    throw new Error('Tracer not found')
  }
  const regexp =
    /function \w+\s*\(\s*\)\s*{\s*return\s*(\{[\s\S]+\});?\s*\}\s*$/

  return tracer.match(regexp)?.[1]
}

const normalizePreState = (preState: {
  [addr: string]: any
}): { [addr: string]: any } => {
  // convert nonce's to hex, and rename storage to state
  const preStateCopy = { ...preState }
  for (const key in preStateCopy) {
    if (preStateCopy[key]?.nonce != null) {
      preStateCopy[key].nonce =
        '0x' + (preStateCopy[key].nonce.toString(16) as string)
    }
    if (preStateCopy[key]?.storage != null) {
      // rpc expects "state" instead...
      preStateCopy[key].state = preStateCopy[key].storage
      delete preStateCopy[key].storage
    }
  }

  return preStateCopy
}

const runNativeTracer = async (
  ps: ProviderService,
  tx: TransactionRequest,
  stateOverrides: object,
): Promise<Either<RpcError, BundlerCollectorReturn>> => {
  const preStateRes = await ps.debug_traceCall<{ [addr: string]: any }>(tx, {
    tracer: prestateTracerName,
    stateOverrides,
  })

  const runDebugTraceWithPreState = async (preState: {
    [addr: string]: any
  }): Promise<Either<RpcError, BundlerCollectorReturn>> => {
    return ps.debug_traceCall<BundlerCollectorReturn>(
      tx,
      {
        tracer: bundlerNativeTracerName,
        stateOverrides: normalizePreState(preState),
      },
      true,
    )
  }

  return preStateRes.foldAsync(
    async (error) => {
      return Either.Left(error)
    },
    async (preState) => runDebugTraceWithPreState(preState),
  )
}

const runStandardTracer = async (
  ps: ProviderService,
  tx: TransactionRequest,
  tracer: string,
  stateOverrides: object,
): Promise<Either<RpcError, BundlerCollectorReturn>> => {
  return ps.debug_traceCall<BundlerCollectorReturn>(tx, {
    tracer,
    stateOverrides,
  })
}

const parseTracerResultCalls = (
  tracerResult: BundlerCollectorReturn,
): Either<RpcError, [BundlerCollectorReturn, string]> => {
  const lastCallResult = tracerResult.calls.slice(-1)[0]
  const exitInfoData = (lastCallResult as ExitInfo).data
  if (lastCallResult.type === 'REVERT') {
    return Either.Left(
      new RpcError(
        decodeRevertReason(exitInfoData, false) as string,
        ValidationErrors.SimulateValidation,
      ),
    )
  }
  return Either.Right([tracerResult, exitInfoData])
}

const parseValidationResultSafe = (
  userOp: UserOperation,
  exitInfoData: string,
  tracer: BundlerCollectorReturn,
  simDetails: {
    simFunctionName: string
    epSimsInterface: Interface
  },
): Either<RpcError, FullValidationResult> => {
  try {
    const { simFunctionName, epSimsInterface } = simDetails
    const [decodedSimulations] = epSimsInterface.decodeFunctionResult(
      simFunctionName,
      exitInfoData,
    )
    const validationResult = parseValidationResult(userOp, decodedSimulations)

    return Either.Right([validationResult, tracer])
  } catch (e: any) {
    // if already parsed, return as is
    if (e.code != null) {
      return Either.Left(new RpcError(e.message, e.code, e.data))
    }
    // not a known error of EntryPoint (probably, only Error(string), since FailedOp is handled above)
    const err = decodeErrorReason(e)
    return Either.Left(
      new RpcError(err != null ? err.reason : exitInfoData, -32000),
    )
  }
}

export type Simulator = {
  partialSimulateValidation(
    userOp: UserOperation,
  ): Promise<Either<RpcError, ValidationResult>>
  fullSimulateValidation(
    userOp: UserOperation,
    nativeTracerEnabled: boolean,
  ): Promise<Either<RpcError, FullValidationResult>>
  simulateHandleOp(
    userOp: UserOperation,
    stateOverride?: StateOverride,
  ): Promise<Either<RpcError, ExecutionResult>>
  tracerResultParser(
    userOp: UserOperation,
    tracerResults: BundlerCollectorReturn,
    validationResult: ValidationResult,
  ): [string[], StorageMap]
  supportsDebugTraceCall(): Promise<boolean>
  supportsNativeTracer(
    nativeTracer: string,
    useNativeTracerProvider?: boolean,
  ): Promise<boolean>
}

export const createSimulator = (
  ps: ProviderService,
  epAddress: string,
): Simulator => {
  const epSimsInterface = new Interface(I_ENTRY_POINT_SIMULATIONS)
  const simFunctionName = 'simulateValidation'
  const stateOverrides = {
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
        stateOverrides,
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
    ): Promise<Either<RpcError, FullValidationResult>> => {
      Logger.debug(
        { nativeTracerEnabled },
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

      const tracerResult = nativeTracerEnabled
        ? await runNativeTracer(ps, tx, stateOverrides)
        : await runStandardTracer(
            ps,
            tx,
            getBundlerCollectorTracerString(),
            stateOverrides,
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
        stateOverride ? stateOverride : stateOverrides,
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
    ): [string[], StorageMap] => {
      return tracerResultParser(
        userOp,
        tracerResults,
        validationResult,
        epAddress,
      )
    },

    supportsDebugTraceCall: async (): Promise<boolean> => {
      Logger.debug(
        'Checking if network provider supports debug_traceCall to run full validation with standard javascript tracer',
      )
      const bundlerCollectorTracer = getBundlerCollectorTracerString()
      return (
        await ps.debug_traceCall<BundlerCollectorReturn>(
          {
            from: ethers.ZeroAddress,
            to: ethers.ZeroAddress,
            data: '0x',
          },
          {
            tracer: bundlerCollectorTracer,
          },
        )
      ).fold(
        (_) => {
          return false
        },
        (tracerResult) => tracerResult.logs != null,
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
