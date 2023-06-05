export interface JsonRpcRequest {
    jsonrpc: '2.0';
    method: string;
    params: any[];
    id: number | string;
}

export interface JsonRpcSuccessResponse {
    jsonrpc: '2.0';
    result: any;
    id: number | string;
}
  
export interface JsonRpcErrorResponse {
    jsonrpc: '2.0';
    error: {
      code: number;
      message: string;
      data?: any;
    };
    id: number | string;
}
  
export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;