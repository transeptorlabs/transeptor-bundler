import ExecutionManager from '../../ExecutionManager'
import MempoolManager from '../../MempoolManager'

export class DebugAPI {
  constructor () {
    // 
  }

  dumpMempool() {
    return MempoolManager.dump()
  }

  setBundlingMode(mode: string): boolean {
    if (mode !== 'auto' && mode !== 'manual') {
      throw new Error('Invalid bundling mode')
    }
    ExecutionManager.setBundlingMode(mode)
    return true
  }

  async sendBundleNow(): Promise<string> {
    return await ExecutionManager.forceSendBundle()
  }
    

  async clearState(): Promise<void> {
    return await MempoolManager.clearState()
  }
}