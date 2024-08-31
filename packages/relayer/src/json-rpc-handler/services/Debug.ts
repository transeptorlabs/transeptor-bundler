import { packUserOp } from '../../../../shared/utils/index.js'
import { BundleManager } from '../../bundle/index.js'
import { EventsManager } from '../../event/index.js'
import { MempoolManager } from '../../mempool/index.js'
import { ReputationManager } from '../../reputation/index.js'
import { ReputationEntry, SendBundleReturn, StakeInfo, UserOperation } from '../../../../shared/types/index.js'
import { ethers, BigNumber } from 'ethers'

export class DebugAPI {
  private readonly entryPointContract: ethers.Contract
  private readonly bundleManager: BundleManager
  private readonly reputationManager: ReputationManager
  private readonly mempoolManager: MempoolManager
  private readonly eventsManager: EventsManager

  constructor(
    bundleManager: BundleManager,
    reputationManager: ReputationManager,
    mempoolManager: MempoolManager,
    eventsManager: EventsManager,
    entryPointContract: ethers.Contract,
  ) {
    this.bundleManager = bundleManager
    this.reputationManager = reputationManager
    this.mempoolManager = mempoolManager
    this.eventsManager = eventsManager
    this.entryPointContract = entryPointContract
  }

  async clearState(): Promise<void> {
    await this.mempoolManager.clearState()
    this.reputationManager.clearState()
  }

  dumpMempool() {
    return this.mempoolManager.dump()
  }

  async clearMempool(): Promise<void> {
    await this.mempoolManager.clearState()
  }

  setBundlingMode(mode: string): boolean {
    if (mode !== 'auto' && mode !== 'manual') {
      throw new Error('Invalid bundling mode')
    }
    this.bundleManager.setBundlingMode(mode)
    return true
  }

  async sendBundleNow(): Promise<SendBundleReturn> {
    const result = await this.bundleManager.doAttemptAutoBundle(true)
    await this.eventsManager.handlePastEvents()
    return result
  }

  async setReputation(param: any): Promise<ReputationEntry[]> {
    return this.reputationManager.setReputation(param)
  }

  async addUserOps(userOps: UserOperation[]) {
    for (const userOp of userOps) {
      const userOpHash = await this.entryPointContract.getUserOpHash(packUserOp(userOp))
      await this.mempoolManager.addUserOp(userOp, userOpHash, BigNumber.from(0), null, null)
    }
  }

  dumpReputation(): ReputationEntry[] {
    return this.reputationManager.dump()
  }

  clearReputation (): void {
    this.reputationManager.clearState()
  }

  async getStakeStatus (
    address: string,
    entryPoint: string
  ): Promise<{
      stakeInfo: StakeInfo
      isStaked: boolean
    }> {
    return await this.reputationManager.getStakeStatus(address, entryPoint)
  }
}