import { MempoolManager } from '../src/modules/mempool'
import {
  mockUserOperationFactory,
  mockEntryPointGetUserOpHash,
} from './utils/test-helpers'

describe('MempoolManager', () => {
  const originalEnv = process.env

  process.env = {
    ...originalEnv,
    MNEMONIC: 'test '.repeat(11) + 'junk',
    BENEFICIARY: '0x0000000'
  }
  const mempoolManager = MempoolManager

  beforeEach(() => {
    mempoolManager.clearState()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  test('should addUserOp and findByHash correctly', async () => {
    const userOp1 = mockUserOperationFactory('x0001', 1)
    const userOp2 = mockUserOperationFactory('x0002', 1)
    const userOp3 = mockUserOperationFactory('x0003', 1)

    const userOpHash1 =  mockEntryPointGetUserOpHash(userOp1)
    const userOpHash2 =  mockEntryPointGetUserOpHash(userOp2)
    const userOpHash3 =  mockEntryPointGetUserOpHash(userOp3)

    const mempoolEntry1 = {
      userOp: userOp1,
      userOpHash: userOpHash1,
      status: 'idle',
    }
    const mempoolEntry2 = {
      userOp: userOp2,
      userOpHash: userOpHash2,
      status: 'idle',
    }
    const mempoolEntry3 = {
      userOp: userOp3,
      userOpHash: userOpHash3,
      status: 'idle',
    }

    await mempoolManager.addUserOp(userOpHash1 ,userOp1)
    await mempoolManager.addUserOp(userOpHash2 ,userOp2)
    await mempoolManager.addUserOp(userOpHash3 ,userOp3)

    const value1 = await mempoolManager.findByHash(userOpHash1)
    const value2 = await mempoolManager.findByHash(userOpHash2)
    const value3 = await mempoolManager.findByHash(userOpHash3)

    expect(value1).toStrictEqual(mempoolEntry1)
    expect(value2).toStrictEqual(mempoolEntry2)
    expect(value3).toStrictEqual(mempoolEntry3)
  })

  test('should remove removeUserOp correctly', async () => {
    const userOp1 = mockUserOperationFactory('x0001', 1)
    const userOp2 = mockUserOperationFactory('x0002', 1)
    const userOp3 = mockUserOperationFactory('x0003', 1)

    const userOpHash1 =  mockEntryPointGetUserOpHash(userOp1)
    const userOpHash2 =  mockEntryPointGetUserOpHash(userOp2)
    const userOpHash3 =  mockEntryPointGetUserOpHash(userOp3)

    await mempoolManager.addUserOp(userOpHash1 ,userOp1)
    await mempoolManager.addUserOp(userOpHash2 ,userOp2)
    await mempoolManager.addUserOp(userOpHash3 ,userOp3)

    const removed1 = await mempoolManager.removeUserOp(userOpHash1)
    const removed2 = await mempoolManager.removeUserOp(userOpHash2)
    const removed3 = await mempoolManager.removeUserOp(userOpHash3)
    const notRemoved = await mempoolManager.removeUserOp('key4')

    expect(removed1).toBe(true)
    expect(removed2).toBe(true)
    expect(removed3).toBe(true)
    expect(notRemoved).toBe(false)
  })

  test('should createNextUserOpBundle(FIFO) correctly', async () => {
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

    await mempoolManager.addUserOp(userOpHash1 ,userOp1)
    await mempoolManager.addUserOp(userOpHash2 ,userOp2)
    await mempoolManager.addUserOp(userOpHash3 ,userOp3)
    await mempoolManager.addUserOp(userOpHash4 ,userOp4)
    await mempoolManager.addUserOp(userOpHash5 ,userOp5)
    await mempoolManager.addUserOp(userOpHash6 ,userOp6)

    const nextBundle = await mempoolManager.createNextBundle()

    expect(nextBundle.length).toBe(5)
    expect(nextBundle[0].status).toBe('bundling')
    expect(nextBundle[1].status).toBe('bundling')
    expect(nextBundle[2].status).toBe('bundling')
    expect(nextBundle[3].status).toBe('bundling')
    expect(nextBundle[4].status).toBe('bundling')
  })

  test('should return correct size of the mempool', async () => {
    const userOp1 = mockUserOperationFactory('x0001', 1)
    const userOp2 = mockUserOperationFactory('x0002', 1)
    const userOp3 = mockUserOperationFactory('x0003', 1)

    const userOpHash1 =  mockEntryPointGetUserOpHash(userOp1)
    const userOpHash2 =  mockEntryPointGetUserOpHash(userOp2)
    const userOpHash3 =  mockEntryPointGetUserOpHash(userOp3)

    await mempoolManager.addUserOp(userOpHash1 ,userOp1)
    await mempoolManager.addUserOp(userOpHash2 ,userOp2)
    await mempoolManager.addUserOp(userOpHash3 ,userOp3)

    const size1 = mempoolManager.size()

    await mempoolManager.removeUserOp(userOpHash2)

    const size2 = mempoolManager.size()

    expect(size1).toBe(3)
    expect(size2).toBe(2)
  })
})