import {
  EstimateUserOpGasResult,
  RelayUserOpParam,
  ExecutionResult,
  ValidateUserOpResult,
  RpcError,
} from '../../types/index.js'
import { Either } from '../../monad/index.js'

export const extractVerificationGasLimit = (
  estimate: EstimateUserOpGasResult,
  executionResult: Either<RpcError, ExecutionResult>,
): Either<RpcError, EstimateUserOpGasResult> => {
  return executionResult.fold(
    (error: RpcError) => Either.Left(error),
    (res: ExecutionResult) => {
      const { preOpGas, validAfter, validUntil } = res
      return Either.Right<RpcError, EstimateUserOpGasResult>({
        ...estimate,
        validAfter,
        validUntil,
        verificationGasLimit: preOpGas,
      })
    },
  )
}

export const extractCallGasLimit = (
  estimate: EstimateUserOpGasResult,
  callGasResult: Either<RpcError, number>,
): Either<RpcError, EstimateUserOpGasResult> => {
  return callGasResult.fold(
    (error: RpcError) => Either.Left(error),
    (callGasLimit: number) => {
      return Either.Right<RpcError, EstimateUserOpGasResult>({
        ...estimate,
        callGasLimit,
      })
    },
  )
}

export const extractUseropVerificationResult = (
  relayUserOpParam: RelayUserOpParam,
  validationResult: Either<RpcError, ValidateUserOpResult>,
): Either<RpcError, RelayUserOpParam> => {
  return validationResult.fold(
    (error: RpcError) => Either.Left(error),
    (res: ValidateUserOpResult) => {
      return Either.Right<RpcError, RelayUserOpParam>({
        ...relayUserOpParam,
        prefund: res.returnInfo.prefund,
        referencedContracts: res.referencedContracts,
        senderInfo: res.senderInfo,
        paymasterInfo: res.paymasterInfo,
        factoryInfo: res.factoryInfo,
        aggregatorInfo: res.aggregatorInfo,
      })
    },
  )
}

export const sendUserOpToMempool = async (
  relayUserOpParam: RelayUserOpParam,
  addUserOp: (
    relayUserOpParam: RelayUserOpParam,
  ) => Promise<Either<RpcError, string>>,
): Promise<Either<RpcError, string>> => {
  const res = await addUserOp(relayUserOpParam)

  return res.fold(
    (error: RpcError) => Either.Left<RpcError, string>(error),
    (hash) => Either.Right<RpcError, string>(hash),
  )
}
