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

export type DebugAPI = {
  clearState(): Promise<void>
  dumpMempool(): Promise<UserOperation[]>
  clearMempool(): Promise<void>
  setBundlingMode(mode: string): boolean
  sendBundleNow(): Promise<SendBundleReturn>
  setReputation(param: any): Promise<ReputationEntry[]>
  addUserOps(userOps: UserOperation[]): Promise<void>
  dumpReputation(): Promise<ReputationEntry[]>
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

    setBundlingMode: (mode: string): boolean => {
      if (mode !== 'auto' && mode !== 'manual') {
        throw new Error('Invalid bundling mode')
      }
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

    setReputation: async (param: any): Promise<ReputationEntry[]> => {
      return await reputationManager.setReputation(param)
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

    dumpReputation: async (): Promise<ReputationEntry[]> => {
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
      await pvgc.updateGasConfig(config)
    },
  }
}
