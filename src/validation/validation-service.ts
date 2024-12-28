import { ContractFactory, ethers, resolveProperties } from 'ethers'

import { GET_CODE_HASH_ABI, GET_CODE_HASH_BYTECODE } from '../abis/index.js'
import { Simulator } from '../sim/index.js'
import { Logger } from '../logger/index.js'
import { StorageMap, UserOperation } from '../types/index.js'
import {
  ReferencedCodeHashes,
  ValidateUserOpResult,
  ValidationErrors,
  ValidationResult,
} from './validation.types.js'
import {
  requireCond,
  requireAddressAndFields,
  RpcError,
} from '../utils/index.js'

import { ProviderService } from '../provider/index.js'
import { PreVerificationGasCalculator } from '../gas/index.js'
import { Either } from '../monad/index.js'

export type ValidationService = {
  /**
   * Validate a UserOperation.
   * should also handle unmodified memory (e.g. by referencing cached storage in the mempool
   * one item to check that was un-modified is the aggregator.
   *
   * @param userOp - The UserOperation to validate.
   * @param checkStakes - Whether to check the stakes of the user.
   * @param previousCodeHashes - The code hashes of the contracts that were previously validated.
   * @returns The result of the validation.
   */
  validateUserOp(
    userOp: UserOperation,
    checkStakes: boolean,
    previousCodeHashes?: ReferencedCodeHashes,
  ): Promise<Either<RpcError, ValidateUserOpResult>>

  /**
   * perform static checking on input parameters.
   *
   * @param userOp
   * @param entryPointInput
   * @param entryPointAddress
   * @param requireSignature
   * @param requireGasParams
   * @param preVerificationGasCheck
   */
  validateInputParameters(
    userOp: UserOperation,
    entryPointInput: string,
    entryPointAddress: string,
    requireSignature: boolean,
    requireGasParams: boolean,
    preVerificationGasCheck: boolean,
  ): Promise<Either<RpcError, UserOperation>>
}

const checkValidationResult = (
  res: ValidationResult,
  userOp: UserOperation,
): Either<RpcError, ValidationResult> => {
  const VALID_UNTIL_FUTURE_SECONDS = 30 // how much time into the future a UserOperation must be valid in order to be accepted

  if (res.returnInfo.sigFailed) {
    return Either.Left(
      new RpcError(
        'Invalid UserOp signature',
        ValidationErrors.InvalidSignature,
      ),
    )
  }

  const now = Math.floor(Date.now() / 1000)
  if (!(res.returnInfo.validAfter <= now)) {
    return Either.Left(
      new RpcError(
        `time-range in the future time ${res.returnInfo.validAfter}, now=${now}`,
        ValidationErrors.NotInTimeRange,
      ),
    )
  }

  if (
    !(res.returnInfo.validUntil === null || res.returnInfo.validUntil >= now)
  ) {
    return Either.Left(
      new RpcError('already expired', ValidationErrors.NotInTimeRange),
    )
  }

  if (
    !(
      res.returnInfo.validUntil == null ||
      res.returnInfo.validUntil > now + VALID_UNTIL_FUTURE_SECONDS
    )
  ) {
    Either.Left(
      new RpcError('expires too soon', ValidationErrors.NotInTimeRange),
    )
  }

  if (!(res.aggregatorInfo == null)) {
    Either.Left(
      new RpcError(
        'Currently not supporting aggregator',
        ValidationErrors.UnsupportedSignatureAggregator,
      ),
    )
  }

  const verificationCost =
    BigInt(res.returnInfo.preOpGas) - BigInt(userOp.preVerificationGas)
  const extraGas =
    BigInt(userOp.verificationGasLimit) - BigInt(verificationCost)
  if (!(extraGas >= 2000)) {
    Either.Left(
      new RpcError(
        `verificationGas should have extra 2000 gas. has only ${extraGas}`,
        ValidationErrors.SimulateValidation,
      ),
    )
  }

  return Either.Right(res)
}

