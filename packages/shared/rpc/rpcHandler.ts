import { Logger } from '../logger/index.js'
import type {
  HandlerRegistry,
  JsonRpcErrorResponse,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcSuccessResponse,
  RpcHandler,
} from './rpc.types.js'
import { deepHexlify, RpcError } from '../utils/index.js'

/*
 * Construct JSON RPC success response
 */
const createSuccessResponse = (
  id: number | string,
  result: any,
): JsonRpcSuccessResponse => {
  const hexlifyResult = deepHexlify(result)
  return {
    jsonrpc: '2.0',
    id,
    result: hexlifyResult,
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
  handlers: HandlerRegistry,
  supportedApiPrefixes: string[],
): RpcHandler => {
  return {
    doHandleRequest: async (
      request: JsonRpcRequest,
    ): Promise<JsonRpcResponse> => {
      try {
        const isValidRpc: boolean | JsonRpcErrorResponse =
          jsonRpcRequestValidator(request, supportedApiPrefixes)
        if (typeof isValidRpc !== 'boolean') {
          Logger.debug(
            `-- Incoming request for ${request.method} with requestId(${request.id}) is not valid.`,
          )
          return isValidRpc
        }

        Logger.debug(
          `--> Handling valid request for ${request.method} with requestId(${request.id})`,
        )
        const handler = handlers[request.method]
        if (!handler) {
          throw new RpcError(
            `Method ${request.method} is not supported`,
            -32601,
          )
        }

        // Await the handler function result to handle both sync and async handlers
        const result = await Promise.resolve(handler(request.params))

        Logger.debug(
          `<-- Sending success response for requestId(${request.id})`,
        )
        return createSuccessResponse(request.id, result)
      } catch (error: any) {
        Logger.error(
          { error: error.message },
          `Error handling method requestId(${request.id})`,
        )

        Logger.debug(`<-- Sending error response for requestId(${request.id})`)
        return createErrorResponse(
          request.id,
          error.code ? error.code : -32000,
          error.message,
          error.data ? error.data : undefined,
        )
      }
    },
  }
}
