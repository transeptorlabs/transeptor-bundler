export interface JsonRpcRequest {
  jsonrpc: "2.0";
  method: string;
  params?: any;
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

function createSuccessResponse(
  id: number | string,
  result: any
): JsonRpcSuccessResponse {
  return {
    jsonrpc: "2.0",
    id,
    result,
  }
}

function createErrorResponse(
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

export function handleRequest(request: JsonRpcRequest): JsonRpcResponse {
  if (!request.jsonrpc || request.jsonrpc !== "2.0") {
    return createErrorResponse(null, -32600, "Invalid Request")
  }

  const method = request.method
  const params = request.params

  switch (method) {
    case "add":
      if (!params || params.length !== 2) {
        return createErrorResponse(request.id, -32602, "Invalid params")
      }
      return createSuccessResponse(request.id, params[0] + params[1])
    case "subtract":
      if (!params || params.length !== 2) {
        return createErrorResponse(request.id, -32602, "Invalid params")
      }
      return createSuccessResponse(request.id, params[0] - params[1])
    default:
      return createErrorResponse(request.id, -32601, "Method not found")
  }
}