export const createValidationService = (
  ps: ProviderService,
  sim: Simulator,
  pvgc: PreVerificationGasCalculator,
  isUnsafeMode: boolean,
  nativeTracerEnabled: boolean,
): ValidationService => {
  const HEX_REGEX = /^0x[a-fA-F\d]*$/i
  const getCodeHashesFactory = new ethers.ContractFactory(
    GET_CODE_HASH_ABI,
    GET_CODE_HASH_BYTECODE,
  ) as ContractFactory

  return {
    validateUserOp: async (
      userOp: UserOperation,
      checkStakes: boolean,
      previousCodeHashes?: ReferencedCodeHashes,
    ): Promise<Either<RpcError, ValidateUserOpResult>> => {
      if (
        previousCodeHashes != null &&
        previousCodeHashes.addresses.length > 0
      ) {
        const { hash: codeHashes } = await ps.runContractScript(
          getCodeHashesFactory,
          [previousCodeHashes.addresses],
        )

        // [COD-010]
        requireCond(
          codeHashes === previousCodeHashes.hash,
          'modified code after first validation',
          ValidationErrors.OpcodeValidation,
        )
      }

      let res = Either.Right<RpcError, ValidationResult>(undefined)
      let codeHashes: ReferencedCodeHashes = {
        addresses: [],
        hash: '',
      }
      let storageMap: StorageMap = {}

      // if we are in unsafe mode, we skip the full validation with custom tracer and only run the partial validation with no stake or opcode checks
      if (!isUnsafeMode) {
        const fullSimulateValidationResult = await sim.fullSimulateValidation(
          userOp,
          nativeTracerEnabled,
        )

        res = await fullSimulateValidationResult.foldAsync(
          async (error) => {
            return Either.Left<RpcError, ValidationResult>(error)
          },
          async (result) => {
            const [validationResult, tracerResults] = result

            let contractAddresses: string[]
            ;[contractAddresses, storageMap] = sim.tracerResultParser(
              userOp,
              tracerResults,
              validationResult,
            )

            // if no previous contract hashes, then calculate hashes of contracts
            if (previousCodeHashes == null) {
              const { hash } = await ps.runContractScript(
                getCodeHashesFactory,
                [contractAddresses],
              )

              codeHashes = {
                addresses: contractAddresses,
                hash: hash,
              }
            }

            if ((result as any) === '0x') {
              return Either.Left(
                new RpcError(
                  'simulateValidation reverted with no revert string!',
                  ValidationErrors.SimulateValidation,
                ),
              )
            }

            return Either.Right(validationResult)
          },
        )
      } else {
        res = await sim.partialSimulateValidation(userOp)
      }

      return res
        .flatMap((res) => checkValidationResult(res, userOp))
        .fold(
          (error) => Either.Left(error),
          (res) => {
            Logger.debug('UserOp passed validation')

            return Either.Right({
              ...res,
              referencedContracts: codeHashes,
              storageMap,
            })
          },
        )
    },

    validateInputParameters: async (
      userOp1: UserOperation,
      entryPointInput: string,
      entryPointAddress: string,
      requireSignature = true,
      requireGasParams = true,
      preVerificationGasCheck = true,
    ): Promise<Either<RpcError, UserOperation>> => {
      if (!entryPointInput) {
        return Either.Left(
          new RpcError('No entryPoint param', ValidationErrors.InvalidFields),
        )
      }
      if (
        entryPointInput?.toString().toLowerCase() !==
        entryPointAddress.toLowerCase()
      ) {
        return Either.Left(
          new RpcError(
            `The EntryPoint at "${entryPointInput}" is not supported. This bundler uses ${entryPointAddress}`,
            ValidationErrors.InvalidFields,
          ),
        )
      }
      // minimal sanity check: userOp exists, and all members are hex
      if (!userOp1) {
        return Either.Left(
          new RpcError(
            'No UserOperation param',
            ValidationErrors.InvalidFields,
          ),
        )
      }

      const userOp = await resolveProperties(userOp1)

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
          'maxPriorityFeePerGas',
        )
      }
      for (const key of fields) {
        if (!userOp[key]) {
          return Either.Left(
            new RpcError(
              `Missing userOp field: ${key}`,
              ValidationErrors.InvalidFields,
            ),
          )
        }

        const value: string = userOp[key].toString()
        if (!value.match(HEX_REGEX)) {
          return Either.Left(
            new RpcError(
              `Invalid hex value for property ${key} in UserOp`,
              ValidationErrors.InvalidFields,
            ),
          )
        }
      }

      requireAddressAndFields(
        userOp,
        'paymaster',
        ['paymasterPostOpGasLimit', 'paymasterVerificationGasLimit'],
        ['paymasterData'],
      )
      requireAddressAndFields(userOp, 'factory', ['factoryData'])

      if (preVerificationGasCheck) {
        const preVerificationGas = pvgc.calcPreVerificationGas(userOp)
        if (preVerificationGas != null) {
          const { isPreVerificationGasValid, minRequiredPreVerificationGas } =
            pvgc.validatePreVerificationGas(userOp)
          requireCond(
            isPreVerificationGasValid,
            `preVerificationGas too low: expected at least ${minRequiredPreVerificationGas}, provided only ${Number(BigInt(userOp.preVerificationGas))})`,
            ValidationErrors.InvalidFields,
          )
        }
      }

      return Either.Right(userOp)
    },
  }
}
