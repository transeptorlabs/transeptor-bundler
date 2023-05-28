import { BundleManager } from '../../bundle'
import { MempoolManager } from '../../mempool'
import { ReputationManager } from '../../reputation'
import { ReputationEntry } from '../../types'

export class DebugAPI {
  private readonly bundleManager: BundleManager
  private readonly reputationManager: ReputationManager
  private readonly mempoolManager: MempoolManager

  constructor (bundleManager: BundleManager, reputationManager: ReputationManager, mempoolManager: MempoolManager) {
    this.bundleManager = bundleManager
    this.reputationManager = reputationManager
    this.mempoolManager = mempoolManager
  }

  async clearState(): Promise<void> {
    await this.mempoolManager.clearState()
    this.reputationManager.clearState()
  }
  
  dumpMempool() {
    return this.mempoolManager.dump()
  }

  setBundlingMode(mode: string): boolean {
    if (mode !== 'auto' && mode !== 'manual') {
      throw new Error('Invalid bundling mode')
    }
    this.bundleManager.setBundlingMode(mode)
    return true
  }

  async sendBundleNow(): Promise<string> {
    return await this.bundleManager.forceSendBundle()
  }

  async setReputation(param: any[]): Promise<ReputationEntry[]> {
    return this.reputationManager.setReputation(param)
  }

  dumpReputation (): ReputationEntry[] {
    return this.reputationManager.dump()
  }
}