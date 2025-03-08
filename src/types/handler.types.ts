import { Either } from '../monad/index.js'

import { RpcError } from './error.types.js'
import { MethodMapping, MethodNames } from './api.types.js'
import { JsonRpcResponse } from './rpc.types.js'

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
