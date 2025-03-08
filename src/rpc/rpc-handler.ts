import {
  type MethodNames,
  type JsonRpcResponse,
  type RpcHandler,
  type ValidatedJsonRpcRequest,
  RpcError,
} from '../types/index.js'
import { createSuccessResponse } from '../utils/index.js'
import { Either, isEither } from '../monad/index.js'
import { Logger } from '../logger/index.js'

export const createRpcHandler = (): RpcHandler => {
  return {
    doHandleRequest: async <M extends MethodNames>(
      request: ValidatedJsonRpcRequest<M>,
    ): Promise<Either<RpcError, JsonRpcResponse>> => {
      Logger.debug(
        `---> Handling valid request for ${request.method} with requestId(${request.id})`,
      )
      const { params, id, handlerFunc } = request
      const handlerResult = await Promise.resolve(handlerFunc(params))

      return isEither(handlerResult)
        ? handlerResult.fold(
            (error: RpcError) => Either.Left(error),
            (response: any) => createSuccessResponse(id, response),
          )
        : createSuccessResponse(id, handlerResult)
    },
  }
}
