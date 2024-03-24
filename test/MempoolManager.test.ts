import {
  mockUserOperationFactory,
  mockEntryPointGetUserOpHash,
} from './test-helpers'
import { MempoolManager } from '../src/mempool'
import { ReputationManager } from '../src/reputation'
import { BigNumber } from 'ethers/lib/ethers'

describe('MempoolManager', () => {
  let mempoolManager: MempoolManager
  let rm: ReputationManager

  beforeEach(() => {
    rm = new ReputationManager(BigNumber.from('1'), 84600)
    mempoolManager = new MempoolManager(rm, 5)
  })

  it('should addUserOp and findByHash correctly', async () => {
    const userOp1 = mockUserOperationFactory('x0001', 1)
    const userOp2 = mockUserOperationFactory('x0002', 1)
    const userOp3 = mockUserOperationFactory('x0003', 1)

    const userOpHash1 =  mockEntryPointGetUserOpHash(userOp1)
    const userOpHash2 =  mockEntryPointGetUserOpHash(userOp2)
    const userOpHash3 =  mockEntryPointGetUserOpHash(userOp3)

    const mempoolEntry1 = {
      userOp: userOp1,
      userOpHash: userOpHash1,
      referencedContracts: {
        addresses: [],
        hash: ''
      },
      status: 'pending',
    }
    const mempoolEntry2 = {
      userOp: userOp2,
      userOpHash: userOpHash2,
      referencedContracts: {
        addresses: [],
        hash: ''
      },
      status: 'pending',
    }
    const mempoolEntry3 = {
      userOp: userOp3,
      userOpHash: userOpHash3,
      referencedContracts: {
        addresses: [],
        hash: ''
      },
      status: 'pending',
    }

    await mempoolManager.addUserOp(userOp1, userOpHash1,
      {
        addr: 'x0001',
        stake: BigNumber.from('1'),
        unstakeDelaySec: BigNumber.from('8600')
      },
      {
        addresses: [],
        hash: ''
      },
    )
    await mempoolManager.addUserOp(userOp2, userOpHash2,
      {
        addr: 'x0002',
        stake: BigNumber.from('1'),
        unstakeDelaySec: BigNumber.from('8600')
      },
      {
        addresses: [],
        hash: ''
      },
    )
    await mempoolManager.addUserOp(userOp3, userOpHash3,
      {
        addr: 'x0003',
        stake: BigNumber.from('1'),
        unstakeDelaySec: BigNumber.from('8600')
      },
      {
        addresses: [],
        hash: ''
      }
    )

    const value1 = await mempoolManager.findByHash(userOpHash1)
    const value2 = await mempoolManager.findByHash(userOpHash2)
    const value3 = await mempoolManager.findByHash(userOpHash3)

    expect(value1?.userOpHash).toEqual(mempoolEntry1.userOpHash)
    expect(value2?.userOpHash).toEqual(mempoolEntry2.userOpHash)
    expect(value3?.userOpHash).toEqual(mempoolEntry3.userOpHash)
  })

  it('should remove removeUserOp correctly', async () => {
    const userOp1 = mockUserOperationFactory('x0001', 1)
    const userOp2 = mockUserOperationFactory('x0002', 1)
    const userOp3 = mockUserOperationFactory('x0003', 1)

    const userOpHash1 =  mockEntryPointGetUserOpHash(userOp1)
    const userOpHash2 =  mockEntryPointGetUserOpHash(userOp2)
    const userOpHash3 =  mockEntryPointGetUserOpHash(userOp3)

    await mempoolManager.addUserOp(userOp1, userOpHash1,
      {
        addr: 'x0001',
        stake: BigNumber.from('1'),
        unstakeDelaySec: BigNumber.from('8600')
      },
      {
        addresses: [],
        hash: ''
      }
    )
    await mempoolManager.addUserOp(userOp2, userOpHash2,
      {
        addr: 'x0002',
        stake: BigNumber.from('1'),
        unstakeDelaySec: BigNumber.from('8600')
      },
      {
        addresses: [],
        hash: ''
      }
    )
    await mempoolManager.addUserOp(userOp3, userOpHash3,
      {
        addr: 'x0003',
        stake: BigNumber.from('1'),
        unstakeDelaySec: BigNumber.from('8600')
      },
      {
        addresses: [],
        hash: ''
      }
    )

    const removed1 = await mempoolManager.removeUserOp(userOpHash1)
    const removed2 = await mempoolManager.removeUserOp(userOpHash2)
    const removed3 = await mempoolManager.removeUserOp(userOpHash3)
    const notRemoved = await mempoolManager.removeUserOp('key4')

    expect(removed1).toEqual(true)
    expect(removed2).toEqual(true)
    expect(removed3).toEqual(true)
    expect(notRemoved).toEqual(false)
  })

  it('should createNextUserOpBundle(FIFO) correctly', async () => {
    const userOp1 = mockUserOperationFactory('x0001', 1)
    const userOp2 = mockUserOperationFactory('x0002', 1)
    const userOp3 = mockUserOperationFactory('x0003', 1)
    const userOp4 = mockUserOperationFactory('x0004', 1)
    const userOp5 = mockUserOperationFactory('x0005', 1)
    const userOp6 = mockUserOperationFactory('x0006', 1)

    const userOpHash1 =  mockEntryPointGetUserOpHash(userOp1)
    const userOpHash2 =  mockEntryPointGetUserOpHash(userOp2)
    const userOpHash3 =  mockEntryPointGetUserOpHash(userOp3)
    const userOpHash4 =  mockEntryPointGetUserOpHash(userOp4)
    const userOpHash5 =  mockEntryPointGetUserOpHash(userOp5)
    const userOpHash6 =  mockEntryPointGetUserOpHash(userOp6)

    await mempoolManager.addUserOp(userOp1, userOpHash1,
      {
        addr: 'x0001',
        stake: BigNumber.from('1'),
        unstakeDelaySec: BigNumber.from('8600')
      },
      {
        addresses: [],
        hash: ''
      }
    )
    await mempoolManager.addUserOp(userOp2, userOpHash2,
      {
        addr: 'x0002',
        stake: BigNumber.from('1'),
        unstakeDelaySec: BigNumber.from('8600')
      },
      {
        addresses: [],
        hash: ''
      }
    )
    await mempoolManager.addUserOp(userOp3, userOpHash3,
      {
        addr: 'x0003',
        stake: BigNumber.from('1'),
        unstakeDelaySec: BigNumber.from('8600')
      },
      {
        addresses: [],
        hash: ''
      }
    )
    await mempoolManager.addUserOp(userOp4, userOpHash4,
      {
        addr: 'x0004',
        stake: BigNumber.from('1'),
        unstakeDelaySec: BigNumber.from('8600')
      },
      {
        addresses: [],
        hash: ''
      }
    )
    await mempoolManager.addUserOp(userOp5, userOpHash5,
      {
        addr: 'x0005',
        stake: BigNumber.from('1'),
        unstakeDelaySec: BigNumber.from('8600')
      },
      {
        addresses: [],
        hash: ''
      }
    )
    await mempoolManager.addUserOp(userOp6, userOpHash6,
      {
        addr: 'x0006',
        stake: BigNumber.from('1'),
        unstakeDelaySec: BigNumber.from('8600')
      },
      {
        addresses: [],
        hash: ''
      }
    )

    const nextBundle = await mempoolManager.getNextPending()

    expect(nextBundle.length).toEqual(5)
    expect(nextBundle[0].status).toEqual('bundling')
    expect(nextBundle[1].status).toEqual('bundling')
    expect(nextBundle[2].status).toEqual('bundling')
    expect(nextBundle[3].status).toEqual('bundling')
    expect(nextBundle[4].status).toEqual('bundling')
  })

  it('should return correct size of the mempool', async () => {
    const userOp1 = mockUserOperationFactory('x0001', 1)
    const userOp2 = mockUserOperationFactory('x0002', 1)
    const userOp3 = mockUserOperationFactory('x0003', 1)

    const userOpHash1 =  mockEntryPointGetUserOpHash(userOp1)
    const userOpHash2 =  mockEntryPointGetUserOpHash(userOp2)
    const userOpHash3 =  mockEntryPointGetUserOpHash(userOp3)

    await mempoolManager.addUserOp(userOp1, userOpHash1,
      {
        addr: 'x0001',
        stake: BigNumber.from('1'),
        unstakeDelaySec: BigNumber.from('8600')
      },
      {
        addresses: [],
        hash: ''
      }
    )
    await mempoolManager.addUserOp(userOp2, userOpHash2,
      {
        addr: 'x0002',
        stake: BigNumber.from('1'),
        unstakeDelaySec: BigNumber.from('8600')
      },
      {
        addresses: [],
        hash: ''
      }
    )
    await mempoolManager.addUserOp(userOp3, userOpHash3,
      {
        addr: 'x0003',
        stake: BigNumber.from('1'),
        unstakeDelaySec: BigNumber.from('8600')
      },
      {
        addresses: [],
        hash: ''
      }
    )

    const size1 = mempoolManager.size()

    await mempoolManager.removeUserOp(userOpHash2)

    const size2 = mempoolManager.size()

    expect(size1).toEqual(3)
    expect(size2).toEqual(2)
  })
})