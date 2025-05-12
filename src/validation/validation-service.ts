import { ContractFactory, ethers, resolveProperties } from 'ethers'

import { GET_CODE_HASH_ABI, GET_CODE_HASH_BYTECODE } from '../abis/index.js'
import { UserOperation } from '../types/index.js'
import {
  ReferencedCodeHashes,
  ValidateUserOpResult,
  ValidationErrors,
  RpcError,
  Simulator,
} from '../types/index.js'
import { requireCond, requireAddressAndFields } from '../utils/index.js'

import { ProviderService } from '../provider/index.js'
import { PreVerificationGasCalculator } from '../gas/index.js'
import { Either } from '../monad/index.js'
import {
  checkValidationResult,
  fullValResultSafeParse,
} from './validation.helper.js'

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

      let res = Either.Right<RpcError, ValidateUserOpResult>(undefined)

      // if we are in unsafe mode, we skip the full validation with custom tracer and only run the partial validation with no stake or opcode checks
      if (!isUnsafeMode) {
        const fullSimulateValidationResult = await sim.fullSimulateValidation(
          userOp,
          nativeTracerEnabled,
        )

        res = await fullSimulateValidationResult.foldAsync(
          async (error) => Either.Left<RpcError, ValidateUserOpResult>(error),
          async (result) =>
            fullValResultSafeParse(
              ps,
              sim,
              result,
              userOp,
              getCodeHashesFactory,
              previousCodeHashes,
            ),
        )
      } else {
        const partialSimulateValidationResult =
          await sim.partialSimulateValidation(userOp)

        res = partialSimulateValidationResult.fold(
          (error) => Either.Left<RpcError, ValidateUserOpResult>(error),
          (validationResult) =>
            Either.Right({
              ...validationResult,
              referencedContracts: {
                addresses: [],
                hash: '',
              },
              storageMap: {},
            }),
        )
      }

      return res.flatMap((res) => checkValidationResult(res, userOp))
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
