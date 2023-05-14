import { MempoolManager } from '../../MempoolManager'

export class DebugAPI {
  constructor () {
    // 
  }

  dumpMempool() {
    return MempoolManager.getInstance().dump()
  }

  async clearState() {
    return await MempoolManager.getInstance().clearState()
  }
}