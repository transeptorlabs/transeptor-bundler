import type {
  EthAPI,
  DebugAPI,
  Web3API,
  HandlerRegistry,
} from '../types/index.js'

export const createBundlerHandlerRegistry = (
  eth: EthAPI,
  web3: Web3API,
  debug: DebugAPI,
): HandlerRegistry => ({
  web3_clientVersion: {
    validationFunc: (params) => params.length === 0,
    handlerFunc: () => web3.clientVersion(),
  },

  // Eth namespace
  eth_chainId: {
    validationFunc: (params) => params.length === 0,
    handlerFunc: async () => eth.getChainId(),
  },
  eth_supportedEntryPoints: {
    validationFunc: (params) => params.length === 0,
    handlerFunc: async () => eth.getSupportedEntryPoints(),
  },
  eth_sendUserOperation: {
    validationFunc: (params) =>
      params.length === 2 &&
      typeof params[0] === 'object' && // Add deeper checks for the UserOperation structure
      typeof params[1] === 'string',
    handlerFunc: async (params) => eth.sendUserOperation(params[0], params[1]),
  },
  eth_estimateUserOperationGas: {
    validationFunc: (params) => params.length >= 2,
    handlerFunc: async (params) =>
      eth.estimateUserOperationGas(
        params[0],
        params[1],
        params[2] ? params[2] : undefined,
      ),
  },
  eth_getUserOperationReceipt: {
    validationFunc: (params) =>
      params.length === 1 && typeof params[0] === 'string',
    handlerFunc: async (params) => eth.getUserOperationReceipt(params[0]),
  },
  eth_getUserOperationByHash: {
    validationFunc: (params) =>
      params.length === 1 && typeof params[0] === 'string',
    handlerFunc: async (params) => eth.getUserOperationByHash(params[0]),
  },

  // Debug namespace
  debug_bundler_clearState: {
    validationFunc: (params) => params.length === 0,
    handlerFunc: async () => {
      await debug.clearState()
      return 'ok'
    },
  },
  debug_bundler_dumpMempool: {
    validationFunc: (params) =>
      params.length === 1 && typeof params[0] === 'string',
    handlerFunc: async () => await debug.dumpMempool(),
  },
  debug_bundler_clearMempool: {
    validationFunc: (params) => params.length === 0,
    handlerFunc: async () => {
      await debug.clearMempool()
      return 'ok'
    },
  },
  debug_bundler_sendBundleNow: {
    validationFunc: (params) => params.length === 0,
    handlerFunc: async () => {
      const result = await debug.sendBundleNow()
      if (result.transactionHash === '' && result.userOpHashes.length === 0) {
        return 'ok'
      }
      return result
    },
  },
  debug_bundler_setBundlingMode: {
    validationFunc: (params) =>
      params.length === 1 &&
      typeof params[0] === 'string' &&
      ['auto', 'manual'].includes(params[0]),
    handlerFunc: async (params) => {
      debug.setBundlingMode(params[0] as 'auto' | 'manual')
      return 'ok'
    },
  },
  debug_bundler_setBundleInterval: {
    validationFunc: (params) => params.length === 0,
    handlerFunc: async () => 'ok', // TODO:  Placeholder for implementation, need to implement
  },
  debug_bundler_setReputation: {
    validationFunc: (params) => params.length === 2 && Array.isArray(params[0]),
    handlerFunc: async (params) => {
      await debug.setReputation(params[0], params[1])
      return 'ok'
    },
  },
  debug_bundler_dumpReputation: {
    validationFunc: (params) => params.length === 1,
    handlerFunc: async (params) => await debug.dumpReputation(params[0]),
  },
  debug_bundler_clearReputation: {
    validationFunc: (params) => params.length === 0,
    handlerFunc: async () => {
      await debug.clearReputation()
      return 'ok'
    },
  },
  debug_bundler_addUserOps: {
    validationFunc: (params) => params.length === 1 && Array.isArray(params[0]),
    handlerFunc: async (params) => {
      await debug.addUserOps(params[0])
      return 'ok'
    },
  },
  debug_bundler_getStakeStatus: {
    validationFunc: (params) =>
      params.length === 2 &&
      typeof params[0] === 'string' &&
      typeof params[1] === 'string',
    handlerFunc: async (params) => {
      return await debug.getStakeStatus(params[0], params[1])
    },
  },
  debug_bundler_setConfiguration: {
    validationFunc: (params) =>
      params.length === 1 && typeof params[0] === 'object',
    handlerFunc: async (params) => {
      await debug.setGasConfig(params[0])
      return 'ok'
    },
  },
})
