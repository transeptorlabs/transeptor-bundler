import { hexlify } from 'ethers/lib/utils.js'
import { 
    JsonRpcErrorResponse, 
    JsonRpcRequest, 
    JsonRpcSuccessResponse 
} from '../types'

export const requireCond = (cond: boolean, msg: string, code?: number, data: any = undefined): void =>{
    if (!cond) {
        throw new RpcError(msg, code, data)
    }
}

export class RpcError extends Error {
  // error codes from: https://eips.ethereum.org/EIPS/eip-1474
  constructor (msg: string, readonly code?: number, readonly data: any = undefined) {
      super(msg)
  }
}

/*
    * hexlify all members of object, recursively
*/
export const deepHexlify = (obj: any): any =>{
    if (typeof obj === 'function') {
        return undefined
    }

    if (obj == null || typeof obj === 'string' || typeof obj === 'boolean') {
        return obj
    } else if (obj._isBigNumber != null || typeof obj !== 'object') {
        return hexlify(obj).replace(/^0x0/, '0x')
    }
    
    if (Array.isArray(obj)) {
        return obj.map(member => deepHexlify(member))
    }
    
    return Object.keys(obj)
        .reduce((set, key) => (Object.assign(Object.assign({}, set), { [key]: deepHexlify(obj[key]) })), {})
}

/*
 * Construct JSON RPC success response
 */
export const createSuccessResponse = (
  id: number | string,
  result: any
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
export const createErrorResponse = (
    id: number | string,
    code: number,
    message: string,
    data: any = undefined
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

export const jsonRpcRequestValidator = (
    request: JsonRpcRequest, 
    supportedMethods: string[]
): boolean | JsonRpcErrorResponse => {
    if (!request.jsonrpc || request.jsonrpc !== '2.0') {
      return createErrorResponse(request.id, -32600, 'Invalid Request, jsonrpc must be exactly "2.0"')
    }

    if (!request.method || typeof request.method !== 'string') {
      return createErrorResponse(request.id, -32600, 'Invalid Request, method must be a string')
    }

    if (request.id === undefined) {
      return createErrorResponse(request.id, -32600, 'Invalid Request, id is missing')
    }

    const idType = typeof request.id
    if (idType !== 'number' && idType !== 'string') {
      return createErrorResponse(request.id, -32600, 'Invalid Request, id must be a number or string')
    }

    if (!request.params || !Array.isArray(request.params)) {
      return createErrorResponse(request.id, -32600, 'Invalid Request, params must be an array')
    }

    if (supportedMethods.indexOf(request.method.split('_')[0]) === -1) {
      return createErrorResponse(
        request.id,
        -32601,
        `Method ${request.method} is not supported`
      )
    }
    return true
}
