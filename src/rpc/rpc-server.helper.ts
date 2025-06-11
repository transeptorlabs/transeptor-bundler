import cors from 'cors'
import express, { Request, Response } from 'express'
import helmet from 'helmet'

import { Logger } from '../logger/index.js'
import type {
  HandlerRegistry,
  JsonRpcResponse,
  RpcError,
  ValidatedJsonRpcRequest,
  MethodNames,
} from '../types/index.js'
import {
  headerChecks,
  parseValidRequest,
  validateRequest,
} from './rpc-middleware.js'
import { Either, isEither } from '../monad/index.js'
import { createSuccessResponse } from '../utils/index.js'

export const safeParseHandlerResult = (
  res: Response,
  requestId: string | number,
  result: Either<RpcError, JsonRpcResponse>,
) => {
  result.fold(
    (error: RpcError) => {
      Logger.error(
        { error: error.message },
        `<--- Error handling method requestId(${requestId})`,
      )
      res.json({
        jsonrpc: '2.0',
        id: requestId,
        error: {
          code: error.code,
          message: error.message,
          data: error.data,
        },
      })
    },
    (response: JsonRpcResponse) => {
      Logger.debug(`<--- Successfully handled method requestId(${requestId})`)
      return res.json(response)
    },
  )
}

export const safeParseUnknownError = (
  res: Response,
  requestId: string | number,
  unknownError: any,
) => {
  Logger.error(
    { error: unknownError.message },
    `<--- Unknown error handling method requestId(${requestId})`,
  )
  res.json({
    jsonrpc: '2.0',
    id: requestId,
    error: {
      code: typeof unknownError?.code === 'number' ? unknownError.code : -32000,
      message:
        typeof unknownError?.message === 'string'
          ? unknownError.message
          : 'Unknown error',
      data: unknownError.data,
    },
  })
}

export const doHandleRequest = async <M extends MethodNames>(
  request: ValidatedJsonRpcRequest<M>,
): Promise<Either<RpcError, JsonRpcResponse>> => {
  const { params, id, handlerFunc } = request
  const handlerResult = await Promise.resolve(handlerFunc(params))

  return isEither<RpcError>(handlerResult)
    ? handlerResult.fold(
        (error) => Either.Left(error),
        (response) => createSuccessResponse(id, response),
      )
    : createSuccessResponse(id, handlerResult)
}

export const createApp = (
  handlerRegistry: HandlerRegistry,
  supportedApiPrefixes: string[],
): express.Application => {
  const app = express()

  app.use(
    helmet({
      referrerPolicy: { policy: 'no-referrer-when-downgrade' },
    }),
  )
  app.use(cors())
  app.use(express.json())
  app.use(headerChecks)
  app.use(validateRequest(supportedApiPrefixes))
  app.use(parseValidRequest(handlerRegistry))

  app.post('/rpc', async (req: Request, res: Response) => {
    const request = req.parsedRpcRequest
    if (!request) {
      res.json({
        jsonrpc: '2.0',
        id: req.body.id,
        error: {
          code: -32600,
          message: 'Invalid Request',
          data: 'Invalid request',
        },
      })
      return
    }

    try {
      Logger.debug(
        `---> Handling valid request for ${request.method} with requestId(${request.id})`,
      )
      const result = await doHandleRequest(request)
      safeParseHandlerResult(res, request.id, result)
    } catch (unknownError: any) {
      safeParseUnknownError(res, request.id, unknownError)
    }
  })

  return app
}
