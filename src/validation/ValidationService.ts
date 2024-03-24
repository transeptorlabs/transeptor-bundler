
import { BigNumber, ContractFactory, ethers } from 'ethers'
import { ReferencedCodeHashes, StorageMap, UserOperation, ValidateUserOpResult, ValidationErrors, ValidationResult, BundlerCollectorReturn } from '../types'
import {  requireCond, requireAddressAndFields, calcPreVerificationGas } from '../utils'
import { GET_CODE_HASH_ABI, GET_CODE_HASH_BYTECODE } from '../abis'
import { ProviderService } from '../provider'
import { ReputationManager } from '../reputation'
import { parseScannerResult } from './parseScannerResult'
import { Logger } from '../logger'
import { fullSimulateValidation, partialSimulateValidation } from '../entrypoint'

export class ValidationService {
  private readonly providerService: ProviderService
  private readonly reputationManager: ReputationManager
  private readonly entryPointContract: ethers.Contract
  private readonly isUnsafeMode: boolean
  private readonly HEX_REGEX = /^0x[a-fA-F\d]*$/i
  private readonly VALID_UNTIL_FUTURE_SECONDS = 30 // how much time into the future a UserOperation must be valid in order to be accepted

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

  /**
   * validate UserOperation.
   * should also handle unmodified memory (e.g. by referencing cached storage in the mempool
   * one item to check that was un-modified is the aggregator..
   * @param userOp
   * @param previousCodeHashes
   * @param checkStakes
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
      let tracerResult: BundlerCollectorReturn;
      [res, tracerResult] = await fullSimulateValidation(this.entryPointContract.address, this.providerService, userOp)
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
      res = await partialSimulateValidation(this.entryPointContract.address, this.providerService, userOp)
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

    Logger.debug('UserOp passed validation')
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