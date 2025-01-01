import { packUserOp } from '../../utils/index.js'
import { SendBundleReturn, UserOperation } from '../../types/index.js'
import { StakeInfo } from '../../validation/index.js'
import { ethers } from 'ethers'
import { ReputationEntry, ReputationManager } from '../../reputation/index.js'
import { BundleManager } from '../../bundle/index.js'
import { MempoolManagerCore } from '../../mempool/index.js'
import { EventManagerWithListener } from '../../event/index.js'
import {
  PreVerificationGasCalculator,
  PreVerificationGasConfig,
} from '../../gas/index.js'

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

export const createDebugAPI = (
  bundleManager: BundleManager,
  reputationManager: ReputationManager,
  mempoolManagerCore: MempoolManagerCore,
  eventsManager: EventManagerWithListener,
  pvgc: PreVerificationGasCalculator,
  entryPointContract: ethers.Contract,
): DebugAPI => {
  return {
    clearState: async (): Promise<void> => {
      await mempoolManagerCore.clearState()
      await reputationManager.clearState()
    },

    dumpMempool: async () => {
      return await mempoolManagerCore.dump()
    },

    clearMempool: async (): Promise<void> => {
      await mempoolManagerCore.clearState()
    },

    setBundlingMode: (mode: 'auto' | 'manual'): boolean => {
      bundleManager.setBundlingMode(mode)
      return true
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
    ): Promise<ReputationEntry[]> => {
      return await reputationManager.setReputation(reputations)
    },

    addUserOps: async (userOps: UserOperation[]): Promise<void> => {
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
    },

    dumpReputation: async (_: string): Promise<ReputationEntry[]> => {
      return await reputationManager.dump()
    },

    clearReputation: async (): Promise<void> => {
      await reputationManager.clearState()
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
    ): Promise<void> => {
      pvgc.updateGasConfig(config)
    },
  }
}
