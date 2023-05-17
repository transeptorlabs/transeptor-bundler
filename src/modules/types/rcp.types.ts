export interface JsonRpcRequest {
    jsonrpc: '2.0';
    method: string;
    params: any[];
    id: number | string;
}