import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { BigNumber, ContractFactory, ethers, utils } from 'ethers'
import { ReferencedCodeHashes, StakeInfo, StorageMap, UserOperation, ValidateUserOpResult, ValidationErrors, ValidationResult, BundlerCollectorReturn, ExitInfo } from '../types'
import {  RpcError, requireCond, packUserOp, requireAddressAndFields, mergeValidationDataValues, calcPreVerificationGas, decodeErrorReason } from '../utils'
import { EntryPointSimulationsDeployedBytecode, GET_CODE_HASH_ABI, GET_CODE_HASH_BYTECODE, I_ENTRY_POINT_SIMULATIONS } from '../abis'
import { ProviderService } from '../provider'
import { ReputationManager } from '../reputation'
import { parseScannerResult } from './parseScannerResult'
import { Logger } from '../logger'

export class ValidationService {
  private readonly providerService: ProviderService
  private readonly reputationManager: ReputationManager
  private readonly entryPointContract: ethers.Contract
  private readonly isUnsafeMode: boolean
  private readonly HEX_REGEX = /^0x[a-fA-F\d]*$/i
  private readonly VALID_UNTIL_FUTURE_SECONDS = 30 // how much time into the future a UserOperation must be valid in order to be accepted
  private readonly entryPointSimulations = new utils.Interface(I_ENTRY_POINT_SIMULATIONS)
  private readonly addressZero = '0x0000000000000000000000000000000000000000'

  constructor(
    providerService: ProviderService,
    reputationManager: ReputationManager,
    entryPointContract: ethers.Contract,
    isUnsafeMode: boolean
  ) {
    this.providerService = providerService
    this.reputationManager = reputationManager
    this.entryPointContract = entryPointContract
    this.isUnsafeMode = isUnsafeMode
  }

  // standard eth_call to simulateValidation
  // TODO: ep v0.7 - update to use state override with EntryPointSimulations contract
  public async callSimulateValidation(
    userOp: UserOperation
  ): Promise<ValidationResult> {
    const data = this.entryPointSimulations.encodeFunctionData('simulateValidation', [packUserOp(userOp)])
    const tx = {
      to: this.entryPointContract.address,
      data
    }
    const stateOverride = {
      [this.entryPointContract.address]: {
        code: EntryPointSimulationsDeployedBytecode
      }
    }
  
    try {
      const simulationResult = await this.providerService.send('eth_call', [tx, 'latest', stateOverride])
      const [res] = this.entryPointSimulations.decodeFunctionResult('simulateValidation', simulationResult) as any[] // TODO: Extract the correct type
      
      return this.parseValidationResult(userOp, res)
    } catch (error: any) {
      // TODO: Decode revert reason
      throw error
    }
  }

  parseValidationResult (userOp: UserOperation, res: any): ValidationResult {
    const mergedValidation = mergeValidationDataValues(res.returnInfo.accountValidationData, res.returnInfo.paymasterValidationData)

    function fillEntity (addr: string | undefined, info: any): StakeInfo | undefined {
      if (addr == null || addr === this.addressZero) return undefined
      return {
        addr,
        stake: info.stake,
        unstakeDelaySec: info.unstakeDelaySec
      }
    }

    const returnInfo = {
      sigFailed: mergedValidation.aggregator !== this.addressZero,
      validUntil: mergedValidation.validUntil,
      validAfter: mergedValidation.validAfter,
      preOpGas: res.returnInfo.preOpGas,
      prefund: res.returnInfo.prefund
    }
    return {
      returnInfo,
      senderInfo: fillEntity(userOp.sender, res.senderInfo) as StakeInfo,
      paymasterInfo: fillEntity(userOp.paymaster, res.paymasterInfo),
      factoryInfo: fillEntity(userOp.factory, res.factoryInfo),
      aggregatorInfo: fillEntity(res.aggregatorInfo.aggregator, res.aggregatorInfo.stakeInfo)
    }
  }

