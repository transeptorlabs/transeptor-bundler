// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Request } from 'express'

import type { ValidatedJsonRpcRequest, JsonRpcRequest } from './rpc.types.js'

declare module 'express' {
  interface Request {
    validRpcRequest?: JsonRpcRequest
    parsedRpcRequest?: ValidatedJsonRpcRequest
  }
}
