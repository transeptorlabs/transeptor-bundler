
import { BigNumber, ContractFactory, ethers } from 'ethers'

import { GET_CODE_HASH_ABI, GET_CODE_HASH_BYTECODE } from '../abis/index.js'
import {
  fullSimulateValidation,
  partialSimulateValidation,
} from '../entrypoint/index.js'
import { Logger } from '../logger/index.js'
import { ProviderService } from '../provider/index.js'
import {
  ReferencedCodeHashes,
  StorageMap,
  UserOperation,
  ValidateUserOpResult,
  ValidationErrors,
  ValidationResult,
  BundlerCollectorReturn,
} from '../types/index.js'
import {
  requireCond,
  requireAddressAndFields,
  calcPreVerificationGas,
} from '../utils/index.js'

import { tracerResultParser } from './parseScannerResult.js'


export class ValidationService {
  private readonly providerService: ProviderService
  private readonly entryPointContract: ethers.Contract
  private readonly isUnsafeMode: boolean
  private readonly HEX_REGEX = /^0x[a-fA-F\d]*$/i
  private readonly VALID_UNTIL_FUTURE_SECONDS = 30 // how much time into the future a UserOperation must be valid in order to be accepted

  constructor(
    providerService: ProviderService,
    entryPointContract: ethers.Contract,
    isUnsafeMode: boolean
  ) {
    this.providerService = providerService
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

      // [COD-010]
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

    // if we are in unsafe mode, we skip the full validation with custom tracer and only run the partial validation with no stake or opcode checks
    if (!this.isUnsafeMode) {
      let tracerResult: BundlerCollectorReturn;
      [res, tracerResult] = await fullSimulateValidation(this.entryPointContract.address, this.providerService, userOp).catch(e => {
        throw e
      })

      let contractAddresses: string[];
      [contractAddresses, storageMap] = tracerResultParser(
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

    requireCond(!res.returnInfo.sigFailed,
      'Invalid UserOp signature or paymaster signature',
      ValidationErrors.InvalidSignature)

    const now = Math.floor(Date.now() / 1000)
    requireCond(res.returnInfo.validAfter <= now,
      `time-range in the future time ${res.returnInfo.validAfter}, now=${now}`,
      ValidationErrors.NotInTimeRange)

    requireCond(res.returnInfo.validUntil == null || res.returnInfo.validUntil >= now,
      'already expired',
      ValidationErrors.NotInTimeRange)

    requireCond(res.returnInfo.validUntil == null || res.returnInfo.validUntil > now + this.VALID_UNTIL_FUTURE_SECONDS,
      'expires too soon',
      ValidationErrors.NotInTimeRange)

    requireCond(res.aggregatorInfo == null,
      'Currently not supporting aggregator',
      ValidationErrors.UnsupportedSignatureAggregator)

    const verificationCost = BigNumber.from(res.returnInfo.preOpGas).sub(userOp.preVerificationGas)
    const extraGas = BigNumber.from(userOp.verificationGasLimit).sub(verificationCost).toNumber()
    requireCond(extraGas >= 2000, `verificationGas should have extra 2000 gas. has only ${extraGas}`, ValidationErrors.SimulateValidation)

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
      `preVerificationGas ${BigNumber.from(userOp.preVerificationGas)} too low: expected at least ${calcPreVerificationGas1}`,
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