  public async gethTraceCallSimulateValidation(
    userOp: UserOperation
  ): Promise<[ValidationResult, BundlerCollectorReturn]> {
    // By encoding the function name and its parameters, you create a compact binary representation of the function call, which is required to interact with the contract correctly.
    const simulateCall = this.entryPointSimulations.encodeFunctionData(
      'simulateValidation',
      [packUserOp(userOp)]
    )
    const simulationGas = BigNumber.from(userOp.preVerificationGas).add(
      userOp.verificationGasLimit
    )

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
    const stringifiedTracer = tracer.match(regexp)![1]
    
    const tracerResult: BundlerCollectorReturn =
      await this.providerService.debug_traceCall(
        {
          from: ethers.constants.AddressZero,
          to: this.entryPointContract.address,
          data: simulateCall,
          gasLimit: simulationGas,
        },
        { 
          tracer: stringifiedTracer,
          stateOverrides: {
            [this.entryPointContract.address]: {
              code: EntryPointSimulationsDeployedBytecode
            }
          }
        }
      )

    const lastResult = tracerResult.calls.slice(-1)[0]
    const data = (lastResult as ExitInfo).data
    if (lastResult.type !== 'REVERT') {
      throw new Error('Invalid response. simulateCall must revert')
    }
    // // Hack to handle SELFDESTRUCT until we fix entrypoint
    // if (data === "0x") {
    //   return [data as any, tracerResult];
    // }
    try {
      const [decodedSimulations] = this.entryPointSimulations.decodeFunctionResult('simulateValidation', data)
      const validationResult = this.parseValidationResult(userOp, decodedSimulations)

      return [validationResult, tracerResult]
    } catch (e: any) {
      // if already parsed, throw as is
      if (e.code != null) {
        throw e
      }

      // not a known error of EntryPoint (probably, only Error(string), since FailedOp is handled above)
      const err = decodeErrorReason(data)
      throw new RpcError(err != null ? err.message : data, 111)
    }
  }

  /**
   * validate UserOperation.
   * should also handle unmodified memory (e.g. by referencing cached storage in the mempool
   * one item to check that was un-modified is the aggregator..
   * @param userOp
   */
  public async validateUserOp(
    userOp: UserOperation,
    previousCodeHashes?: ReferencedCodeHashes,
    checkStakes = true
  ): Promise<ValidateUserOpResult> {
    if (previousCodeHashes != null && previousCodeHashes.addresses.length > 0) {
      const { hash: codeHashes } = await this.getCodeHashes(
        previousCodeHashes.addresses
      )
      requireCond(
        codeHashes === previousCodeHashes.hash,
        'modified code after first validation',
        ValidationErrors.OpcodeValidation
      )
    }

    let res: ValidationResult
    let codeHashes: ReferencedCodeHashes = {
      addresses: [],
      hash: '',
    }
    let storageMap: StorageMap = {}

    if (!this.isUnsafeMode) {
      Logger.debug('Running full validation with storage/opcode checks')
      let tracerResult: BundlerCollectorReturn;
      [res, tracerResult] = await this.gethTraceCallSimulateValidation(userOp)
      let contractAddresses: string[];

      [contractAddresses, storageMap] = parseScannerResult(
        userOp,
        tracerResult,
        res,
        this.entryPointContract
      )

      // if no previous contract hashes, then calculate hashes of contracts
      if (previousCodeHashes == null) {
        codeHashes = await this.getCodeHashes(contractAddresses)
      }

      if ((res as any) === '0x') {
        throw new Error('simulateValidation reverted with no revert string!')
      }
    } else {
      Logger.debug('Running validation no stake or opcode checks')
      res = await this.callSimulateValidation(userOp)
    }

    requireCond(
      !res.returnInfo.sigFailed,
      'Invalid UserOp signature or paymaster signature',
      ValidationErrors.InvalidSignature
    )

    const now = Math.floor(Date.now() / 1000)
    requireCond(
      res.returnInfo.validAfter <= now,
      'time-range in the future time',
      ValidationErrors.NotInTimeRange
    )

    requireCond(
      res.returnInfo.validUntil == null || res.returnInfo.validUntil >= now,
      'already expired',
      ValidationErrors.NotInTimeRange
    )

    requireCond(
      res.returnInfo.validUntil == null ||
        res.returnInfo.validUntil > now + this.VALID_UNTIL_FUTURE_SECONDS,
      'expires too soon',
      ValidationErrors.NotInTimeRange
    )

    if (res.aggregatorInfo != null) {
      this.reputationManager.checkStake('aggregator', res.aggregatorInfo)
    }
    requireCond(
      res.aggregatorInfo == null,
      'Currently not supporting aggregator',
      ValidationErrors.UnsupportedSignatureAggregator
    )

    // check aa51
    const verificationCost = BigNumber.from(res.returnInfo.preOpGas).sub(
      userOp.preVerificationGas
    )
    const extraGas = BigNumber.from(userOp.verificationGasLimit)
      .sub(verificationCost)
      .toNumber()
    requireCond(
      extraGas >= 2000,
      `verificationGas should have extra 2000 gas. has only ${extraGas}`,
      ValidationErrors.SimulateValidation
    )

    Logger.debug({ userOp }, 'UserOp passed validation')
    return {
      ...res,
      referencedContracts: codeHashes,
      storageMap,
    }
  }

