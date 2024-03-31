import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Interface} from 'ethers/lib/utils'

import { BundlerCollectorReturn, ExecutionResult, ExitInfo, StakeInfo as StakeInfoWithAddr, UserOperation, ValidationErrors, ValidationResult } from '../types'
import { ProviderService } from '../provider'
import { BigNumber, BigNumberish, BytesLike, ethers, utils } from 'ethers'
import { EntryPointSimulationsDeployedBytecode, I_ENTRY_POINT_SIMULATIONS } from '../abis'
import { RpcError, mergeValidationDataValues, packUserOp } from '../utils'
import { Logger } from '../logger'

const epSimsInterface = new utils.Interface(I_ENTRY_POINT_SIMULATIONS)

interface StakeInfo {
    stake: BigNumberish
    unstakeDelaySec: BigNumberish
}

interface AggregatorStakeInfo {
    aggregator: string;
    stakeInfo: StakeInfo;
}

interface SimulateValidationReturnStruct {
    returnInfo: {
        preOpGas: BigNumberish;
        prefund: BigNumberish;
        accountValidationData: BigNumberish;
        paymasterValidationData: BigNumberish;
        paymasterContext: BytesLike;
    };

    senderInfo: StakeInfo;
    factoryInfo: StakeInfo;
    paymasterInfo: StakeInfo;
    aggregatorInfo: AggregatorStakeInfo;
}

interface ExecutionResultStruct {
    preOpGas: BigNumberish;
    paid: BigNumberish;
    accountValidationData: BigNumberish;
    paymasterValidationData: BigNumberish;
    targetSuccess: boolean;
    targetResult: BytesLike;
}

const parseValidationResult = (userOp: UserOperation, res: SimulateValidationReturnStruct): ValidationResult => {
    const mergedValidation = mergeValidationDataValues(res.returnInfo.accountValidationData, res.returnInfo.paymasterValidationData)

    function fillEntity (addr: string | undefined, info: any): StakeInfoWithAddr | undefined {
      if (addr == null || addr === ethers.constants.AddressZero) return undefined
      return {
        addr,
        stake: info.stake,
        unstakeDelaySec: info.unstakeDelaySec
      }
    }

    const returnInfo = {
      sigFailed: mergedValidation.aggregator !== ethers.constants.AddressZero,
      validUntil: mergedValidation.validUntil,
      validAfter: mergedValidation.validAfter,
      preOpGas: res.returnInfo.preOpGas,
      prefund: res.returnInfo.prefund
    }
    return {
      returnInfo,
      senderInfo: fillEntity(userOp.sender, res.senderInfo) as StakeInfoWithAddr,
      paymasterInfo: fillEntity(userOp.paymaster, res.paymasterInfo),
      factoryInfo: fillEntity(userOp.factory, res.factoryInfo),
      aggregatorInfo: fillEntity(res.aggregatorInfo.aggregator, res.aggregatorInfo.stakeInfo)
    }
}

const parseExecutionResult = (res: ExecutionResultStruct): ExecutionResult => {
    const { validAfter, validUntil } = mergeValidationDataValues(res.accountValidationData, res.paymasterValidationData)

    return {
        preOpGas: res.preOpGas,
        targetSuccess: res.targetSuccess,
        targetResult: res.targetResult,
        validAfter,
        validUntil
    }
}

const getTracerString = () => {
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
    
    return tracer.match(regexp)![1]
}

const decodeErrorReason = (error: string| Error): {
    reason: string; //Revert reason. see FailedOp(uint256,string), above
    opIndex?: any;  //Index into the array of ops to the failed one (in simulateValidation, this is always zero).
    inner?: string; // data from inner cought revert reason
} => {
    if (typeof error !== 'string') {
        const err = error as any
        error = (err.data ?? err.error.data) as string
    }
    
    const ErrorSig = (0, utils.keccak256)(Buffer.from('Error(string)')).slice(0, 10)
    const FailedOpSig = (0, utils.keccak256)(Buffer.from('FailedOp(uint256,string)')).slice(0, 10)
    const FailedOpWithRevertSig = (0, utils.keccak256)(Buffer.from('FailedOpWithRevert(uint256,string,bytes)')).slice(0, 10)    
    const dataParams = '0x' + error.substring(10)

    if (error.startsWith(ErrorSig)) {
      const [message] = utils.defaultAbiCoder.decode(['string'], dataParams)
      return { reason: message } 
    } else if (error.startsWith(FailedOpSig)) {
      const [opIndex, message] = utils.defaultAbiCoder.decode(['uint256', 'string'], dataParams)
      const errorMessage = `FailedOp: ${message as string}`
      return {
        reason: errorMessage,
        opIndex
      }
    } else if (error.startsWith(FailedOpWithRevertSig)) {
        const [opIndex, message, inner] = utils.defaultAbiCoder.decode(['uint256', 'string', 'bytes'], dataParams)
        const errorMessage = `FailedOp: ${message as string}`
        return {
            reason: errorMessage,
            opIndex,
            inner
        }
    } else {
        return null
    }
}

