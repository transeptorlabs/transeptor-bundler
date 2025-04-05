import { PreVerificationGasConfig } from 'src/gas/pre-verification-gas.js'
import { SendBundleReturn } from './bundle.types.js'
import { ReputationEntry } from './reputation.types.js'
import { StateOverride } from './sim-types.js'
import {
  UserOperation,
  EstimateUserOpGasResult,
  UserOperationReceipt,
  UserOperationByHashResponse,
} from './userop.types.js'
import { StakeInfo } from './validation.types.js'
import { Either } from 'src/monad/either.js'
import { RpcError } from './error.types.js'

/**
 * The JSON-RPC API for the web3 namespace mapping with the method names that
 * are available in the API. Returns the parameters and return types for each method.
 * This is used to define the structure of the API and to provide type safety for
 * the methods and their parameters.
 */
export type Web3APIMethodMapping = {
  web3_clientVersion: {
    params: []
    return: Promise<string>
  }
}

/**
 * The Web3API interface defines the structure of the web3 namespace API. It is used to
 * implement the web3 namespace API methods.
 */
export type Web3API = {
  clientVersion(): Web3APIMethodMapping['web3_clientVersion']['return']
}

/**
 * The JSON-RPC API for the eth namespace mapping with the method names that
 * are available in the API. Returns the parameters and return types for each method.
 * This is used to define the structure of the API and to provide type safety for
 * the methods and their parameters.
 */
export type EthAPIMethodMapping = {
  eth_chainId: {
    params: []
    return: Promise<number>
  }
  eth_estimateUserOperationGas: {
    params: [Partial<UserOperation>, string, StateOverride?]
    return: Promise<Either<RpcError, EstimateUserOpGasResult>>
  }
  eth_sendUserOperation: {
    params: [UserOperation, string]
    return: Promise<Either<RpcError, string>>
  }
  eth_supportedEntryPoints: {
    params: []
    return: Promise<string[]>
  }
  eth_getUserOperationReceipt: {
    params: [string]
    return: Promise<Either<RpcError, UserOperationReceipt | null>>
  }
  eth_getUserOperationByHash: {
    params: [string]
    return: Promise<Either<RpcError, UserOperationByHashResponse | null>>
  }
}

/**
 * The EthAPI interface defines the structure of the eth namespace API. It is used to
 * implement the eth namespace API methods.
 */
export type EthAPI = {
  getChainId(): EthAPIMethodMapping['eth_chainId']['return']
  estimateUserOperationGas(
    userOpInput: EthAPIMethodMapping['eth_estimateUserOperationGas']['params'][0],
    entryPointInput: EthAPIMethodMapping['eth_estimateUserOperationGas']['params'][1],
    stateOverride?: EthAPIMethodMapping['eth_estimateUserOperationGas']['params'][2],
  ): EthAPIMethodMapping['eth_estimateUserOperationGas']['return']
  sendUserOperation(
    userOpInput: EthAPIMethodMapping['eth_sendUserOperation']['params'][0],
    entryPointInput: EthAPIMethodMapping['eth_sendUserOperation']['params'][1],
  ): EthAPIMethodMapping['eth_sendUserOperation']['return']
  getSupportedEntryPoints(): EthAPIMethodMapping['eth_supportedEntryPoints']['return']
  getUserOperationReceipt(
    userOpHash: EthAPIMethodMapping['eth_getUserOperationReceipt']['params'][0],
  ): EthAPIMethodMapping['eth_getUserOperationReceipt']['return']
  getUserOperationByHash(
    userOpHash: EthAPIMethodMapping['eth_getUserOperationByHash']['params'][0],
  ): EthAPIMethodMapping['eth_getUserOperationByHash']['return']
}

/**
 * The JSON-RPC API for the debug namespace mapping with the method names that
 * are available in the API. Returns the parameters and return types for each method.
 * This is used to define the structure of the API and to provide type safety for
 * the methods and their parameters.
 */
