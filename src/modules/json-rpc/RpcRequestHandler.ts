import { DebugMethodHandler } from "./DebugMethodHandler";
import { UserOpMethodHandler } from "./UserOpMethodHandler";

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  method: string;
  params?: any[];
  id?: number | string;
}

 interface JsonRpcSuccessResponse {
  jsonrpc: "2.0";
  result: any;
  id: number | string;
}

interface JsonRpcErrorResponse {
  jsonrpc: "2.0";
  error: {
    code: number;
    message: string;
    data?: any;
  };
  id: number | string;
}

type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;

export class RpcRequestHandler {

  constructor(
    readonly userOpMethodHandler: UserOpMethodHandler,
    readonly debugMethodHandler: DebugMethodHandler,
  ) {
  }

  public async doHandleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    if (!request.jsonrpc || request.jsonrpc !== "2.0") {
      return this.createErrorResponse(null, -32600, "Invalid Request")
    }
  
    const method = request.method
    const params = request.params
  
    switch (method) {
      case "eth_chainId":
        if (!params || params.length !== 2) {
          return this.createErrorResponse(request.id, -32602, "Invalid params")
        }
        return this.createSuccessResponse(request.id, params[0] + params[1])
      case "eth_supportedEntryPoints":
        return await this.createSuccessResponse(request.id, true)
      case "eth_sendUserOperation":
        const result = await this.userOpMethodHandler.sendUserOperation()
        return this.createSuccessResponse(request.id, result)
      case "eth_estimateUserOperationGas":
        return this.createSuccessResponse(request.id, true)
      case "eth_getUserOperationReceipt":
        return this.createSuccessResponse(request.id, true)
      case "eth_getUserOperationByHash":
        return this.createSuccessResponse(request.id, true)
      case "web3_clientVersion":
        return this.createSuccessResponse(request.id, true)
      default:
        return this.createErrorResponse(request.id, -32601, `Method ${method} is not supported`)
    }
  }

  private createSuccessResponse(
    id: number | string,
    result: any
  ): JsonRpcSuccessResponse {
    return {
      jsonrpc: "2.0",
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
      jsonrpc: "2.0",
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
}


