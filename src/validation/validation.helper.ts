import { ContractFactory } from 'ethers'

import {
  UserOperation,
  FullValidationResult,
  EIP7702Authorization,
} from '../types/index.js'
import {
  ReferencedCodeHashes,
  ValidateUserOpResult,
  ValidationErrors,
  RpcError,
  Simulator,
} from '../types/index.js'

import { ProviderService } from '../provider/index.js'
import { Either } from '../monad/index.js'
import {
  EIP_7702_MARKER_CODE,
  getEip7702AuthorizationSigner,
} from '../utils/index.js'
import { Logger } from '../logger/index.js'

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

export const fullValResultSafeParse = async (
  ps: ProviderService,
  sim: Simulator,
  result: FullValidationResult,
  userOp: UserOperation,
  codeHashesFactory: ContractFactory,
  previousCodeHashes?: ReferencedCodeHashes,
) => {
  const [validationResult, tracerResults] = result
  const res = sim.tracerResultParser(userOp, tracerResults, validationResult)

  return res.foldAsync(
    async (err) => Either.Left<RpcError, ValidateUserOpResult>(err),
    async (tracerRes) => {
      const [contractAddresses, storageMap] = tracerRes
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

export const getAuthorizationsStateOverride = async (
  authorizations: EIP7702Authorization[] = [],
  ps: ProviderService,
): Promise<{ [address: string]: { code: string } }> => {
  const stateOverride: { [address: string]: { code: string } } = {}
  for (const authorization of authorizations) {
    const authSigner = getEip7702AuthorizationSigner(authorization)
    const nonce = await ps.getTransactionCount(authSigner)
    const authNonce: any = authorization.nonce
    if (nonce !== Number(BigInt(authNonce.replace(/0x$/, '0x0')))) {
      continue
    }
    const currentDelegateeCode = await ps.getCode(authSigner)
    const newDelegateeCode =
      EIP_7702_MARKER_CODE + authorization.address.slice(2)
    const noCurrentDelegation = currentDelegateeCode.length <= 2
    // TODO: do not send such authorizations to 'handleOps' as it is a waste of gas
    const changeDelegation = newDelegateeCode !== currentDelegateeCode
    if (noCurrentDelegation || changeDelegation) {
      Logger.debug(
        {
          address: authSigner,
          code: newDelegateeCode,
        },
        'Adding 7702 state override:',
      )
      stateOverride[authSigner] = {
        code: newDelegateeCode,
      }
    }
  }
  return stateOverride
}
