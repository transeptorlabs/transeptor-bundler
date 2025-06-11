import { toBeHex } from 'ethers'
import {
  JsonRpcRequest,
  JsonRpcSuccessResponse,
  RpcError,
} from '../types/index.js'
import { Either } from '../monad/index.js'

export const requireCond = (
  cond: boolean,
  msg: string,
  code: number,
  data: any = undefined,
): void => {
  if (!cond) {
    throw new RpcError(msg, code, data)
  }
}

/*
 * hexlify all members of object, recursively
 */
export const deepHexlify = (obj: any): any => {
  if (typeof obj === 'function') {
    return undefined
  }

  if (obj == null || typeof obj === 'string' || typeof obj === 'boolean') {
    return obj
  }

  if (typeof obj === 'bigint' || typeof obj === 'number') {
    return toBeHex(obj).replace(/^0x0/, '0x')
  }

  if (Array.isArray(obj)) {
    return obj.map((member) => deepHexlify(member))
  }

  return Object.keys(obj).reduce(
    (set, key) =>
      Object.assign(Object.assign({}, set), { [key]: deepHexlify(obj[key]) }),
    {},
  )
}

export const createSuccessResponse = (
  id: number | string,
  result: unknown,
): Either<RpcError, JsonRpcSuccessResponse> => {
  try {
    const hexlifyResult = deepHexlify(result)
    return Either.Right({
      jsonrpc: '2.0',
      id,
      result: hexlifyResult,
    })
  } catch (error) {
    return Either.Left(new RpcError('Error hexlifying result', -32603, error))
  }
}

export const isValidRpc = (
  request: JsonRpcRequest,
): Either<RpcError, JsonRpcRequest> => {
  return !request.jsonrpc || request.jsonrpc !== '2.0'
    ? Either.Left(
        new RpcError('Invalid Request, jsonrpc must be exactly "2.0"', -32600),
      )
    : Either.Right(request)
}

export const isValidMethodString = (
  request: JsonRpcRequest,
): Either<RpcError, JsonRpcRequest> => {
  return !request.method || typeof request.method !== 'string'
    ? Either.Left(
        new RpcError('Invalid Request, method must be a string', -32600),
      )
    : Either.Right(request)
}

export const requestIdNotMissing = (
  request: JsonRpcRequest,
): Either<RpcError, JsonRpcRequest> => {
  return request.id === undefined
    ? Either.Left(new RpcError('Invalid Request, id is missing', -32600))
    : Either.Right(request)
}

export const idTypeStringOrNumber = (
  request: JsonRpcRequest,
): Either<RpcError, JsonRpcRequest> => {
  const idType = typeof request.id
  return idType !== 'number' && idType !== 'string'
    ? Either.Left(
        new RpcError('Invalid Request, id must be a number or string', -32600),
      )
    : Either.Right(request)
}

export const paramsIsArray = (
  request: JsonRpcRequest,
): Either<RpcError, JsonRpcRequest> => {
  return !request.params || !Array.isArray(request.params)
    ? Either.Left(
        new RpcError('Invalid Request, params must be an array', -32600),
      )
    : Either.Right(request)
}

export const apiEnabled = (
  request: JsonRpcRequest,
  supportedApiPrefixes: string[],
): Either<RpcError, JsonRpcRequest> => {
  const nameSpacePrefix = request.method.split('_')[0]
  if (!nameSpacePrefix) {
    return Either.Left(
      new RpcError(
        `Method ${request.method} is not supported. Make sure the API is enabled in the config`,
        -32600,
      ),
    )
  }

  return supportedApiPrefixes.indexOf(nameSpacePrefix) === -1
    ? Either.Left(
        new RpcError(
          `Method ${request.method} is not supported. Make sure the API is enabled in the config`,
          -32600,
        ),
      )
    : Either.Right(request)
}
