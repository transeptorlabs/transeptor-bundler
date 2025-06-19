import { Either } from '../monad/index.js'

import { MethodMapping, MethodNames } from './api.types.js'
import { RpcError } from './error.types.js'

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

/**
 * RPC server interface for starting and stopping the server.
 * This interface is used to define the methods that the server should implement.
 * The server is responsible for handling incoming JSON-RPC requests and
 * sending JSON-RPC responses.
 *
 * - The server should also be able to start and stop itself.
 * - The start method should take a preflight check function as an argument,
 * which is called before the server starts. This function can be used to
 * perform any necessary checks before the server starts defined by the caller.
 */
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

/**
 * The ValidatedJsonRpcRequest type defines the structure of a validated JSON-RPC
 * request for a specific method. It includes the method name, parameters, handler function, and validation function.
 */
export type ValidatedJsonRpcRequest<M extends MethodNames> = {
  id: number | string
  method: M

  /**
   * The parameters for the method. This is an array of parameters that are passed to the method.
   */
  params: MethodMapping[M]['params']

  /**
   * The handler function for the method. This function is called to process the request.
   */
  handlerFunc: HandlerFunction<M>
  /**
   * The validation function for the method. This function is called to validate the parameters of the request.
   */
  validationFunc: HandlerValidationFunction
}

/**
 * Generic handler function type for all methods.
 */
export type HandlerFunction<M extends MethodNames> = (
  params: MethodMapping[M]['params'],
) => MethodMapping[M]['return']

/**
 * Generic handler validation function type for all methods.
 */
export type HandlerValidationFunction = (params: unknown[]) => boolean

/**
 * Generic handler registry type for the PaymentAPI methods.
 * This is used to register the handler functions and their validation functions.
 * The handler functions are used to process the requests, and the validation
 * functions are used to validate the parameters of the requests.
 */
export type HandlerRegistry = {
  [M in MethodNames]: {
    handlerFunc: HandlerFunction<M>
    validationFunc: HandlerValidationFunction
  }
}

/**
 * The RpcHandler interface defines a method for handling JSON-RPC requests.
 * It takes a JsonRpcRequest object as input and returns a Promise that resolves
 * to either an RpcError or a JsonRpcResponse.
 */
export type RpcHandler = {
  doHandleRequest<M extends MethodNames>(
    request: ValidatedJsonRpcRequest<M>,
  ): Promise<Either<RpcError, JsonRpcResponse>>
}
