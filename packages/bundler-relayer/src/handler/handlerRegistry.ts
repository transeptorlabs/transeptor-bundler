import { ProviderService } from '../../../shared/provider/index.js'
import { HandlerRegistry } from '../../../shared/rpc/index.js'

import { EthAPI, Web3API } from './apis/index.js'
import { routeRequest } from './request-router.js'

export const createRelayerHandlerRegistry = (
  eth: EthAPI,
  web3: Web3API,
  bundlerBuilderUrl: string,
  ps: ProviderService,
): HandlerRegistry => ({
  eth_chainId: async () => ps.getChainId(),
  eth_supportedEntryPoints: async () => eth.getSupportedEntryPoints(),
  eth_sendUserOperation: async (params) =>
    eth.sendUserOperation(params[0], params[1]),
  eth_estimateUserOperationGas: async (params) =>
    eth.estimateUserOperationGas(params[0], params[1]),
  eth_getUserOperationReceipt: async (params) =>
    eth.getUserOperationReceipt(params[0]),
  eth_getUserOperationByHash: async (params) =>
    eth.getUserOperationByHash(params[0]),
  web3_clientVersion: async () => web3.clientVersion(),

  // route debug to bundle builder node
  debug_bundler_clearState: async (params) =>
    routeRequest(bundlerBuilderUrl, 'debug_bundler_clearState', params),
  debug_bundler_dumpMempool: async (params) =>
    routeRequest(bundlerBuilderUrl, 'debug_bundler_dumpMempool', params),
  debug_bundler_clearMempool: async (params) =>
    routeRequest(bundlerBuilderUrl, 'debug_bundler_clearMempool', params),
  debug_bundler_sendBundleNow: async (params) =>
    routeRequest(bundlerBuilderUrl, 'debug_bundler_sendBundleNow', params),
  debug_bundler_setBundlingMode: async (params) =>
    routeRequest(bundlerBuilderUrl, 'debug_bundler_setBundlingMode', params),
  debug_bundler_setBundleInterval: async (params) =>
    routeRequest(bundlerBuilderUrl, 'debug_bundler_setBundleInterval', params),
  debug_bundler_setReputation: async (params) =>
    routeRequest(bundlerBuilderUrl, 'debug_bundler_setReputation', params),
  debug_bundler_dumpReputation: async (params) =>
    routeRequest(bundlerBuilderUrl, 'debug_bundler_dumpReputation', params),
  debug_bundler_clearReputation: async (params) =>
    routeRequest(bundlerBuilderUrl, 'debug_bundler_clearReputation', params),
  debug_bundler_addUserOps: async (params) =>
    routeRequest(bundlerBuilderUrl, 'debug_bundler_addUserOps', params),
  debug_bundler_getStakeStatus: async (params) =>
    routeRequest(bundlerBuilderUrl, 'debug_bundler_getStakeStatus', params),
})
