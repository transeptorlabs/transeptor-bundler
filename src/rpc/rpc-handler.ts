import type {
  HandlerRegistry,
  JsonRpcErrorResponse,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcSuccessResponse,
  RpcHandler,
} from './rpc.types.js'
import { deepHexlify, RpcError } from '../utils/index.js'
import { Either } from '../monad/index.js'

/*
 * Construct JSON RPC success response
 */
const createSuccessResponse = (
  id: number | string,
  result: any,
): JsonRpcSuccessResponse => {
  try {
    const hexlifyResult = deepHexlify(result)
    return {
      jsonrpc: '2.0',
      id,
      result: hexlifyResult,
    }
  } catch (error) {
    throw new RpcError('Error hexlifying result', -32603, error)
  }
}

/*
 * Construct JSON RPC error response
 */
const createErrorResponse = (
  id: number | string,
  code: number,
  message: string,
  data: any = undefined,
): JsonRpcErrorResponse => {
  const errorResponse: JsonRpcErrorResponse = {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
    },
  }

  if (data) {
    errorResponse.error.data = data
  }

  return errorResponse
}

const jsonRpcRequestValidator = (
  request: JsonRpcRequest,
  supportedApisPrefixes: string[],
): boolean | JsonRpcErrorResponse => {
  if (!request.jsonrpc || request.jsonrpc !== '2.0') {
    return createErrorResponse(
      request.id,
      -32600,
      'Invalid Request, jsonrpc must be exactly "2.0"',
    )
  }

  if (!request.method || typeof request.method !== 'string') {
    return createErrorResponse(
      request.id,
      -32600,
      'Invalid Request, method must be a string',
    )
  }

  if (request.id === undefined) {
    return createErrorResponse(
      request.id,
      -32600,
      'Invalid Request, id is missing',
    )
  }

  const idType = typeof request.id
  if (idType !== 'number' && idType !== 'string') {
    return createErrorResponse(
      request.id,
      -32600,
      'Invalid Request, id must be a number or string',
    )
  }

  if (!request.params || !Array.isArray(request.params)) {
    return createErrorResponse(
      request.id,
      -32600,
      'Invalid Request, params must be an array',
    )
  }

  if (supportedApisPrefixes.indexOf(request.method.split('_')[0]) === -1) {
    return createErrorResponse(
      request.id,
      -32601,
      `Method ${request.method} is not supported`,
    )
  }
  return true
}

export const createRpcHandler = (
  handlerRegistry: HandlerRegistry,
  supportedApiPrefixes: string[],
): RpcHandler => {
  return {
    doHandleRequest: async (
      request: JsonRpcRequest,
    ): Promise<Either<RpcError, JsonRpcResponse>> => {
      const isValidRpc: boolean | JsonRpcErrorResponse =
        jsonRpcRequestValidator(request, supportedApiPrefixes)
      if (typeof isValidRpc !== 'boolean') {
        return Either.Right(isValidRpc)
      }

      const handler = handlerRegistry[request.method]
      if (!handler) {
        return Either.Right(
          createErrorResponse(
            request.id,
            -32601,
            `Method ${request.method} is not supported`,
          ),
        )
      }

      // TODO: Validate params before calling handler

      // Await the handler function result to handle both sync and async handlers
      const handlerResult = await Promise.resolve(handler(request.params))
      return Either.Right(createSuccessResponse(request.id, handlerResult))
    },
  }
}
