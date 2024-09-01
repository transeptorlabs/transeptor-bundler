import { Logger } from '../../../shared/logger/index.js'
import { ProviderService } from '../../../shared/provider/index.js'
import {
  JsonRpcErrorResponse,
  JsonRpcRequest,
  JsonRpcResponse,
} from '../../../shared/types/index.js'
import {
  RpcError,
  createErrorResponse,
  createSuccessResponse,
  jsonRpcRequestValidator,
} from '../../../shared/utils/index.js'

import { EthAPI, Web3API, DebugAPI } from './services/index.js'

export class RpcMethodHandler {
  private readonly eth: EthAPI
  private readonly debug: DebugAPI
  private readonly web3: Web3API
  private readonly providerService: ProviderService
  private readonly httpApi: string[]

  constructor(
    eth: EthAPI,
    debug: DebugAPI,
    web3: Web3API,
    providerService: ProviderService,
    httpApi: string[]
  ) {
    this.eth = eth
    this.debug = debug
    this.web3 = web3
    this.providerService = providerService
    this.httpApi = httpApi
  }

  public async doHandleRequest(
    request: JsonRpcRequest
  ): Promise<JsonRpcResponse> {
    try {
      const isValidRpc: boolean | JsonRpcErrorResponse =
        jsonRpcRequestValidator(request, this.httpApi)
      if (typeof isValidRpc !== 'boolean') {
        return isValidRpc
      }

      const method = request.method
      const params = request.params
      let result: any

      Logger.debug({ method }, 'Handling incoming request')
      switch (method) {
        case 'eth_chainId':
          result = await this.providerService.getChainId()
          break
        case 'eth_supportedEntryPoints':
          result = this.eth.getSupportedEntryPoints()
          break
        case 'eth_sendUserOperation':
          result = await this.eth.sendUserOperation(params[0], params[1])
          break
        case 'eth_estimateUserOperationGas':
          result = await this.eth.estimateUserOperationGas(
            params[0],
            params[1]
          )
          break
        case 'eth_getUserOperationReceipt':
          result = await this.eth.getUserOperationReceipt(params[0])
          break
        case 'eth_getUserOperationByHash':
          result = await this.eth.getUserOperationByHash(params[0])
          break
        case 'web3_clientVersion':
          result = this.web3.clientVersion()
          break
        case 'debug_bundler_clearState':
          await this.debug.clearState()
          result = 'ok'
          break
        case 'debug_bundler_dumpMempool':
          result = this.debug.dumpMempool()
          break
        case 'debug_bundler_clearMempool':
          await this.debug.clearMempool()
          result = 'ok'
          break
        case 'debug_bundler_sendBundleNow':
          result = await this.debug.sendBundleNow()
          if (
            result.transactionHash === '' &&
            result.userOpHashes.length === 0
          ) {
            result = 'ok'
          }
          break
        case 'debug_bundler_setBundlingMode':
          this.debug.setBundlingMode(params[0])
          result = 'ok'
          break
        case 'debug_bundler_setBundleInterval':
          // TODO: implement
          result = 'ok'
          break
        case 'debug_bundler_setReputation':
          await this.debug.setReputation(params[0])
          result = 'ok'
          break
        case 'debug_bundler_dumpReputation':
          result = this.debug.dumpReputation()
          break
        case 'debug_bundler_clearReputation':
          this.debug.clearReputation()
          result = 'ok'
          break
        case 'debug_bundler_addUserOps':
          await this.debug.addUserOps(params[0])
          result = 'ok'
          break
        case 'debug_bundler_getStakeStatus':
          result = await this.debug.getStakeStatus(params[0], params[1])
          result = null
          break
        default:
          throw new RpcError(`Method ${method} is not supported`, -32601)
      }

      return createSuccessResponse(request.id, result)
    } catch (error: any) {
      Logger.error(
        { error: error.message },
        `Error calling method ${request.method}`
      )
      return createErrorResponse(
        request.id,
        error.code ? error.code : -32000,
        error.message,
        error.data ? error.data : undefined
      )
    }
  }
}
