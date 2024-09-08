export type JsonRpcRequest = {
    jsonrpc: '2.0';
    method: string;
    params: any[];
    id: number | string;
}

export type JsonRpcSuccessResponse = {
    jsonrpc: '2.0';
    result: any;
    id: number | string;
}
  
export type JsonRpcErrorResponse = {
    jsonrpc: '2.0';
    error: {
      code: number;
      message: string;
      data?: any;
    };
    id: number | string;
}
  
export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;

export type RpcServer = {
    /**
     * Starts the server and performs a preflight check if provided.
     * 
     * @param _preflightCheck - A functions that is called before startup
     * @returns a promise that resolves to void
     */
    start: (_preflightCheck: () => Promise<void>) => Promise<void>;

    /**
     * Stops the server.
     * 
     * @returns A promise that resolves when the server has stopped.
     */
    stop: () => Promise<void>;
}

export type RpcHandler = {
    doHandleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse>;
}
  
// Handler function type
export type HandlerFunction = (params: any[]) => Promise<any> | any;

// Registry for handlers
export type HandlerRegistry = {
    [method: string]: HandlerFunction;
};