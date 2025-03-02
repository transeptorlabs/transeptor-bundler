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
