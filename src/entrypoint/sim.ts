import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { BundlerCollectorReturn, ExitInfo, StakeInfo as StakeInfoWithAddr, UserOperation, ValidationErrors, ValidationResult } from '../types'
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

const parseValidationResult = (userOp: UserOperation, res: SimulateValidationReturnStruct): ValidationResult => {
    const mergedValidation = mergeValidationDataValues(res.returnInfo.accountValidationData, res.returnInfo.paymasterValidationData)

    function fillEntity (addr: string | undefined, info: any): StakeInfoWithAddr | undefined {
      if (addr == null || addr === this.addressZero) return undefined
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

const decodeEpErrorReason = (error: string): {
    message: string;
    opIndex?: any;
} => {
    const ErrorSig = (0, utils.keccak256)(Buffer.from('Error(string)')).slice(0, 10)
    const FailedOpSig = (0, utils.keccak256)(Buffer.from('FailedOp(uint256,string)')).slice(0, 10)
  
    if (error.startsWith(ErrorSig)) {
      const [message] = utils.defaultAbiCoder.decode(['string'], '0x' + error.substring(10))
      return { message } 
    } else if (error.startsWith(FailedOpSig)) {
      const [opIndex, message] = utils.defaultAbiCoder.decode(['uint256', 'string'], '0x' + error.substring(10))
      const errorMessage = `FailedOp: ${message}`
      return {
        message: errorMessage,
        opIndex
      }
    } else {
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

    const simulationResult = await provider.send('eth_call', [
        {
        to: epAddress,
        data: epSimsInterface.encodeFunctionData('simulateValidation', [packUserOp(userOp)])
        }, 
        'latest',
        stateOverride
    ]).catch((error: any) => {
        if (error.body) {
            const bodyParse = JSON.parse(error.body)
            if (bodyParse.error.data &&  bodyParse.error.message === 'execution reverted') {
                const err = decodeEpErrorReason(bodyParse.error.data)
                throw new RpcError(err != null ? err.message : 'Unknown error', 111)
            }
            throw new RpcError('Unknown error', 111)
        }
        throw new RpcError('Unknown error', 111)
    })

    const [res] = epSimsInterface.decodeFunctionResult('simulateValidation', simulationResult)
    
    return parseValidationResult(userOp, res)
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
    if (lastCallResult.type !== 'REVERT') {
        throw new Error('Invalid response. simulateCall must revert')
    }

    // The exitInfoData for the last call can be of type ValidationResult or FailOp from the EntryPointSimulations contract
    const err = decodeEpErrorReason(exitInfoData)
    if (err) {
        throw new RpcError(err.message, 111)
    }

    const [decodedSimulations] = epSimsInterface.decodeFunctionResult('simulateValidation', exitInfoData)
    const validationResult = parseValidationResult(userOp, decodedSimulations)

    return [validationResult, tracerResult]
}

export const simulateHandleOp = async (epAddress: string, provider: ProviderService, userOp: UserOperation) => {    
    const stateOverride = {
        [epAddress]: {
        code: EntryPointSimulationsDeployedBytecode
        }
    }

    const errorResult = await provider.send('eth_call', [
        {
            to: epAddress,
            data: epSimsInterface.encodeFunctionData('simulateHandleOp', [packUserOp(userOp), ethers.constants.AddressZero, '0x'])
        }, 
        'latest',
        stateOverride
    ]).catch(e => e)
    
    if (errorResult.errorName === 'FailedOp') {
        throw new RpcError(errorResult.errorArgs.at(-1), ValidationErrors.SimulateValidation)
    }

    if (errorResult.errorName !== 'ExecutionResult') {
        throw errorResult
    }

    const { returnInfo } = errorResult.errorArgs

    return returnInfo
}