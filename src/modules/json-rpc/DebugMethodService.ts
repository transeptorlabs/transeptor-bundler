import { MempoolManager } from "../MempoolManager"

export class DebugMethodService {
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