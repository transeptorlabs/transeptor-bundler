// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Request } from 'express'

declare module 'express' {
  interface Request {
    validRpcRequest?: JsonRpcRequest
    parsedRpcRequest?: ValidatedJsonRpcRequest
  }
}