const  decodeRevertReason = (data: string | Error, nullIfNoMatch = true): string | null => {
    const decodeRevertReasonContracts = new Interface([
        // ...EntryPoint__factory.createInterface().fragments,
        // ...TestPaymasterRevertCustomError__factory.createInterface().fragments,
        // ...TestERC20__factory.createInterface().fragments, // for OZ errors,
        'error ECDSAInvalidSignature()'
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
        0x51: 'zero-initialized variable of internal function type'
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
      const [err] = ethers.utils.defaultAbiCoder.decode(['string'], dataParams)
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      return `Error(${err})`
    } else if (methodSig === '0x4e487b71') {
      const [code] = ethers.utils.defaultAbiCoder.decode(['uint256'], dataParams)
      return `Panic(${panicCodes[code] ?? code} + ')`
    }
  
    try {
      const err = decodeRevertReasonContracts.parseError(data)
      // treat any error "bytes" argument as possible error to decode (e.g. FailedOpWithRevert, PostOpReverted)
      const args = err.args.map((arg: any, index) => {
        switch (err.errorFragment.inputs[index].type) {
          case 'bytes' : return decodeRevertReason(arg)
          case 'string': return `"${(arg as string)}"`
          default: return arg
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

export const partialSimulateValidation = async (epAddress: string, provider: ProviderService, userOp: UserOperation):  Promise<ValidationResult>  => {
    Logger.debug('Running partial validation no stake or opcode checks on userOp')
    const stateOverride = {
        [epAddress]: {
        code: EntryPointSimulationsDeployedBytecode
        }
    }

    try {
        const simulationResult = await provider.send('eth_call', [
            {
                to: epAddress,
                data: epSimsInterface.encodeFunctionData('simulateValidation', [packUserOp(userOp)])
            }, 
            'latest',
            stateOverride
        ])
    
        const [res] = epSimsInterface.decodeFunctionResult('simulateValidation', simulationResult)
        
        return parseValidationResult(userOp, res)
    } catch (error) {
        let errorData
        if (error.body) {
            const bodyParse = JSON.parse(error.body)
            if (bodyParse.error.data &&  bodyParse.error.message === 'execution reverted') {
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
}

export const fullSimulateValidation = async (epAddress: string, provider: ProviderService, userOp: UserOperation): Promise<[ValidationResult, BundlerCollectorReturn]> => {
    Logger.debug('Running full validation with storage/opcode checks on userOp')
    const stringifiedTracer = getTracerString()
    const encodedData = epSimsInterface.encodeFunctionData(
    'simulateValidation',
    [packUserOp(userOp)]
    )

    const tracerResult: BundlerCollectorReturn =
    await provider.debug_traceCall(
        {
            from: ethers.constants.AddressZero,
            to: epAddress,
            data: encodedData,
            gasLimit: BigNumber.from(userOp.preVerificationGas).add(userOp.verificationGasLimit),
        },
        { 
            tracer: stringifiedTracer,
            stateOverrides: {
                [epAddress]: {
                    code: EntryPointSimulationsDeployedBytecode
                }
            }
        }
    )

    const lastCallResult = tracerResult.calls.slice(-1)[0]
    const exitInfoData = (lastCallResult as ExitInfo).data
    if (lastCallResult.type === 'REVERT') {
        throw new RpcError(decodeRevertReason(exitInfoData, false) as string, ValidationErrors.SimulateValidation)
    }

    try {
        const [decodedSimulations] = epSimsInterface.decodeFunctionResult('simulateValidation', exitInfoData)
        const validationResult = parseValidationResult(userOp, decodedSimulations)
    
        return [validationResult, tracerResult]
    } catch (e) {
        // if already parsed, throw as is
        if (e.code != null) {
            throw e
        }
        // not a known error of EntryPoint (probably, only Error(string), since FailedOp is handled above)
        const err = decodeErrorReason(e)
        throw new RpcError(err != null ? err.reason : exitInfoData, -32000)
    }

}

export const simulateHandleOp = async (epAddress: string, provider: ProviderService, userOp: UserOperation): Promise<ExecutionResult> => {    
    Logger.debug('Running simulateHandleOp on userOp')
    const stateOverride = {
        [epAddress]: {
        code: EntryPointSimulationsDeployedBytecode
        }
    }

    const simulateHandleOpResult = await provider.send('eth_call', [
        {
            to: epAddress,
            data: epSimsInterface.encodeFunctionData('simulateHandleOp', [packUserOp(userOp), ethers.constants.AddressZero, '0x'])
        }, 
        'latest',
        stateOverride
    ]).catch((e: any) => { throw new RpcError(decodeRevertReason(e) as string, ValidationErrors.SimulateValidation) })


    const [res] = epSimsInterface.decodeFunctionResult('simulateHandleOp', simulateHandleOpResult)
    return parseExecutionResult(res)
}