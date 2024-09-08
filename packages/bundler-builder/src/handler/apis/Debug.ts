import { packUserOp } from '../../../../shared/utils/index.js'
import { MempoolManager } from '../../mempool/index.js'
import { 
  ReputationEntry, 
  SendBundleReturn,
  UserOperation 
} from '../../../../shared/types/index.js'
import { StakeInfo } from '../../../../shared/validatation/index.js'
import { ethers, BigNumber } from 'ethers'
import { ReputationManager } from '../../../../shared/reputation/index.js'
import { BundleManager } from '../../bundle/index.js'
import { EventManagerWithReputation } from '../../event/index.js'

export type DebugAPI = {
  clearState(): Promise<void>
  dumpMempool(): void
  clearMempool(): Promise<void>
  setBundlingMode(mode: string): boolean
  sendBundleNow(): Promise<SendBundleReturn>
  setReputation (param: any): Promise<ReputationEntry[]>
  addUserOps(userOps: UserOperation[]): Promise<void>
  dumpReputation(): ReputationEntry[]
  clearReputation(): void
  getStakeStatus(
    address: string,
  ): Promise<{stakeInfo: StakeInfo, isStaked: boolean}>
}

export const createDebugAPI = (
  bundleManager: BundleManager,
  reputationManager: ReputationManager,
  mempoolManager: MempoolManager,
  eventsManager: EventManagerWithReputation,
  entryPointContract: ethers.Contract,
): DebugAPI => {
  return {
    clearState: async(): Promise<void> => {
      await mempoolManager.clearState()
      reputationManager.clearState()
    },
  
    dumpMempool() {
      return mempoolManager.dump()
    },
  
    clearMempool: async(): Promise<void> => {
      await mempoolManager.clearState()
    },
  
    setBundlingMode:(mode: string): boolean => {
      if (mode !== 'auto' && mode !== 'manual') {
        throw new Error('Invalid bundling mode')
      }
      bundleManager.setBundlingMode(mode)
      return true
    },
  
    sendBundleNow: async(): Promise<SendBundleReturn> => {
      const result = await bundleManager.doAttemptAutoBundle(true)
      await eventsManager.handlePastEvents()
      return result
    },
  
    setReputation: async (param: any): Promise<ReputationEntry[]> => {
      return reputationManager.setReputation(param)
    },
  
    addUserOps: async(userOps: UserOperation[]):Promise<void> => {
      for (const userOp of userOps) {
        const userOpHash = await entryPointContract.getUserOpHash(packUserOp(userOp))
        await mempoolManager.addUserOp(
          {
            userOp, 
            userOpHash, 
            prefund: BigNumber.from(0), 
            referencedContracts: null,
            senderInfo: null,
          }
        )
      }
    },
  
    dumpReputation: (): ReputationEntry[] => {
      return reputationManager.dump()
    },
  
    clearReputation: (): void => {
      reputationManager.clearState()
    },
  
    getStakeStatus: async(
      address: string,
    ): Promise<{
        stakeInfo: StakeInfo
        isStaked: boolean
      }> => {
      return await reputationManager.getStakeStatus(address)
    }
  }
}