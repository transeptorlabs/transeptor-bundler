import { ContractFactory } from 'ethers'

import { Either } from '../monad/index.js'
import { ProviderService } from '../provider/index.js'
import {
  UserOperation,
  FullValidationResult,
  Erc7562Parser,
  ReferencedCodeHashes,
  ValidateUserOpResult,
  ValidationErrors,
  RpcError,
} from '../types/index.js'
import { requireCond } from '../utils/index.js'

export const checkValidationResult = (
  res: ValidateUserOpResult,
  userOp: UserOperation,
): Either<RpcError, ValidateUserOpResult> => {
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

export const fullValResultSafeParse = async (input: {
  ps: ProviderService
  result: FullValidationResult
  userOp: UserOperation
  codeHashesFactory: ContractFactory
  erc7562Parser: Erc7562Parser
  previousCodeHashes?: ReferencedCodeHashes
}): Promise<Either<RpcError, ValidateUserOpResult>> => {
  const {
    ps,
    result,
    userOp,
    codeHashesFactory,
    erc7562Parser,
    previousCodeHashes,
  } = input
  const [validationResult, erc7562Call] = result
  return erc7562Parser
    .parseTracerResult(userOp, erc7562Call, validationResult)
    .foldAsync(
      async (err) => Either.Left<RpcError, ValidateUserOpResult>(err),
      async (tracerRes) => {
        const { contractAddresses, storageMap } = tracerRes
        let codeHashes: ReferencedCodeHashes = {
          addresses: [],
          hash: '',
        }

        // if no previous contract hashes, then calculate hashes of contracts
        if (previousCodeHashes == null) {
          const { hash } = await ps.runContractScript(codeHashesFactory, [
            contractAddresses,
          ])

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

        return Either.Right({
          ...validationResult,
          storageMap,
          referencedContracts: codeHashes,
        })
      },
    )
}

/**
 * Require address and fields.
 *
 * @param userOp - The UserOperation to validate.
 * @param addrField - The address field.
 * @param mustFields - The fields that must be present.
 * @param optionalFields - The fields that are optional.
 */
export const requireAddressAndFields = (
  userOp: UserOperation,
  addrField: string,
  mustFields: string[],
  optionalFields: string[] = [],
): void => {
  const op = userOp as any
  const addr = op[addrField]
  if (addr == null) {
    const unexpected = Object.entries(op).filter(
      ([name, value]) =>
        value != null &&
        (mustFields.includes(name) || optionalFields.includes(name)),
    )
    requireCond(
      unexpected.length === 0,
      `no ${addrField} but got ${unexpected.join(',')}`,
      ValidationErrors.InvalidFields,
    )
  } else {
    requireCond(
      addr.match(/^0x[a-f0-9]{10,40}$/i),
      `invalid ${addrField}`,
      ValidationErrors.InvalidFields,
    )
    const missing = mustFields.filter((name) => op[name] == null)
    requireCond(
      missing.length === 0,
      `got ${addrField} but missing ${missing.join(',')}`,
      ValidationErrors.InvalidFields,
    )
  }
}
