import type {
  JsonRpcResponse,
  RpcError,
  ValidatedJsonRpcRequest,
  MethodNames,
} from '../types/index.js'

import { Either, isEither } from '../monad/index.js'
import { createSuccessResponse } from '../utils/index.js'

export const doHandleRequest = async <M extends MethodNames>(
  request: ValidatedJsonRpcRequest<M>,
): Promise<Either<RpcError, JsonRpcResponse>> => {
  const { params, id, handlerFunc } = request
  const handlerResult = await Promise.resolve(handlerFunc(params))

  return isEither<RpcError>(handlerResult)
    ? handlerResult.fold(
        (error) => Either.Left(error),
        (response) => createSuccessResponse(id, response),
      )
    : createSuccessResponse(id, handlerResult)
}
