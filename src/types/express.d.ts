// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Request } from 'express'
import type { ValidatedJsonRpcRequest } from './rpc.types.js'
import type { JsonRpcRequest } from './rpc.types.js'

declare module 'express' {
  interface Request {
    validRpcRequest?: JsonRpcRequest
    parsedRpcRequest?: ValidatedJsonRpcRequest
  }
}
