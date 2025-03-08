import {
  HandlerRegistry,
  JsonRpcRequest,
  MethodMapping,
  MethodNames,
  RpcError,
  ValidatedJsonRpcRequest,
} from '../types/index.js'
import { Logger } from '../logger/index.js'
import { Request, Response } from 'express'
import { Either } from '../monad/either.js'
import {
  apiEnabled,
  idTypeStringOrNumber,
  isValidMethodString,
  isValidRpc,
  paramsIsArray,
  requestIdNotMissing,
} from '../utils/index.js'

/**
 * Transform the request object to validate request format
 *
 * @param method - Method name
 * @param request - JSON RPC request object
 * @param handlerRegistry - HandlerRegistry object
 * @returns The transformed request object with the handler function and validation function
 */
const transformRequest = <M extends MethodNames>(
  method: M,
  request: JsonRpcRequest,
  handlerRegistry: HandlerRegistry,
): Either<RpcError, ValidatedJsonRpcRequest<M>> => {
  if (method !== request.method) {
    return Either.Left<RpcError, ValidatedJsonRpcRequest<M>>(
      new RpcError(
        `Method ${request.method} is not supported for ${method}`,
        -32600,
      ),
    )
  }

  const params = request.params as MethodMapping[M]['params']
  const handler = handlerRegistry[method]
  return !handler
    ? Either.Left<RpcError, ValidatedJsonRpcRequest<M>>(
        new RpcError(`Method ${request.method} is not supported`, -32600),
      )
    : Either.Right<RpcError, ValidatedJsonRpcRequest<M>>({
        method,
        params,
        id: request.id,
        handlerFunc: handler.handlerFunc,
        validationFunc: handler.validationFunc,
      })
}

/**
 * Validate the parameters of the request object
 *
 * @param validReq - The transformed request object
 * @returns The transformed request object if the parameters are valid
 */
const isParamsValid = (
  validReq: ValidatedJsonRpcRequest<MethodNames>,
): Either<RpcError, ValidatedJsonRpcRequest<MethodNames>> => {
  return !validReq.validationFunc(validReq.params)
    ? Either.Left(
        new RpcError(`Invalid params for method ${validReq.method}`, -32602),
      )
    : Either.Right(validReq)
}

/**
 * Middleware to check the request headers
 *
 * @param req - The request object
 * @param res - The response object
 * @param next - The next middleware function
 * @returns void
 */
export const headerChecks = (req: Request, res: Response, next: () => void) => {
  if (req.headers['content-type'] !== 'application/json') {
    Logger.error(
      `Invalid content type: ${req.headers['content-type']}, expected application/json`,
    )
    return res.status(415).json({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32600,
        message: 'Invalid Request',
        data: 'Invalid content type',
      },
    })
  }

  next()
}

/**
 * Middleware to validate the request object
 *
 * @param supportedApiPrefixes - The supported API prefixes
 * @returns The middleware function
 */
export const validateRequest = (supportedApiPrefixes: string[]) => {
  return (req: Request, res: Response, next: () => void) => {
    const rpcValidation = Either.Right<RpcError, JsonRpcRequest>(
      req.body as JsonRpcRequest,
    )
      .flatMap(isValidRpc)
      .flatMap(isValidMethodString)
      .flatMap(requestIdNotMissing)
      .flatMap(idTypeStringOrNumber)
      .flatMap(paramsIsArray)
      .flatMap((req) => apiEnabled(req, supportedApiPrefixes))

    rpcValidation.fold(
      (error: RpcError) => {
        Logger.error(
          `Failed to validate request: ${error.message}, code: ${error.code}`,
        )
        res.status(400).json({
          jsonrpc: '2.0',
          id: req.body.id,
          error: {
            code: error.code,
            message: error.message,
            data: error.data,
          },
        })
      },
      (validReq) => (req.validRpcRequest = validReq),
    )
    next()
  }
}

/**
 * Middleware to parse the request object
 *
 * @param handlerRegistry - The handler registry
 * @returns The middleware function
 */
export const parseValidRequest = (handlerRegistry: HandlerRegistry) => {
  return (req: Request, res: Response, next: () => void) => {
    const rpcParsed = Either.Right<RpcError, JsonRpcRequest>(
      req.validRpcRequest,
    )
      .flatMap((req) =>
        transformRequest(req.method as MethodNames, req, handlerRegistry),
      )
      .flatMap(isParamsValid)

    rpcParsed.fold(
      (error: RpcError) => {
        Logger.error(
          `Failed to parse request: ${error.message} for requestId(${req.body.id})`,
        )
        res.status(400).json({
          jsonrpc: '2.0',
          id: req.body.id,
          error: {
            code: error.code,
            message: error.message,
            data: error.data,
          },
        })
      },
      (parsedReq) => (req.parsedRpcRequest = parsedReq),
    )
    next()
  }
}
