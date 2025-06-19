/* eslint-disable complexity */
import {
  AbiCoder,
  ethers,
  Interface,
  keccak256,
  toUtf8Bytes,
  TransactionRequest,
  BigNumberish,
} from 'ethers'

import {
  ENTRY_POINT_SIMULATIONS,
  I_ENTRY_POINT_SIMULATIONS,
  IACCOUNT_ABI,
  IPAYMASTER_ABI,
  SIMPLE_ACCOUNT_ABI,
} from '../abis/index.js'
import {
  EIP_7702_MARKER_INIT_CODE,
  GethNativeTracerName,
} from '../constants/index.js'
import { Either } from '../monad/index.js'
import { ProviderService } from '../provider/index.js'
import {
  UserOperation,
  ExecutionResult,
  StakeInfoWithAddr,
  ValidationErrors,
  ValidationResult,
  NetworkCallError,
  RpcError,
  ExecutionResultStruct,
  SimulateValidationReturnStruct,
  ERC7562Call,
  ValidationData,
  StakeInfo,
  PaymasterValidationInfo,
  FullValidationResult,
} from '../types/index.js'
import {
  maxUint48,
  mergeValidationDataValues,
  parseValidationData,
} from '../utils/index.js'

export const parseExecutionResult = (
  res: ExecutionResultStruct,
): ExecutionResult => {
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

export const decodeErrorReason = (
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

export const decodeRevertReason = (
  data: string | NetworkCallError,
  nullIfNoMatch = true,
): string | null => {
  if (data == null || data === '0x') {
    if (!nullIfNoMatch) {
      return ''
    }
    return null
  }

  const decodeRevertReasonContracts = new Interface(
    [
      ...new Interface(ENTRY_POINT_SIMULATIONS).fragments,
      ...new Interface(IPAYMASTER_ABI).fragments,
      ...new Interface(SIMPLE_ACCOUNT_ABI).fragments,
    ].filter((f: any) => f.type === 'error'),
  )

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
    // if (typeof data !== 'string') throw err
  }

  const methodSig = data.slice(0, 10)
  const dataParams = '0x' + data.slice(10)
  try {
    // can't add Error(string) to xface...
    if (methodSig === '0x08c379a0') {
      const [err] = AbiCoder.defaultAbiCoder().decode(['string'], dataParams)
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      return `Error(${err})`
    } else if (methodSig === '0x4e487b71') {
      const [code] = AbiCoder.defaultAbiCoder().decode(['uint256'], dataParams)
      return `Panic(${panicCodes[code] ?? code} + ')`
    }

    const err = decodeRevertReasonContracts.parseError(data)
    // treat any error "bytes" argument as possible error to decode (e.g. FailedOpWithRevert, PostOpReverted)
    const args = err.args.map((arg: any, index) => {
      switch (err.fragment.inputs[index].type) {
        case 'bytes':
          return decodeRevertReason(arg, false)
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

export const normalizePreState = (preState: {
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

export const runErc7562NativeTracer = async (
  ps: ProviderService,
  tx: TransactionRequest,
  stateOverrides: { [address: string]: { code: string } },
): Promise<Either<RpcError, ERC7562Call>> => {
  return ps.debug_traceCall<ERC7562Call>(tx, {
    tracer: GethNativeTracerName,
    stateOverrides,
  })
}

export const parseSimulateValidationResult = (
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

  return {
    returnInfo: {
      sigFailed: mergedValidation.aggregator !== ethers.ZeroAddress,
      validUntil: mergedValidation.validUntil,
      validAfter: mergedValidation.validAfter,
      preOpGas: res.returnInfo.preOpGas,
      prefund: res.returnInfo.prefund,
    },
    senderInfo: fillEntity(userOp.sender, res.senderInfo) as StakeInfoWithAddr,
    paymasterInfo: fillEntity(userOp.paymaster, res.paymasterInfo),
    factoryInfo: fillEntity(userOp.factory, res.factoryInfo),
    aggregatorInfo: fillEntity(
      res.aggregatorInfo.aggregator,
      res.aggregatorInfo.stakeInfo,
    ),
  }
}

export const parseTracerResultCallsForRevert = (
  tracerResult: ERC7562Call,
): Either<RpcError, ERC7562Call> => {
  if (tracerResult.output == null) {
    return Either.Right(tracerResult)
  }
  // during simulation, we pass gas enough for simulation, and little extra.
  // so either execution fails on OOG, (AA95) or the entire HandleOps fail on wrong beneficiary
  // both mean validation success
  const EXPECTED_INNER_HANDLE_OP_FAILURES = new Set([
    'FailedOp(0,"AA95 out of gas")',
    'Error(AA90 invalid beneficiary)',
  ])

  const decodedErrorReason = decodeRevertReason(
    tracerResult.output,
    false,
  ) as string

  if (decodedErrorReason.startsWith('FailedOp(0,"AA24')) {
    return Either.Left(
      new RpcError(
        'AA24: Invalid UserOp signature',
        ValidationErrors.InvalidSignature,
      ),
    )
  }
  if (decodedErrorReason.startsWith('FailedOp(0,"AA34')) {
    return Either.Left(
      new RpcError(
        'AA34: Invalid Paymaster signature',
        ValidationErrors.InvalidSignature,
      ),
    )
  }

  if (!EXPECTED_INNER_HANDLE_OP_FAILURES.has(decodedErrorReason)) {
    return Either.Left(
      new RpcError(decodedErrorReason, ValidationErrors.SimulateValidation),
    )
  }

  return Either.Right(tracerResult)
}

export const get4bytes = (input: string): string => {
  return input.slice(0, 10)
}

export const getValidationCalls = (
  op: UserOperation,
  entryPointCall: ERC7562Call,
): {
  validationCall: ERC7562Call
  paymasterCall?: ERC7562Call
  innerCall: ERC7562Call
} => {
  let callIndex = 0
  const hasFactoryCall =
    op.factory != null && op.factory !== EIP_7702_MARKER_INIT_CODE
  const hasEip7702InitCall =
    op.factory === EIP_7702_MARKER_INIT_CODE &&
    op.factoryData != null &&
    op.factoryData.length > 0
  if (hasFactoryCall || hasEip7702InitCall) {
    callIndex++
  }
  const validationCall = entryPointCall.calls[callIndex++]
  let paymasterCall: ERC7562Call | undefined
  if (op.paymaster != null) {
    paymasterCall = entryPointCall.calls[callIndex++]
  }
  const innerCall = entryPointCall.calls[callIndex]
  return {
    validationCall,
    paymasterCall,
    innerCall,
  }
}

export const decodeValidateUserOp = (call: ERC7562Call): ValidationData => {
  const methodSig = new Interface(IACCOUNT_ABI).getFunction(
    'validateUserOp',
  ).selector

  if (get4bytes(call.input) !== methodSig) {
    throw new Error('Not a validateUserOp')
  }

  if (call.output == null) {
    throw new Error('validateUserOp: No output')
  }
  return parseValidationData(call.output)
}

export const decodeValidatePaymasterUserOp = (
  call: ERC7562Call,
): { context: string; validationData: ValidationData } => {
  const iPaymaster = new Interface(IPAYMASTER_ABI)
  const methodSig = iPaymaster.getFunction('validatePaymasterUserOp').selector
  if (get4bytes(call.input) !== methodSig) {
    throw new Error('Not a validatePaymasterUserOp')
  }
  if (call.output == null) {
    throw new Error('validatePaymasterUserOp: No output')
  }
  const ret = iPaymaster.decodeFunctionResult(
    'validatePaymasterUserOp',
    call.output,
  )
  return {
    context: ret.context,
    validationData: parseValidationData(ret.validationData),
  }
}

export const getStakes = async (
  entryPoint: ethers.Contract,
  sender: string,
  paymaster?: string,
  factory?: string,
): Promise<{
  sender: StakeInfo
  paymaster?: StakeInfo
  factory?: StakeInfo
}> => {
  const [senderInfo, paymasterInfo, factoryInfo] = await Promise.all([
    entryPoint.getDepositInfo(sender),
    paymaster != null ? entryPoint.getDepositInfo(paymaster) : null,
    factory != null && factory !== EIP_7702_MARKER_INIT_CODE
      ? entryPoint.getDepositInfo(factory)
      : null,
  ])
  return {
    sender: {
      addr: sender,
      stake: senderInfo.stake,
      unstakeDelaySec: senderInfo.unstakeDelaySec,
    },
    paymaster:
      paymasterInfo != null
        ? {
            addr: paymaster ?? '',
            stake: paymasterInfo.stake,
            unstakeDelaySec: paymasterInfo.unstakeDelaySec,
          }
        : undefined,
    factory:
      factoryInfo != null
        ? {
            addr: factory ?? '',
            stake: factoryInfo.stake,
            unstakeDelaySec: factoryInfo.unstakeDelaySec,
          }
        : undefined,
  }
}

export const decodeInnerHandleOp = (
  call: ERC7562Call,
): { preOpGas: BigNumberish; prefund: BigNumberish } => {
  const iEntrypointSim = new Interface(I_ENTRY_POINT_SIMULATIONS)
  const methodSig = iEntrypointSim.getFunction('innerHandleOp').selector
  if (get4bytes(call.input) !== methodSig) {
    throw new Error('Not a innerHandleOp')
  }
  const params = iEntrypointSim.decodeFunctionData('innerHandleOp', call.input)
  return {
    preOpGas: params.opInfo.preOpGas,
    prefund: params.opInfo.prefund,
  }
}

// generate validation result from trace(handleOps): by decoding inner calls.
export const generateValidationResult = (
  userOp: UserOperation,
  tracerResult: ERC7562Call,
  stakeResults: {
    sender: StakeInfo
    paymaster?: StakeInfo
    factory?: StakeInfo
  },
): Either<RpcError, FullValidationResult> => {
  try {
    const { validationCall, paymasterCall, innerCall } = getValidationCalls(
      userOp,
      tracerResult,
    )
    const validationData = decodeValidateUserOp(validationCall)

    let paymasterValidationData: ValidationData = {
      validAfter: 0,
      validUntil: maxUint48,
      aggregator: ethers.ZeroAddress,
    }
    let paymasterContext: string | undefined
    if (paymasterCall != null) {
      const pmRet = decodeValidatePaymasterUserOp(paymasterCall)
      paymasterContext = pmRet.context
      paymasterValidationData = pmRet.validationData
    }

    const innerHandleOpsOut =
      innerCall == null ? undefined : decodeInnerHandleOp(innerCall)

    let paymasterInfo: PaymasterValidationInfo | undefined =
      stakeResults.paymaster
    if (paymasterInfo != null) {
      paymasterInfo = { ...paymasterInfo, context: paymasterContext }
    }

    return Either.Right([
      {
        returnInfo: {
          sigFailed: false, // can't fail here, since handleOps didn't revert.
          validUntil: Math.min(
            validationData.validUntil,
            paymasterValidationData.validUntil,
          ),
          validAfter: Math.max(
            validationData.validAfter,
            paymasterValidationData.validAfter,
          ),
          preOpGas: innerHandleOpsOut?.preOpGas, // extract from innerHandleOps parameter
          prefund: innerHandleOpsOut?.prefund, // extract from innerHandleOps parameter
        },
        senderInfo: stakeResults.sender,
        paymasterInfo,
        factoryInfo: stakeResults.factory,
      },
      tracerResult as ERC7562Call,
    ])
  } catch (e: any) {
    // if already parsed, return as is
    if (e.code != null) {
      return Either.Left(new RpcError(e.message, e.code, e.data))
    }
    // not a known error of EntryPoint (probably, only Error(string), since FailedOp is handled above)
    const err = decodeErrorReason(e)
    return Either.Left(
      new RpcError(err != null ? err.reason : 'unknown reason', -32000),
    )
  }
}
