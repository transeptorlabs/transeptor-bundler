import { BigNumber, BytesLike, ContractFactory, ethers } from 'ethers'
import { ReferencedCodeHashes, StakeInfo, StorageMap, UserOperation, ValidateUserOpResult, ValidationErrors, ValidationResult } from '../types'
import { GET_CODE_HASH_ABI, GET_CODE_HASH_BYTECODE, RpcError, getAddr, requireCond } from '../utils'
import { ProviderService } from '../provider'
import { BundlerCollectorReturn, ExitInfo, bundlerCollectorTracer } from './BundlerCollectorTracer'
import { decodeErrorReason } from './GethTracer'
import { ReputationManager } from '../reputation'
import { parseScannerResult } from './parseScannerResult'
import { Logger } from '../logger'

export class ValidationService {
  private readonly providerService: ProviderService
  private readonly reputationManager: ReputationManager
  private readonly entryPointContract: ethers.Contract
  private readonly isUnsafeMode: boolean

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
  public async callSimulateValidation(
    userOp: UserOperation
  ): Promise<ValidationResult> {
    const errorResult = await this.entryPointContract.callStatic
      .simulateValidation(userOp, { gasLimit: 10e6 })
      .catch((e) => e)
    return this.parseErrorResult(userOp, errorResult)
  }

  private parseErrorResult(
    userOp: UserOperation,
    errorResult: { errorName: string; errorArgs: any }
  ): ValidationResult {
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

  public async gethTraceCallSimulateValidation(
    userOp: UserOperation
  ): Promise<[ValidationResult, BundlerCollectorReturn]> {
    // By encoding the function name and its parameters, you create a compact binary representation of the function call, which is required to interact with the contract correctly.
    const simulateCall = this.entryPointContract.interface.encodeFunctionData(
      'simulateValidation',
      [userOp]
    )

    const simulationGas = BigNumber.from(userOp.preVerificationGas).add(
      userOp.verificationGasLimit
    )

    const tracerResult: BundlerCollectorReturn =
      await this.providerService.debug_traceCall(
        {
          from: ethers.constants.AddressZero,
          to: this.entryPointContract.address,
          data: simulateCall,
          gasLimit: simulationGas,
        },
        { tracer: bundlerCollectorTracer }
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
      const { name: errorName, args: errorArgs } =
        this.entryPointContract.interface.parseError(data)
      const errFullName = `${errorName}(${errorArgs.toString()})`
      const errorResult = this.parseErrorResult(userOp, {
        errorName,
        errorArgs,
      })
      if (!errorName.includes('Result')) {
        // a real error, not a result.
        throw new Error(errFullName)
      }
      Logger.debug(
        {
          dumpTree: JSON.stringify(tracerResult, null, 2)
          .replace(new RegExp(userOp.sender.toLowerCase()), '{sender}')
          .replace(
            new RegExp(getAddr(userOp.paymasterAndData) ?? '--no-paymaster--'),
            '{paymaster}'
          )
          .replace(
            new RegExp(getAddr(userOp.initCode) ?? '--no-initcode--'),
            '{factory}'
          )
        }, 
        '==dump tree='
      )
      // console.log('==debug=', ...tracerResult.numberLevels.forEach(x=>x.access), 'sender=', userOp.sender, 'paymaster=', hexlify(userOp.paymasterAndData)?.slice(0, 42))
      // errorResult is "ValidationResult"
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
      [res, tracerResult] = await this.gethTraceCallSimulateValidation(
        userOp
      )
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
      Logger.debug('Running validation no storage or opcode checks')
      // NOTE: this mode doesn't do any opcode checking and no stake checking!
      res = await this.callSimulateValidation(userOp)
    }

    requireCond(
      !res.returnInfo.sigFailed,
      'Invalid UserOp signature or paymaster signature',
      ValidationErrors.InvalidSignature
    )
    requireCond(
      res.returnInfo.deadline == null ||
        res.returnInfo.deadline + 30 < Date.now() / 1000,
      'expires too soon',
      ValidationErrors.ExpiresShortly
    )

    if (res.aggregatorInfo != null) {
      this.reputationManager.checkStake('aggregator', res.aggregatorInfo)
    }

    requireCond(
      res.aggregatorInfo == null,
      'Currently not supporting aggregator',
      ValidationErrors.UnsupportedSignatureAggregator
    )

    return {
      ...res,
      referencedContracts: codeHashes,
      storageMap,
    }
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