import { ProviderService } from '../../../shared/provider/index.js';
import { HandlerRegistry } from '../../../shared/rpc/index.js';

import { EthAPI, Web3API, DebugAPI } from './apis/index.js';

// Create handlers for each method
export const createHandlerRegistry = (
  eth: EthAPI, 
  debug: DebugAPI, 
  web3: Web3API,
  ps: ProviderService,
): HandlerRegistry => ({
  'eth_chainId': async () => ps.getChainId(),
  'eth_supportedEntryPoints': async () => eth.getSupportedEntryPoints(),
  'eth_sendUserOperation': async (params) => eth.sendUserOperation(params[0], params[1]),
  'eth_estimateUserOperationGas': async (params) => eth.estimateUserOperationGas(params[0], params[1]),
  'eth_getUserOperationReceipt': async (params) => eth.getUserOperationReceipt(params[0]),
  'eth_getUserOperationByHash': async (params) => eth.getUserOperationByHash(params[0]),
  'web3_clientVersion': async () => web3.clientVersion(),
  'debug_bundler_clearState': async () => {
    await debug.clearState();
    return 'ok';
  },
  'debug_bundler_dumpMempool': async () => debug.dumpMempool(),
  'debug_bundler_clearMempool': async () => {
    await debug.clearMempool();
    return 'ok';
  },
  'debug_bundler_sendBundleNow': async () => {
    const result = await debug.sendBundleNow();
    if (result.transactionHash === '' && result.userOpHashes.length === 0) {
      return 'ok';
    }
    return result;
  },
  'debug_bundler_setBundlingMode': async (params) => {
    debug.setBundlingMode(params[0]);
    return 'ok';
  },
  'debug_bundler_setBundleInterval': async () => 'ok', // TODO:  Placeholder for implementation, need to implement
  'debug_bundler_setReputation': async (params) => {
    await debug.setReputation(params[0]);
    return 'ok';
  },
  'debug_bundler_dumpReputation': async () => debug.dumpReputation(),
  'debug_bundler_clearReputation': () => {
    debug.clearReputation();
    return 'ok';
  },
  'debug_bundler_addUserOps': async (params) => {
    await debug.addUserOps(params[0]);
    return 'ok';
  },
  'debug_bundler_getStakeStatus': async (params) => {
    await debug.getStakeStatus(params[0], params[1]);
    return null;
  },
});
