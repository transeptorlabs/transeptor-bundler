import { ethers } from 'ethers'
import { MempoolManager } from '../../mempool'
import { UserOperation } from '../../types'

export class EthAPI {
  private readonly mempoolManager: MempoolManager
  private readonly entryPointContract: ethers.Contract
  
  constructor (mempoolManager: MempoolManager, entryPointContract: ethers.Contract) {
    this.mempoolManager = mempoolManager
    this.entryPointContract = entryPointContract
  }

  async sendUserOperation(userOp: UserOperation, supportedEntryPoints: string) {
    await this.mempoolManager.addUserOp('userOpHash', userOp, {
      addresses: [],
      hash: ''
    })
    return 'userOpHash'
  }

  getSupportedEntryPoints (): string[] {
    return [this.entryPointContract.address]
  }
}

