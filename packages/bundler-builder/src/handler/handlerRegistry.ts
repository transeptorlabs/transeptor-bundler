import { MempoolManager } from '../mempool/index.js';
import type { HandlerRegistry } from '../../../shared/rpc/index.js';

import { DebugAPI } from './apis/index.js';

export const createRelayerHandlerRegistry = (
  debug: DebugAPI, 
  mempool: MempoolManager
): HandlerRegistry => ({

  'builder_addUserOp': async (params) => {
    await mempool.addUserOp(params[0]);
    return 'ok';
  },

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
