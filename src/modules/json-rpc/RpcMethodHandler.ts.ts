import { DebugAPI } from './services/Debug'
import { EthAPI } from './services/Eth'

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params: any[];
  id: number | string;
}

 interface JsonRpcSuccessResponse {
  jsonrpc: '2.0';
  result: any;
  id: number | string;
}

interface JsonRpcErrorResponse {
  jsonrpc: '2.0';
  error: {
    code: number;
    message: string;
    data?: any;
  };
  id: number | string;
}

type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;

export class RpcMethodHandler {
  private readonly eth: EthAPI = new EthAPI()
  private readonly debug: DebugAPI = new DebugAPI()
  
  constructor() {
    // 
  }

  private createSuccessResponse(
    id: number | string,
    result: any
  ): JsonRpcSuccessResponse {
    return {
      jsonrpc: '2.0',
      id,
      result,
    }
  }
  
  private createErrorResponse(
    id: number | string,
    code: number,
    message: string,
    data?: any
  ): JsonRpcErrorResponse {
    const errorResponse: JsonRpcErrorResponse = {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
      },
    }
  
    if (data) {
      errorResponse.error.data = data
    }
  
    return errorResponse
  }

  public async doHandleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    try {
      if (!request.jsonrpc || request.jsonrpc !== '2.0') {
        return this.createErrorResponse(request.id, -32600, 'Invalid Request')
      }

      if (!request.method || typeof request.method !== 'string') {
        return this.createErrorResponse(request.id, -32600, 'Invalid Request')
      }

      if (!request.id || typeof request.id !== 'number' && typeof request.id !== 'string') {
        return this.createErrorResponse(request.id, -32600, 'Invalid Request')
      }

      if (!request.params || !Array.isArray(request.params)) {
        return this.createErrorResponse(request.id, -32600, 'Invalid Request')
      }
    
      const method = request.method
      const params = request.params
      let result: any
      let isErrorResult: {code: number, message: string} = {code: 0, message: ''}

      switch (method) {
        case 'eth_chainId':
          if (!params || params.length !== 2) {
            isErrorResult = {
              code: -32602,
              message: 'Invalid params',
            }
            break
          }
          result = true
          break
        case 'eth_supportedEntryPoints':
          result = true
          break
        case 'eth_sendUserOperation':
          result = await this.eth.sendUserOperation(params[0], params[1])
          break
        case 'eth_estimateUserOperationGas':
          result = true
          break
        case 'eth_getUserOperationReceipt':
          result = true
          break
        case 'eth_getUserOperationByHash':
          result = true
          break
        case 'debug_bundler_dumpMempool':
          result = this.debug.dumpMempool()
          break
        case 'debug_bundler_clearState':
          await this.debug.clearState()
          result = 'ok'
          break
        default:
          isErrorResult = {
            code: -32601,
            message: `Method ${method} is not supported`,
          }
          break
      }

      if (isErrorResult.code !== 0) {
        return this.createErrorResponse(request.id, isErrorResult.code, isErrorResult.message)
      }

      return this.createSuccessResponse(request.id, result)
    } catch (error: any) {
      return this.createErrorResponse(request.id, -32000, error.message)
    }
  }
}