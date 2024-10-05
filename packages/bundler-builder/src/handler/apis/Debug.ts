import { packUserOp } from '../../../../shared/utils/index.js'
import {
  SendBundleReturn,
  UserOperation,
} from '../../../../shared/types/index.js'
import { StakeInfo } from '../../../../shared/validatation/index.js'
import { ethers, BigNumber } from 'ethers'
import { ReputationEntry, ReputationManager } from '../../reputation/index.js'
import { BundleManager } from '../../bundle/index.js'
import { MempoolManager } from '../../mempool/index.js'

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
  ): Promise<{ stakeInfo: StakeInfo; isStaked: boolean }>
}

export const createDebugAPI = (
  bundleManager: BundleManager,
  reputationManager: ReputationManager,
  mempoolManager: MempoolManager,
  entryPointContract: ethers.Contract,
): DebugAPI => {
  return {
    clearState: async (): Promise<void> => {
      await mempoolManager.clearState()
      await reputationManager.clearState()
    },

    dumpMempool: async () => {
      return await mempoolManager.dump()
    },

    clearMempool: async (): Promise<void> => {
      await mempoolManager.clearState()
    },

    setBundlingMode: (mode: string): boolean => {
      if (mode !== 'auto' && mode !== 'manual') {
        throw new Error('Invalid bundling mode')
      }
      bundleManager.setBundlingMode(mode)
      return true
    },

    sendBundleNow: async (): Promise<SendBundleReturn> => {
      return await bundleManager.doAttemptBundle(true)
    },

    setReputation: async (param: any): Promise<ReputationEntry[]> => {
      return await reputationManager.setReputation(param)
    },

    addUserOps: async (userOps: UserOperation[]): Promise<void> => {
      for (const userOp of userOps) {
        const userOpHash = await entryPointContract.getUserOpHash(
          packUserOp(userOp),
        )
        await mempoolManager.addUserOp({
          userOp,
          userOpHash,
          prefund: BigNumber.from(0),
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
    ): Promise<{
      stakeInfo: StakeInfo
      isStaked: boolean
    }> => {
      return await reputationManager.getStakeStatus(address)
    },
  }
}
