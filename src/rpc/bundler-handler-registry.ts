import { ProviderService } from '../provider/index.js'
import type { HandlerRegistry } from './index.js'

import { DebugAPI, EthAPI, Web3API } from './apis/index.js'

export const createBundlerHandlerRegistry = (
  eth: EthAPI,
  web3: Web3API,
  debug: DebugAPI,
  ps: ProviderService,
): HandlerRegistry => ({
  web3_clientVersion: async () => web3.clientVersion(),

  // Eth namespace
  eth_chainId: async () => ps.getChainId(),
  eth_supportedEntryPoints: async () => eth.getSupportedEntryPoints(),
  eth_sendUserOperation: async (params) =>
    eth.sendUserOperation(params[0], params[1]),
  eth_estimateUserOperationGas: async (params) =>
    eth.estimateUserOperationGas(
      params[0],
      params[1],
      params[2] ? params[2] : undefined,
    ),
  eth_getUserOperationReceipt: async (params) =>
    eth.getUserOperationReceipt(params[0]),
  eth_getUserOperationByHash: async (params) =>
    eth.getUserOperationByHash(params[0]),

  // Debug namespace
  debug_bundler_clearState: async () => {
    await debug.clearState()
    return 'ok'
  },
  debug_bundler_dumpMempool: async () => await debug.dumpMempool(),
  debug_bundler_clearMempool: async () => {
    await debug.clearMempool()
    return 'ok'
  },
  debug_bundler_sendBundleNow: async () => {
    const result = await debug.sendBundleNow()
    if (result.transactionHash === '' && result.userOpHashes.length === 0) {
      return 'ok'
    }
    return result
  },
  debug_bundler_setBundlingMode: async (params) => {
    debug.setBundlingMode(params[0])
    return 'ok'
  },
  debug_bundler_setBundleInterval: async () => 'ok', // TODO:  Placeholder for implementation, need to implement
  debug_bundler_setReputation: async (params) => {
    await debug.setReputation(params[0])
    return 'ok'
  },
  debug_bundler_dumpReputation: async () => await debug.dumpReputation(),
  debug_bundler_clearReputation: async () => {
    await debug.clearReputation()
    return 'ok'
  },
  debug_bundler_addUserOps: async (params) => {
    await debug.addUserOps(params[0])
    return 'ok'
  },
  debug_bundler_getStakeStatus: async (params) => {
    return await debug.getStakeStatus(params[0], params[1])
  },
  debug_bundler_setConfiguration: async (params) => {
    await debug.setGasConfig(params[0])
    return 'ok'
  },
})
