/* eslint-disable complexity */
import { ContractFactory, ethers, resolveProperties } from 'ethers'

import { GET_CODE_HASH_ABI, GET_CODE_HASH_BYTECODE } from '../abis/index.js'
import { EIP_7702_MARKER_INIT_CODE } from '../constants/index.js'
import { PreVerificationGasCalculator } from '../gas/index.js'
import { Either } from '../monad/index.js'
import { ProviderService } from '../provider/index.js'
import {
  Erc7562Parser,
  TranseptorLogger,
  UserOperation,
  ReferencedCodeHashes,
  ValidateUserOpResult,
  ValidationErrors,
  RpcError,
  Simulator,
} from '../types/index.js'
import {
  requireCond,
  requireAddressAndFields,
  getAuthorizationList,
  getEip7702AuthorizationSigner,
  withReadonly,
} from '../utils/index.js'

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
   * @param params
   * @param requireSignature
   * @param requireGasParams
   * @param preVerificationGasCheck
   */
  validateInputParameters(
    params: ValidateInputParams,
    requireSignature: boolean,
    requireGasParams: boolean,
    preVerificationGasCheck: boolean,
  ): Promise<Either<RpcError, UserOperation>>
}

export type ValidationServiceConfig = {
  logger: TranseptorLogger
  providerService: ProviderService
  sim: Simulator
  erc7562Parser: Erc7562Parser
  preVerificationGasCalculator: PreVerificationGasCalculator
  isUnsafeMode: boolean
}

export type ValidateInputParams = {
  userOpInput: UserOperation
  entryPointInput: string
  entryPointAddress: string
  eip7702Support: boolean
}

/**
 * Creates an instance of the ValidationService module.
 *
 * @param config - The configuration object for the ValidationService instance.
 * @returns An instance of the ValidationService module.
 */
function _createValidationService(
  config: Readonly<ValidationServiceConfig>,
): ValidationService {
  const {
    providerService: ps,
    sim,
    preVerificationGasCalculator: pvgc,
    isUnsafeMode,
    erc7562Parser,
    logger,
  } = config
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
      logger.debug('Validating UserOperation')
      let res = Either.Right<RpcError, ValidateUserOpResult>(undefined)

      // [COD-010]
      if (
        previousCodeHashes != null &&
        previousCodeHashes.addresses.length > 0
      ) {
        const { hash: codeHashes } = await ps.runContractScript(
          getCodeHashesFactory,
          [previousCodeHashes.addresses],
        )

        requireCond(
          codeHashes === previousCodeHashes.hash,
          'modified code after first validation',
          ValidationErrors.OpcodeValidation,
        )
      }

      // prepare 7702 state override
      const authorizationList = getAuthorizationList(userOp)
      if (authorizationList.length > 0) {
        logger.debug('Validating EIP-7702 authorization list')
        const chainId = await ps.getNetwork().then((n) => n.chainId)

        // list is required to be of size=1. for completeness, we still scan it as a list.
        for (const authorization of authorizationList) {
          const authChainId = BigInt(authorization.chainId)
          requireCond(
            authChainId === BigInt(0) || authChainId === chainId,
            'Invalid chainId in authorization',
            ValidationErrors.InvalidFields,
          )
          requireCond(
            getEip7702AuthorizationSigner(
              authorizationList[0],
            ).toLowerCase() === userOp.sender.toLowerCase(),
            'Authorization signer is not sender',
            ValidationErrors.InvalidFields,
          )
        }
      }

      // if we are in unsafe mode, we skip the full validation with custom tracer and only run the partial validation with no stake or opcode checks
      if (!isUnsafeMode) {
        const fullSimulateValidationResult = await sim.fullSimulateValidation(
          userOp,
          {},
        )

        res = await fullSimulateValidationResult.foldAsync(
          async (error) => Either.Left<RpcError, ValidateUserOpResult>(error),
          async (result) =>
            fullValResultSafeParse({
              ps,
              result,
              userOp,
              codeHashesFactory: getCodeHashesFactory,
              previousCodeHashes,
              erc7562Parser,
            }),
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

      logger.debug(
        { status: res.isRight() ? 'valid' : 'invalid' },
        'UserOperation validation result',
      )
      return res.flatMap((res) => checkValidationResult(res, userOp))
    },

    validateInputParameters: async (
      params: ValidateInputParams,
      requireSignature = true,
      requireGasParams = true,
      preVerificationGasCheck = true,
    ): Promise<Either<RpcError, UserOperation>> => {
      logger.debug('Validating input parameters for UserOperation')
      const {
        entryPointInput,
        entryPointAddress,
        eip7702Support,
        userOpInput,
      } = params

      if (!entryPointInput) {
        return Either.Left(
          new RpcError('No entryPoint param', ValidationErrors.InvalidFields),
        )
      }

      if (!eip7702Support && userOpInput.eip7702Auth != null) {
        Either.Left(
          new RpcError(
            'EIP-7702 tuples are not supported',
            ValidationErrors.InvalidFields,
          ),
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
      if (!userOpInput) {
        return Either.Left(
          new RpcError(
            'No UserOperation param',
            ValidationErrors.InvalidFields,
          ),
        )
      }

      const userOp = await resolveProperties(userOpInput)

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
      if (userOp.factory !== EIP_7702_MARKER_INIT_CODE) {
        requireAddressAndFields(userOp, 'factory', ['factoryData'])
      }

      if (preVerificationGasCheck) {
        const preVerificationGas = pvgc.estimatePreVerificationGas(userOp, {})
        if (preVerificationGas != null) {
          const { isPreVerificationGasValid, minRequiredPreVerificationGas } =
            pvgc.validatePreVerificationGas(userOp, {})
          requireCond(
            isPreVerificationGasValid,
            `preVerificationGas too low: expected at least ${minRequiredPreVerificationGas}, provided only ${Number(BigInt(userOp.preVerificationGas))})`,
            ValidationErrors.InvalidFields,
          )
        }
      }

      logger.debug('Input parameters for UserOperation are valid')
      return Either.Right(userOp)
    },
  }
}

export const createValidationService = withReadonly<
  ValidationServiceConfig,
  ValidationService
>(_createValidationService)
