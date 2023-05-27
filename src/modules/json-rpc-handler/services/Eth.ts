import { Config } from '../../config'
import { MempoolManager } from '../../mempool'
import { UserOperation } from '../../types'

export class EthAPI {
  constructor () {
    // 
  }

  async sendUserOperation(userOp: UserOperation, supportedEntryPoints: string) {
    await MempoolManager.addUserOp('userOpHash', userOp, {
      addresses: [],
      hash: ''
    })
    return 'userOpHash'
  }

  getSupportedEntryPoints (): string[] {
    return [Config.entryPointAddr]
  }
}

