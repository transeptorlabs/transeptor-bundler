import { packUserOp, withReadonly } from '../utils/index.js'
import { BundleManager } from '../bundle/index.js'
import {
  MempoolManagerCore,
  ReputationEntry,
  ReputationManager,
  StakeInfo,
  SendBundleReturn,
  UserOperation,
  DebugAPI,
} from '../types/index.js'
import { EventManager } from '../event/index.js'
import {
  PreVerificationGasCalculator,
  PreVerificationGasConfig,
} from '../gas/index.js'
import { ProviderService } from '../provider/index.js'

export type DebugAPIConfig = {
  providerService: ProviderService
  bundleManager: BundleManager
  reputationManager: ReputationManager
  mempoolManagerCore: MempoolManagerCore
  eventsManager: EventManager
  preVerificationGasCalculator: PreVerificationGasCalculator
}

/**
 * Creates an instance of the DebugAPI module.
 *
 * @param config - The configuration object for the DebugAPI instance.
 * @returns An instance of the DebugAPI module.
 */
function _createDebugAPI(config: Readonly<DebugAPIConfig>): DebugAPI {
  const {
    providerService,
    bundleManager,
    reputationManager,
    mempoolManagerCore,
    eventsManager,
    preVerificationGasCalculator: pvgc,
  } = config
  const entryPointContract =
    providerService.getEntryPointContractDetails().contract

  return {
    setBundleInterval: async (): Promise<string> => {
      // TODO: Implement this on the bundle manager
      return Promise.resolve('ok')
    },

    clearState: async (): Promise<string> => {
      await mempoolManagerCore.clearState()
      await reputationManager.clearState()
      return 'ok'
    },

    dumpMempool: async () => {
      return await mempoolManagerCore.dump()
    },

    clearMempool: async (): Promise<string> => {
      await mempoolManagerCore.clearState()
      return 'ok'
    },

    setBundlingMode: (mode: 'auto' | 'manual'): Promise<string> => {
      bundleManager.setBundlingMode(mode)
      return Promise.resolve('ok')
    },

    sendBundleNow: async (): Promise<SendBundleReturn> => {
      const result = await bundleManager.doAttemptBundle(true)

      // handlePastEvents is called before building the next bundle.
      // However in debug mode, we are interested in the side effects
      // (on the mempool) of this "sendBundle" operation
      await eventsManager.handlePastEvents()
      return result
    },

    setReputation: async (
      reputations: ReputationEntry[],
      _: string,
    ): Promise<string> => {
      await reputationManager.setReputation(reputations)
      return 'ok'
    },

    addUserOps: async (userOps: UserOperation[]): Promise<string> => {
      // TODO: Accept UserOperations into the mempool.
      // Assume the given UserOperations all pass validation (without actually validating them), and accept them directly into th mempool
      for (const userOp of userOps) {
        const userOpHash = await entryPointContract.getUserOpHash(
          packUserOp(userOp),
        )
        await mempoolManagerCore.addUserOp({
          userOp,
          userOpHash,
          prefund: BigInt(0),
          referencedContracts: null,
          senderInfo: null,
        })
      }

      return 'ok'
    },

    dumpReputation: async (_: string): Promise<ReputationEntry[]> => {
      return await reputationManager.dump()
    },

    clearReputation: async (): Promise<string> => {
      await reputationManager.clearState()
      return 'ok'
    },

    getStakeStatus: async (
      address: string,
      entryPointAddress: string,
    ): Promise<{
      stakeInfo: StakeInfo
      isStaked: boolean
    }> => {
      return await reputationManager.getStakeStatus(address, entryPointAddress)
    },

    setGasConfig: async (
      config: Partial<PreVerificationGasConfig>,
    ): Promise<string> => {
      pvgc.updateGasConfig(config)
      return 'ok'
    },
  }
}

export const createDebugAPI = withReadonly<DebugAPIConfig, DebugAPI>(
  _createDebugAPI,
)
