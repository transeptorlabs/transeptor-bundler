import { Either } from '../monad/index.js'
import {
  DebugAPIMethodMapping,
  EthAPIMethodMapping,
  Web3APIMethodMapping,
} from './api.types.js'
import { RpcError } from './error.types.js'

// Define the mapping of method names to their params and return types
export type MethodMapping = Web3APIMethodMapping &
  EthAPIMethodMapping &
  DebugAPIMethodMapping

// Infer method names
export type MethodNames = keyof MethodMapping

// Generic handler function type
export type HandlerFunction<M extends MethodNames> = (
  params: MethodMapping[M]['params'],
) => Promise<MethodMapping[M]['return']> | MethodMapping[M]['return']

export type HandlerValidationFunction = (params: unknown[]) => boolean

export type HandlerRegistry = {
  [M in MethodNames]: {
    handlerFunc: HandlerFunction<M>
    validationFunc: (params: unknown[]) => boolean
  }
}

export type ValidateJsonRpcRequest<M extends MethodNames> = {
  id: number | string
  method: M
  params: MethodMapping[M]['params']
  handlerFunc: HandlerFunction<M>
  validationFunc: HandlerValidationFunction
}

export type JsonRpcRequest = {
  jsonrpc: '2.0'
  method: string
  params: any[]
  id: number | string
}

export type JsonRpcSuccessResponse = {
  jsonrpc: '2.0'
  result: any
  id: number | string
}

export type JsonRpcErrorResponse = {
  jsonrpc: '2.0'
  error: {
    code: number
    message: string
    data?: any
  }
  id: number | string
}

export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse

export type RpcServer = {
  /**
   * Starts the server and performs a preflight check if provided.
   *
   * @param _preflightCheck - A functions that is called before startup
   * @returns a promise that resolves to void
   */
  start: (_preflightCheck: () => Promise<void>) => Promise<void>

  /**
   * Stops the server.
   *
   * @returns A promise that resolves when the server has stopped.
   */
  stop: () => Promise<void>
}

export type RpcHandler = {
  doHandleRequest(
    request: JsonRpcRequest,
  ): Promise<Either<RpcError, JsonRpcResponse>>
}
