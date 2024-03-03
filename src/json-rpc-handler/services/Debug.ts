import { BundleManager } from 'bundle'
import { EventsManager } from 'event'
import { MempoolManager } from 'mempool'
import { ReputationManager } from 'reputation'
import { ReputationEntry, SendBundleReturn } from 'types'

export class DebugAPI {
  private readonly bundleManager: BundleManager
  private readonly reputationManager: ReputationManager
  private readonly mempoolManager: MempoolManager
  private readonly eventsManager: EventsManager

  constructor(
    bundleManager: BundleManager,
    reputationManager: ReputationManager,
    mempoolManager: MempoolManager,
    eventsManager: EventsManager
  ) {
    this.bundleManager = bundleManager
    this.reputationManager = reputationManager
    this.mempoolManager = mempoolManager
    this.eventsManager = eventsManager
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

  async sendBundleNow(): Promise<SendBundleReturn> {
    const result = await this.bundleManager.doAttemptAutoBundle(true)
    await this.eventsManager.handlePastEvents()
    return result
  }

  async setReputation(param: any[]): Promise<ReputationEntry[]> {
    return this.reputationManager.setReputation(param)
  }

  dumpReputation(): ReputationEntry[] {
    return this.reputationManager.dump()
  }
}