import { MempoolManager } from '../../MempoolManager'
import { UserOperation } from '../../Types'

export class EthAPI {
  constructor () {
    // 
  }

  async sendUserOperation(userOp: UserOperation, supportedEntryPoints: string) {
    return await MempoolManager.getInstance().addUserOp('userOpHash', userOp)
  }
}

