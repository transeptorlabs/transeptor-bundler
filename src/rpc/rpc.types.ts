import { RpcError } from '../utils/index.js'
import { Either } from '../monad/index.js'
import {
  EstimateUserOpGasResult,
  SendBundleReturn,
  UserOperation,
  UserOperationByHashResponse,
  UserOperationReceipt,
} from '../types/index.js'
import { StateOverride } from '../sim/index.js'
import { ReputationEntry } from '../reputation/index.js'
import { StakeInfo } from '../validation/index.js'
import { PreVerificationGasConfig } from '../gas/index.js'

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

export type RpcHandler = {
  doHandleRequest(
    request: JsonRpcRequest,
  ): Promise<Either<RpcError, JsonRpcResponse>>
}

// Define the mapping of method names to their params and return types
type MethodMapping = {
  web3_clientVersion: {
    params: []
    return: string
  }

  eth_chainId: {
    params: []
    return: number
  }
  eth_supportedEntryPoints: {
    params: []
    return: string[]
  }
  eth_sendUserOperation: {
    params: [UserOperation, string]
    return: Either<RpcError, string>
  }
  eth_estimateUserOperationGas: {
    params: [Partial<UserOperation>, string, StateOverride?]
    return: Either<RpcError, EstimateUserOpGasResult>
  }
  eth_getUserOperationReceipt: {
    params: [string]
    return: Either<RpcError, UserOperationReceipt | null>
  }
  eth_getUserOperationByHash: {
    params: [string]
    return: Either<RpcError, UserOperationByHashResponse | null>
  }

  debug_bundler_clearState: {
    params: []
    return: 'ok'
  }
  debug_bundler_dumpMempool: {
    params: []
    return: UserOperation[]
  }
  debug_bundler_clearMempool: {
    params: []
    return: 'ok'
  }
  debug_bundler_sendBundleNow: {
    params: []
    return: SendBundleReturn | 'ok'
  }
  debug_bundler_setBundlingMode: {
    params: [string]
    return: 'ok'
  }
  debug_bundler_setBundleInterval: {
    params: []
    return: 'ok'
  }
  debug_bundler_setReputation: {
    params: [any]
    return: 'ok'
  }
  debug_bundler_dumpReputation: {
    params: []
    return: ReputationEntry[]
  }
  debug_bundler_clearReputation: {
    params: []
    return: 'ok'
  }
  debug_bundler_addUserOps: {
    params: [UserOperation[]]
    return: 'ok'
  }
  debug_bundler_getStakeStatus: {
    params: [string, string]
    return: {
      stakeInfo: StakeInfo
      isStaked: boolean
    }
  }
  debug_bundler_setConfiguration: {
    params: [Partial<PreVerificationGasConfig>]
    return: 'ok'
  }
}

// Infer method names
export type MethodNames = keyof MethodMapping

// Generic handler function type
export type HandlerFunction<M extends MethodNames> = (
  params: MethodMapping[M]['params'],
) => Promise<MethodMapping[M]['return']>

export type HandlerRegistry = {
  [M in MethodNames]: HandlerFunction<M>
}
