import { Config } from '../../config'
import { MempoolManager } from '../../mempool'
import { UserOperation } from '../../types'

export class EthAPI {
  constructor () {
    // 
  }

  async sendUserOperation(userOp: UserOperation, supportedEntryPoints: string) {
    return await MempoolManager.addUserOp('userOpHash', userOp)
  }

  getSupportedEntryPoints (): string[] {
    return [Config.entryPointAddr]
  }
}

