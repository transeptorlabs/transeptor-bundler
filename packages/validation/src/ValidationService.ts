import { readFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { BigNumber, BytesLike, ContractFactory, ethers } from 'ethers'
import { ReferencedCodeHashes, StakeInfo, StorageMap, UserOperation, ValidateUserOpResult, ValidationErrors, ValidationResult, BundlerCollectorReturn, ExitInfo } from 'types'
import { GET_CODE_HASH_ABI, GET_CODE_HASH_BYTECODE, RpcError, getAddr, requireCond } from 'utils'
import { ProviderService } from 'provider'
import { decodeErrorReason } from 'utils'
import { ReputationManager } from 'reputation'
import { parseScannerResult } from './parseScannerResult'
import { Logger } from 'logger'
import { calcPreVerificationGas } from '@account-abstraction/sdk'
export class ValidationService {
  private readonly providerService: ProviderService
  private readonly reputationManager: ReputationManager
  private readonly entryPointContract: ethers.Contract
  private readonly isUnsafeMode: boolean
  private readonly HEX_REGEX = /^0x[a-fA-F\d]*$/i
  private readonly VALID_UNTIL_FUTURE_SECONDS = 30  // how much time into the future a UserOperation must be valid in order to be accepted

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
  public async callSimulateValidation(userOp: UserOperation): Promise<ValidationResult> {
    const errorResult = await this.entryPointContract.callStatic.simulateValidation(userOp, { gasLimit: 10e6 }).catch((e) => e)
    return this.parseErrorResult(userOp, errorResult)
  }

  private parseErrorResult(userOp: UserOperation, errorResult: { errorName: string; errorArgs: any }): ValidationResult {
    if (!errorResult?.errorName?.startsWith('ValidationResult')) {
      // parse it as FailedOp
      // if its FailedOp, then we have the paymaster param... otherwise its an Error(string)
      let paymaster = errorResult.errorArgs.paymaster
      if (paymaster === ethers.constants.AddressZero) {
        paymaster = undefined
      }
      // eslint-disable-next-line
      const msg: string =
        errorResult.errorArgs?.reason ?? errorResult.toString()

      if (paymaster == null) {
        throw new RpcError(
          `account validation failed: ${msg}`,
          ValidationErrors.SimulateValidation
        )
      } else {
        throw new RpcError(
          `paymaster validation failed: ${msg}`,
          ValidationErrors.SimulatePaymasterValidation,
          { paymaster }
        )
      }
    }

    const {
      returnInfo,
      senderInfo,
      factoryInfo,
      paymasterInfo,
      aggregatorInfo, // may be missing (exists only SimulationResultWithAggregator
    } = errorResult.errorArgs

    // extract address from "data" (first 20 bytes)
    // add it as "addr" member to the "stakeinfo" struct
    // if no address, then return "undefined" instead of struct.
    function fillEntity(
      data: BytesLike,
      info: StakeInfo
    ): StakeInfo | undefined {
      const addr = getAddr(data)
      return addr == null
        ? undefined
        : {
            ...info,
            addr,
          }
    }

    return {
      returnInfo,
      senderInfo: {
        ...senderInfo,
        addr: userOp.sender,
      },
      factoryInfo: fillEntity(userOp.initCode, factoryInfo),
      paymasterInfo: fillEntity(userOp.paymasterAndData, paymasterInfo),
      aggregatorInfo: fillEntity(
        aggregatorInfo?.actualAggregator,
        aggregatorInfo?.stakeInfo
      ),
    }
  }

  public async gethTraceCallSimulateValidation(userOp: UserOperation): Promise<[ValidationResult, BundlerCollectorReturn]> {
    // By encoding the function name and its parameters, you create a compact binary representation of the function call, which is required to interact with the contract correctly.
    const simulateCall = this.entryPointContract.interface.encodeFunctionData('simulateValidation', [userOp])
    const simulationGas = BigNumber.from(userOp.preVerificationGas).add(userOp.verificationGasLimit)
    
    const jsFilePath = join(__dirname, '../tracer.js')
    const tracer = readFileSync(jsFilePath).toString()
    if (tracer == null) {
      throw new Error('Tracer not found')
    }
    const regexp = /function \w+\s*\(\s*\)\s*{\s*return\s*(\{[\s\S]+\});?\s*\}\s*$/
    const stringifiedTracer = tracer.match(regexp)![1]    
    const tracerResult: BundlerCollectorReturn =
      await this.providerService.debug_traceCall(
        {
          from: ethers.constants.AddressZero,
          to: this.entryPointContract.address,
          data: simulateCall,
          gasLimit: simulationGas,
        },
        { tracer: stringifiedTracer }
      )

    const lastResult = tracerResult.calls.slice(-1)[0]
    if (lastResult.type !== 'REVERT') {
      throw new Error('Invalid response. simulateCall must revert')
    }

    const data = (lastResult as ExitInfo).data
    // Hack to handle SELFDESTRUCT until we fix entrypoint
    if (data === '0x') {
      return [data as any, tracerResult]
    }
    try {
      const { name: errorName, args: errorArgs } = this.entryPointContract.interface.parseError(data)
      const errFullName = `${errorName}(${errorArgs.toString()})`
      const errorResult = this.parseErrorResult(userOp, {
        errorName,
        errorArgs,
      })
      if (!errorName.includes('Result')) {
        // a real error, not a result.
        throw new Error(errFullName)
      }

      return [errorResult, tracerResult]
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
  public async validateUserOp(userOp: UserOperation, previousCodeHashes?: ReferencedCodeHashes, checkStakes = true): Promise<ValidateUserOpResult> {
    if (previousCodeHashes != null && previousCodeHashes.addresses.length > 0) {
      const { hash: codeHashes } = await this.getCodeHashes(previousCodeHashes.addresses)
      requireCond(codeHashes === previousCodeHashes.hash, 'modified code after first validation', ValidationErrors.OpcodeValidation)
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
    requireCond(res.returnInfo.validAfter <= now,
      'time-range in the future time',
      ValidationErrors.NotInTimeRange
    )

    requireCond(res.returnInfo.validUntil == null || res.returnInfo.validUntil >= now,
      'already expired',
      ValidationErrors.NotInTimeRange
    )

    requireCond(res.returnInfo.validUntil == null || res.returnInfo.validUntil > now + this.VALID_UNTIL_FUTURE_SECONDS,
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
    const verificationCost = BigNumber.from(res.returnInfo.preOpGas).sub(userOp.preVerificationGas)
    const extraGas = BigNumber.from(userOp.verificationGasLimit).sub(verificationCost).toNumber()
    requireCond(extraGas >= 2000, `verificationGas should have extra 2000 gas. has only ${extraGas}`, ValidationErrors.SimulateValidation)

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
  validateInputParameters (userOp: UserOperation, entryPointInput: string, requireSignature = true, requireGasParams = true): void {
    requireCond(entryPointInput != null, 'No entryPoint param', ValidationErrors.InvalidFields)
    requireCond(entryPointInput.toLowerCase() === this.entryPointContract.address.toLowerCase(),
      `The EntryPoint at "${entryPointInput}" is not supported. This bundler uses ${this.entryPointContract.address}`,
      ValidationErrors.InvalidFields)

    // minimal sanity check: userOp exists, and all members are hex
    requireCond(userOp != null, 'No UserOperation param', ValidationErrors.InvalidFields)

    const fields = ['sender', 'nonce', 'initCode', 'callData', 'paymasterAndData']
    if (requireSignature) {
      fields.push('signature')
    }
    if (requireGasParams) {
      fields.push('preVerificationGas', 'verificationGasLimit', 'callGasLimit', 'maxFeePerGas', 'maxPriorityFeePerGas')
    }
    fields.forEach(key => {
      const value: string = (userOp as any)[key]?.toString()
      requireCond(value != null,
        'Missing userOp field: ' + key + ' ' + JSON.stringify(userOp),
        ValidationErrors.InvalidFields)
      requireCond(value.match(this.HEX_REGEX) != null,
        `Invalid hex value for property ${key}:${value} in UserOp`,
        ValidationErrors.InvalidFields)
    })

    requireCond(userOp.paymasterAndData.length === 2 || userOp.paymasterAndData.length >= 42,
      'paymasterAndData: must contain at least an address',
      ValidationErrors.InvalidFields)

    // syntactically, initCode can be only the deployer address. but in reality, it must have calldata to uniquely identify the account
    requireCond(userOp.initCode.length === 2 || userOp.initCode.length >= 42,
      'initCode: must contain at least an address',
      ValidationErrors.InvalidFields)

    const calcPreVerificationGas1 = calcPreVerificationGas(userOp)
    requireCond(BigNumber.from(userOp.preVerificationGas.toString()).gte(BigNumber.from(calcPreVerificationGas1)),
      `preVerificationGas too low: expected at least ${calcPreVerificationGas1}`,
      ValidationErrors.InvalidFields)
  }

  public async getCodeHashes(addresses: string[]): Promise<ReferencedCodeHashes> {
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