export type DebugAPIMethodMapping = {
  debug_bundler_clearState: {
    params: []
    return: Promise<string>
  }
  debug_bundler_dumpMempool: {
    params: []
    return: Promise<UserOperation[]>
  }
  debug_bundler_clearMempool: {
    params: []
    return: Promise<string>
  }
  debug_bundler_sendBundleNow: {
    params: []
    return: Promise<SendBundleReturn | string>
  }
  debug_bundler_setBundlingMode: {
    params: ['auto' | 'manual']
    return: Promise<string>
  }
  debug_bundler_setBundleInterval: {
    params: [number]
    return: Promise<string>
  }
  debug_bundler_setReputation: {
    params: [ReputationEntry[], string]
    return: Promise<string>
  }
  debug_bundler_dumpReputation: {
    params: [string]
    return: Promise<ReputationEntry[]>
  }
  debug_bundler_clearReputation: {
    params: []
    return: Promise<string>
  }
  debug_bundler_addUserOps: {
    params: [UserOperation[]]
    return: Promise<string>
  }
  debug_bundler_getStakeStatus: {
    params: [string, string]
    return: Promise<{
      stakeInfo: StakeInfo
      isStaked: boolean
    }>
  }
  debug_bundler_setConfiguration: {
    params: [Partial<PreVerificationGasConfig>]
    return: Promise<string>
  }
}

/**
 * The DebugAPI interface defines the structure of the debug namespace API. It is used to
 * implement the debug namespace API methods.
 */
export type DebugAPI = {
  clearState(): DebugAPIMethodMapping['debug_bundler_clearState']['return']
  dumpMempool(): DebugAPIMethodMapping['debug_bundler_dumpMempool']['return']
  clearMempool(): DebugAPIMethodMapping['debug_bundler_clearMempool']['return']
  setBundlingMode(
    mode: DebugAPIMethodMapping['debug_bundler_setBundlingMode']['params'][0],
  ): DebugAPIMethodMapping['debug_bundler_setBundlingMode']['return']
  sendBundleNow(): DebugAPIMethodMapping['debug_bundler_sendBundleNow']['return']
  setBundleInterval(
    interval: DebugAPIMethodMapping['debug_bundler_setBundleInterval']['params'][0],
  ): DebugAPIMethodMapping['debug_bundler_setBundleInterval']['return']
  setReputation(
    reputations: DebugAPIMethodMapping['debug_bundler_setReputation']['params'][0],
    epAddress: DebugAPIMethodMapping['debug_bundler_setReputation']['params'][1],
  ): DebugAPIMethodMapping['debug_bundler_setReputation']['return']
  addUserOps(
    userOps: DebugAPIMethodMapping['debug_bundler_addUserOps']['params'][0],
  ): DebugAPIMethodMapping['debug_bundler_addUserOps']['return']
  dumpReputation(
    entryPoint: DebugAPIMethodMapping['debug_bundler_dumpReputation']['params'][0],
  ): DebugAPIMethodMapping['debug_bundler_dumpReputation']['return']
  clearReputation(): DebugAPIMethodMapping['debug_bundler_clearReputation']['return']
  getStakeStatus(
    address: DebugAPIMethodMapping['debug_bundler_getStakeStatus']['params'][0],
    entryPointAddress: DebugAPIMethodMapping['debug_bundler_getStakeStatus']['params'][1],
  ): DebugAPIMethodMapping['debug_bundler_getStakeStatus']['return']
  setGasConfig(
    config: DebugAPIMethodMapping['debug_bundler_setConfiguration']['params'][0],
  ): DebugAPIMethodMapping['debug_bundler_setConfiguration']['return']
}

/**
 * Consolidated type for all API methods with their parameters and return types.
 */
export type MethodMapping = Web3APIMethodMapping &
  EthAPIMethodMapping &
  DebugAPIMethodMapping

/**
 * The method names of the supported APIs with parameters and return types.
 */
export type MethodNames = keyof MethodMapping
