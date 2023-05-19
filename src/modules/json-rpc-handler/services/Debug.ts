import { BundleManager } from '../../bundle'
import { MempoolManager } from '../../mempool'
import { ReputationManager } from '../../reputation'
import { ReputationEntry } from '../../types'

export class DebugAPI {
  constructor () {
    // 
  }

  async clearState(): Promise<void> {
    await MempoolManager.clearState()
    ReputationManager.clearState()
  }
  
  dumpMempool() {
    return MempoolManager.dump()
  }

  setBundlingMode(mode: string): boolean {
    if (mode !== 'auto' && mode !== 'manual') {
      throw new Error('Invalid bundling mode')
    }
    BundleManager.setBundlingMode(mode)
    return true
  }

  async sendBundleNow(): Promise<string> {
    return await BundleManager.forceSendBundle()
  }

  async setReputation(param: any[]): Promise<ReputationEntry[]> {
    return ReputationManager.setReputation(param)
  }

  dumpReputation (): ReputationEntry[] {
    return ReputationManager.dump()
  }
}