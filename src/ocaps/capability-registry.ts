import {
  CapabilityTypes,
  StateCapability,
  StateKey,
  StateOperations,
} from '../types/index.js'
import { deepFreezeClone } from '../utils/index.js'

export type StateCapabilityRegistry = Readonly<
  Record<string, StateCapability[]>
>

/**
 * The registry of state capabilities for the internal modules.
 */
export const STATE_CAPABILITY_REGISTRY: StateCapabilityRegistry =
  deepFreezeClone({
    'reputation-manager': [
      {
        type: CapabilityTypes.State,
        data: {
          key: StateKey.ReputationEntries,
          operations: [StateOperations.READ, StateOperations.WRITE],
        },
      },
      {
        type: CapabilityTypes.State,
        data: {
          key: StateKey.WhiteList,
          operations: [StateOperations.READ, StateOperations.WRITE],
        },
      },
      {
        type: CapabilityTypes.State,
        data: {
          key: StateKey.BlackList,
          operations: [StateOperations.READ, StateOperations.WRITE],
        },
      },
    ],
    'deposit-manager': [
      {
        type: CapabilityTypes.State,
        data: {
          key: StateKey.StandardPool,
          operations: [StateOperations.READ],
        },
      },
    ],
    'mempool-manager': [
      {
        type: CapabilityTypes.State,
        data: {
          key: StateKey.StandardPool,
          operations: [StateOperations.READ, StateOperations.WRITE],
        },
      },
      {
        type: CapabilityTypes.State,
        data: {
          key: StateKey.MempoolEntryCount,
          operations: [StateOperations.READ, StateOperations.WRITE],
        },
      },
    ],
    'bundle-manager': [
      {
        type: CapabilityTypes.State,
        data: {
          key: StateKey.BundleTxs,
          operations: [StateOperations.WRITE],
        },
      },
    ],
  })