  /**
   * perform static checking on input parameters.
   * @param userOp
   * @param entryPointInput
   * @param requireSignature
   * @param requireGasParams
   */
  public validateInputParameters(
    userOp: UserOperation,
    entryPointInput: string,
    requireSignature = true,
    requireGasParams = true
  ): void {
    requireCond(
      entryPointInput != null,
      'No entryPoint param',
      ValidationErrors.InvalidFields
    )
    requireCond(
      entryPointInput.toLowerCase() ===
        this.entryPointContract.address.toLowerCase(),
      `The EntryPoint at "${entryPointInput}" is not supported. This bundler uses ${this.entryPointContract.address}`,
      ValidationErrors.InvalidFields
    )

    // minimal sanity check: userOp exists, and all members are hex
    requireCond(
      userOp != null,
      'No UserOperation param',
      ValidationErrors.InvalidFields
    )

    const fields = ['sender', 'nonce', 'callData']
    if (requireSignature) {
      fields.push('signature')
    }
    if (requireGasParams) {
      fields.push(
        'preVerificationGas',
        'verificationGasLimit',
        'callGasLimit',
        'maxFeePerGas',
        'maxPriorityFeePerGas'
      )
    }
    fields.forEach((key) => {
      const value: string = (userOp as any)[key]?.toString()
      requireCond(
        value != null,
        'Missing userOp field: ' + key + ' ' + JSON.stringify(userOp),
        ValidationErrors.InvalidFields
      )
      requireCond(
        value.match(this.HEX_REGEX) != null,
        `Invalid hex value for property ${key}:${value} in UserOp`,
        ValidationErrors.InvalidFields
      )
    })

    requireAddressAndFields(
      userOp,
      'paymaster',
      ['paymasterPostOpGasLimit', 'paymasterVerificationGasLimit'],
      ['paymasterData']
    )
    requireAddressAndFields(userOp, 'factory', ['factoryData'])

    const calcPreVerificationGas1 = calcPreVerificationGas(userOp)
    requireCond(
      BigNumber.from(userOp.preVerificationGas).gte(
        BigNumber.from(calcPreVerificationGas1)
      ),
      `preVerificationGas too low: expected at least ${calcPreVerificationGas1}`,
      ValidationErrors.InvalidFields
    )
  }

  public async getCodeHashes(
    addresses: string[]
  ): Promise<ReferencedCodeHashes> {
    const getCodeHashesFactory = new ethers.ContractFactory(
      GET_CODE_HASH_ABI,
      GET_CODE_HASH_BYTECODE
    ) as ContractFactory

    const { hash } = await this.providerService.runContractScript(
      getCodeHashesFactory,
      [addresses]
    )

    return {
      hash,
      addresses,
    }
  }
}