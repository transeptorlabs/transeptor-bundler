import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

import {
  AbiCoder,
  BigNumberish,
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

type StakeInfo = {
  stake: BigNumberish
  unstakeDelaySec: BigNumberish
}

type AggregatorStakeInfo = {
  aggregator: string
  stakeInfo: StakeInfo
}

type SimulateValidationReturnStruct = {
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

type ExecutionResultStruct = {
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
  data: string | Error,
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
    const err = data as any
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
    // throw new Error('unsupported errorSig ' + data)
    if (!nullIfNoMatch) {
      return data
    }
    return null
  }
}

export type Simulator = {
  partialSimulateValidation(userOp: UserOperation): Promise<ValidationResult>
  fullSimulateValidation(
    userOp: UserOperation,
    nativeTracerEnabled: boolean,
  ): Promise<[ValidationResult, BundlerCollectorReturn]>
  simulateHandleOp(
    userOp: UserOperation,
    stateOverride?: StateOverride,
  ): Promise<ExecutionResult>
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

  return {
    partialSimulateValidation: async (
      userOp: UserOperation,
    ): Promise<ValidationResult> => {
      Logger.debug(
        'Running partial validation no stake or opcode checks on userOp',
      )
      const stateOverride = {
        [epAddress]: {
          code: EntryPointSimulationsDeployedBytecode,
        },
      }

      try {
        const simulationResult = await ps.send('eth_call', [
          {
            to: epAddress,
            data: epSimsInterface.encodeFunctionData(simFunctionName, [
              packUserOp(userOp),
            ]),
          },
          'latest',
          stateOverride,
        ])

        const [res] = epSimsInterface.decodeFunctionResult(
          simFunctionName,
          simulationResult,
        )

        return parseValidationResult(userOp, res)
      } catch (error: any) {
        let errorData
        if (error.body) {
          const bodyParse = JSON.parse(error.body)
          if (
            bodyParse.error.data &&
            bodyParse.error.message === 'execution reverted'
          ) {
            errorData = bodyParse.error.data
          }
        } else if (error.data) {
          errorData = error.data
        }

        const decodedError = decodeRevertReason(errorData)
        if (decodedError != null) {
          throw new RpcError(decodedError, ValidationErrors.SimulateValidation)
        }
        throw error
      }
    },

    fullSimulateValidation: async (
      userOp: UserOperation,
      nativeTracerEnabled: boolean,
    ): Promise<[ValidationResult, BundlerCollectorReturn]> => {
      Logger.debug(
        { nativeTracerEnabled },
        'Running full validation with storage/opcode checks on userOp',
      )
      const bundlerCollectorTracerString = getBundlerCollectorTracerString()
      const encodedData = epSimsInterface.encodeFunctionData(simFunctionName, [
        packUserOp(userOp),
      ])

      let tracerResult: BundlerCollectorReturn
      const tx: TransactionRequest = {
        from: ethers.ZeroAddress,
        to: epAddress,
        data: encodedData,
        gasLimit: (
          BigInt(userOp.preVerificationGas) +
          BigInt(userOp.verificationGasLimit)
        ).toString(),
      }

      const stateOverrides = {
        [epAddress]: {
          code: EntryPointSimulationsDeployedBytecode,
        },
      }
      if (nativeTracerEnabled) {
        // First we need preStateTracer from the network provider(main):
        const preState: { [addr: string]: any } = await ps.debug_traceCall(tx, {
          tracer: prestateTracerName,
          stateOverrides,
        })

        // convert nonce's to hex, and rename storage to state
        for (const key in preState) {
          if (preState[key]?.nonce != null) {
            preState[key].nonce =
              '0x' + (preState[key].nonce.toString(16) as string)
          }
          if (preState[key]?.storage != null) {
            // rpc expects "state" instead...
            preState[key].state = preState[key].storage
            delete preState[key].storage
          }
        }

        // Then we use native tracer to run the full validation
        tracerResult = await ps.debug_traceCall(
          tx,
          {
            tracer: bundlerNativeTracerName,
            stateOverrides: preState,
          },
          true,
        )
      } else {
        // Use standard javascript tracer
        tracerResult = await ps.debug_traceCall(tx, {
          tracer: bundlerCollectorTracerString,
          stateOverrides,
        })
      }

      // Parse results
      const lastCallResult = tracerResult.calls.slice(-1)[0]
      const exitInfoData = (lastCallResult as ExitInfo).data
      if (lastCallResult.type === 'REVERT') {
        throw new RpcError(
          decodeRevertReason(exitInfoData, false) as string,
          ValidationErrors.SimulateValidation,
        )
      }

      try {
        const [decodedSimulations] = epSimsInterface.decodeFunctionResult(
          simFunctionName,
          exitInfoData,
        )
        const validationResult = parseValidationResult(
          userOp,
          decodedSimulations,
        )

        return [validationResult, tracerResult]
      } catch (e: any) {
        // if already parsed, throw as is
        if (e.code != null) {
          throw e
        }
        // not a known error of EntryPoint (probably, only Error(string), since FailedOp is handled above)
        const err = decodeErrorReason(e)
        throw new RpcError(err != null ? err.reason : exitInfoData, -32000)
      }
    },

    simulateHandleOp: async (
      userOp: UserOperation,
      stateOverride?: StateOverride,
    ): Promise<ExecutionResult> => {
      Logger.debug('Running simulateHandleOp on userOp')

      const simulateHandleOpResult = await ps
        .send('eth_call', [
          {
            to: epAddress,
            data: epSimsInterface.encodeFunctionData('simulateHandleOp', [
              packUserOp(userOp),
              ethers.ZeroAddress,
              '0x',
            ]),
          },
          'latest',
          stateOverride
            ? stateOverride
            : {
                [epAddress]: {
                  code: EntryPointSimulationsDeployedBytecode,
                },
              },
        ])
        .catch((e: any) => {
          throw new RpcError(
            decodeRevertReason(e) as string,
            ValidationErrors.SimulateValidation,
          )
        })

      const [res] = epSimsInterface.decodeFunctionResult(
        'simulateHandleOp',
        simulateHandleOpResult,
      )
      return parseExecutionResult(res)
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
      const tracerResult: BundlerCollectorReturn = await ps
        .debug_traceCall(
          {
            from: ethers.ZeroAddress,
            to: ethers.ZeroAddress,
            data: '0x',
          },
          {
            tracer: bundlerCollectorTracer,
          },
        )
        .catch((e) => e)

      return tracerResult.logs != null
    },

    supportsNativeTracer: async (
      nativeTracer,
      useNativeTracerProvider = false,
    ): Promise<boolean> => {
      try {
        await ps.debug_traceCall(
          {},
          {
            tracer: nativeTracer,
          },
          useNativeTracerProvider,
        )

        return true
      } catch (e) {
        return false
      }
    },
  }
}
