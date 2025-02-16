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

// web3 namespace
export type Web3APIMethodMapping = {
  web3_clientVersion: {
    params: []
    return: string
  }
}

export type Web3API = {
  clientVersion(): string
}

// eth namespace
export type EthAPIMethodMapping = {
  eth_chainId: {
    params: []
    return: number
  }
  eth_estimateUserOperationGas: {
    params: [Partial<UserOperation>, string, StateOverride?]
    return: Either<RpcError, EstimateUserOpGasResult>
  }
  eth_sendUserOperation: {
    params: [UserOperation, string]
    return: Either<RpcError, string>
  }
  eth_supportedEntryPoints: {
    params: []
    return: string[]
  }
  eth_getUserOperationReceipt: {
    params: [string]
    return: Either<RpcError, UserOperationReceipt | null>
  }
  eth_getUserOperationByHash: {
    params: [string]
    return: Either<RpcError, UserOperationByHashResponse | null>
  }
}

export type EthAPI = {
  getChainId(): Promise<number>
  estimateUserOperationGas(
    userOpInput: Partial<UserOperation>,
    entryPointInput: string,
    stateOverride?: StateOverride,
  ): Promise<Either<RpcError, EstimateUserOpGasResult>>
  sendUserOperation(
    userOpInput: UserOperation,
    entryPointInput: string,
  ): Promise<Either<RpcError, string>>
  getSupportedEntryPoints(): Promise<string[]>
  getUserOperationReceipt(
    userOpHash: string,
  ): Promise<Either<RpcError, UserOperationReceipt | null>>
  getUserOperationByHash(
    userOpHash: string,
  ): Promise<Either<RpcError, UserOperationByHashResponse | null>>
}

// debug namespace
export type DebugAPIMethodMapping = {
  debug_bundler_clearState: {
    params: []
    return: string
  }
  debug_bundler_dumpMempool: {
    params: []
    return: UserOperation[]
  }
  debug_bundler_clearMempool: {
    params: []
    return: string
  }
  debug_bundler_sendBundleNow: {
    params: []
    return: SendBundleReturn | string
  }
  debug_bundler_setBundlingMode: {
    params: [string]
    return: string
  }
  debug_bundler_setBundleInterval: {
    params: []
    return: string
  }
  debug_bundler_setReputation: {
    params: [ReputationEntry[], string]
    return: string
  }
  debug_bundler_dumpReputation: {
    params: [string]
    return: ReputationEntry[]
  }
  debug_bundler_clearReputation: {
    params: []
    return: string
  }
  debug_bundler_addUserOps: {
    params: [UserOperation[]]
    return: string
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
    return: string
  }
}

export type DebugAPI = {
  clearState(): Promise<void>
  dumpMempool(): Promise<UserOperation[]>
  clearMempool(): Promise<void>
  setBundlingMode(mode: 'auto' | 'manual'): boolean
  sendBundleNow(): Promise<SendBundleReturn>
  setReputation(
    reputations: ReputationEntry[],
    epAddress: string,
  ): Promise<ReputationEntry[]>
  addUserOps(userOps: UserOperation[]): Promise<void>
  dumpReputation(entryPoint: string): Promise<ReputationEntry[]>
  clearReputation(): Promise<void>
  getStakeStatus(
    address: string,
    entryPointAddress: string,
  ): Promise<{ stakeInfo: StakeInfo; isStaked: boolean }>
  setGasConfig(config: Partial<PreVerificationGasConfig>): Promise<void>
}
