import { providers } from 'ethers'
import { RpcError } from '../../../shared/utils/index.js'
import { JsonRpcErrorResponse } from '../../../shared/rpc'

export const routeRequest = async <T>(
  bundlerBuilderClientUrl: string,
  method: string,
  params: any[],
): Promise<T | RpcError> => {
  try {
    const provider = new providers.StaticJsonRpcProvider(
      bundlerBuilderClientUrl,
    )
    return await provider.send(method, params)
  } catch (error: any) {
    const parseJson: JsonRpcErrorResponse = JSON.parse(error.body)
    return new RpcError(parseJson.error.message, parseJson.error.code)
  }
}
