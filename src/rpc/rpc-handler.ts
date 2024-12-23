import {
  type MethodNames,
  type HandlerRegistry,
  type JsonRpcRequest,
  type JsonRpcResponse,
  type JsonRpcSuccessResponse,
  type RpcHandler,
  type MethodMapping,
  ValidateJsonRpcRequest,
} from './rpc.types.js'
import { deepHexlify, RpcError } from '../utils/index.js'
import { Either, isEither } from '../monad/index.js'

/*
 * Construct JSON RPC success response
 */
const createSuccessResponse = (
  id: number | string,
  result: any,
): Either<RpcError, JsonRpcSuccessResponse> => {
  try {
    const hexlifyResult = deepHexlify(result)
    return Either.Right({
      jsonrpc: '2.0',
      id,
      result: hexlifyResult,
    })
  } catch (error) {
    Either.Left(new RpcError('Error hexlifying result', -32603, error))
  }
}

const isValidRpc = (
  request: JsonRpcRequest,
): Either<RpcError, JsonRpcRequest> => {
  return !request.jsonrpc || request.jsonrpc !== '2.0'
    ? Either.Left(
        new RpcError('Invalid Request, jsonrpc must be exactly "2.0"', -32600),
      )
    : Either.Right(request)
}

const isValidMethodString = (
  request: JsonRpcRequest,
): Either<RpcError, JsonRpcRequest> => {
  return !request.method || typeof request.method !== 'string'
    ? Either.Left(
        new RpcError('Invalid Request, method must be a string', -32600),
      )
    : Either.Right(request)
}

const requestIdNotMissing = (
  request: JsonRpcRequest,
): Either<RpcError, JsonRpcRequest> => {
  return request.id === undefined
    ? Either.Left(new RpcError('Invalid Request, id is missing', -32600))
    : Either.Right(request)
}

const idTypeStringOrNumber = (
  request: JsonRpcRequest,
): Either<RpcError, JsonRpcRequest> => {
  const idType = typeof request.id
  return idType !== 'number' && idType !== 'string'
    ? Either.Left(
        new RpcError('Invalid Request, id must be a number or string', -32600),
      )
    : Either.Right(request)
}

const paramsIsArray = (
  request: JsonRpcRequest,
): Either<RpcError, JsonRpcRequest> => {
  return !request.params || !Array.isArray(request.params)
    ? Either.Left(
        new RpcError('Invalid Request, params must be an array', -32600),
      )
    : Either.Right(request)
}

const apiEnabled = (
  request: JsonRpcRequest,
  supportedApiPrefixes: string[],
): Either<RpcError, JsonRpcRequest> => {
  return supportedApiPrefixes.indexOf(request.method.split('_')[0]) === -1
    ? Either.Left(
        new RpcError(
          `Method ${request.method} is not supported. Make sure the API is enabled in the config`,
          -32600,
        ),
      )
    : Either.Right(request)
}

/**
 * Transform the request object to validate request format
 *
 * @param request - JSON RPC request object
 * @param handlerRegistry - HandlerRegistry object
 * @returns The transformed request object with the handler function and validation function
 */
const transformRequest = <M extends MethodNames>(
  request: JsonRpcRequest,
  handlerRegistry: HandlerRegistry,
): Either<RpcError, ValidateJsonRpcRequest<M>> => {
  const method = request.method as M
  const params = request.params as MethodMapping[M]['params']
  const handler = handlerRegistry[method]
  return !handler
    ? Either.Left(
        new RpcError(`Method ${request.method} is not supported`, -32600),
      )
    : Either.Right({ method, params, id: request.id, handler })
}

/**
 * Validate the parameters of the request object
 *
 * @param validReq - The transformed request object
 * @returns The transformed request object if the parameters are valid
 */
const isParmsValid = <M extends MethodNames>(
  validReq: ValidateJsonRpcRequest<M>,
): Either<RpcError, ValidateJsonRpcRequest<M>> => {
  return !validReq.handler.validationFunc(validReq.params)
    ? Either.Left(
        new RpcError(`Invalid params for method ${validReq.method}`, -32602),
      )
    : Either.Right(validReq)
}

export const createRpcHandler = (
  handlerRegistry: HandlerRegistry,
  supportedApiPrefixes: string[],
): RpcHandler => {
  return {
    doHandleRequest: async (
      request: JsonRpcRequest,
    ): Promise<Either<RpcError, JsonRpcResponse>> => {
      const rpcValidation = Either.Right<RpcError, JsonRpcRequest>(request)
        .flatMap(isValidRpc)
        .flatMap(isValidMethodString)
        .flatMap(requestIdNotMissing)
        .flatMap(idTypeStringOrNumber)
        .flatMap(paramsIsArray)
        .flatMap((req) => apiEnabled(req, supportedApiPrefixes))
        .flatMap((req) => transformRequest(req, handlerRegistry))
        .flatMap(isParmsValid)

      return rpcValidation.foldAsync(
        async (error: RpcError) =>
          Either.Left<RpcError, JsonRpcResponse>(error),
        async (validateReq) => {
          const { params, id, handler } = validateReq
          const handlerResult = await handler.handlerFunc(params)
          return isEither(handlerResult)
            ? handlerResult.fold(
                (error: RpcError) => Either.Left(error),
                (response: any) => createSuccessResponse(id, response),
              )
            : createSuccessResponse(id, handlerResult)
        },
      )
    },
  }
}
