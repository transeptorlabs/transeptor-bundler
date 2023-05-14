import { Config } from "../src/modules/Config"
import { MempoolManager } from "../src/modules/MempoolManager"
import {
  mockUserOperationFactory,
  mockEntryPointGetUserOpHash,
} from "../utils/test-helpers"
Config.getInstance({})

describe("MempoolManager", () => {
  let mempoolManager: MempoolManager = MempoolManager.getInstance()

  beforeEach(() => {
    MempoolManager.getInstance().resetInstance()
    mempoolManager = MempoolManager.getInstance()
  })

  test("should addUserOp and findByHash correctly", async () => {
    const userOp1 = mockUserOperationFactory("x0001", 1)
    const userOp2 = mockUserOperationFactory("x0002", 1)
    const userOp3 = mockUserOperationFactory("x0003", 1)

    const userOpHash1 =  mockEntryPointGetUserOpHash(userOp1)
    const userOpHash2 =  mockEntryPointGetUserOpHash(userOp2)
    const userOpHash3 =  mockEntryPointGetUserOpHash(userOp3)

    const mempoolEntry1 = {
      userOp: userOp1,
      userOpHash: userOpHash1,
    }
    const mempoolEntry2 = {
      userOp: userOp2,
      userOpHash: userOpHash2,
    }
    const mempoolEntry3 = {
      userOp: userOp3,
      userOpHash: userOpHash3,
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

  test("should remove removeUserOp correctly", async () => {
    const userOp1 = mockUserOperationFactory("x0001", 1)
    const userOp2 = mockUserOperationFactory("x0002", 1)
    const userOp3 = mockUserOperationFactory("x0003", 1)

    const userOpHash1 =  mockEntryPointGetUserOpHash(userOp1)
    const userOpHash2 =  mockEntryPointGetUserOpHash(userOp2)
    const userOpHash3 =  mockEntryPointGetUserOpHash(userOp3)

    await mempoolManager.addUserOp(userOpHash1 ,userOp1)
    await mempoolManager.addUserOp(userOpHash2 ,userOp2)
    await mempoolManager.addUserOp(userOpHash3 ,userOp3)

    const removed1 = await mempoolManager.removeUserOp(userOpHash1)
    const removed2 = await mempoolManager.removeUserOp(userOpHash2)
    const removed3 = await mempoolManager.removeUserOp(userOpHash3)
    const notRemoved = await mempoolManager.removeUserOp("key4")

    expect(removed1).toBe(true)
    expect(removed2).toBe(true)
    expect(removed3).toBe(true)
    expect(notRemoved).toBe(false)
  })

  test("should createNextUserOpBundle(FIFO) correctly", async () => {
    const userOp1 = mockUserOperationFactory("x0001", 1)
    const userOp2 = mockUserOperationFactory("x0002", 1)
    const userOp3 = mockUserOperationFactory("x0003", 1)
    const userOp4 = mockUserOperationFactory("x0004", 1)
    const userOp5 = mockUserOperationFactory("x0005", 1)
    const userOp6 = mockUserOperationFactory("x0006", 1)

    const userOpHash1 =  mockEntryPointGetUserOpHash(userOp1)
    const userOpHash2 =  mockEntryPointGetUserOpHash(userOp2)
    const userOpHash3 =  mockEntryPointGetUserOpHash(userOp3)
    const userOpHash4 =  mockEntryPointGetUserOpHash(userOp4)
    const userOpHash5 =  mockEntryPointGetUserOpHash(userOp5)
    const userOpHash6 =  mockEntryPointGetUserOpHash(userOp6)

    const mempoolEntry1 = {
      userOp: userOp1,
      userOpHash: userOpHash1,
    }
    const mempoolEntry2 = {
      userOp: userOp2,
      userOpHash: userOpHash2,
    }
    const mempoolEntry3 = {
      userOp: userOp3,
      userOpHash: userOpHash3,
    }
    const mempoolEntry4 = {
      userOp: userOp4,
      userOpHash: userOpHash4,
    }
    const mempoolEntry5 = {
      userOp: userOp5,
      userOpHash: userOpHash5,
    }

    await mempoolManager.addUserOp(userOpHash1 ,userOp1)
    await mempoolManager.addUserOp(userOpHash2 ,userOp2)
    await mempoolManager.addUserOp(userOpHash3 ,userOp3)
    await mempoolManager.addUserOp(userOpHash4 ,userOp4)
    await mempoolManager.addUserOp(userOpHash5 ,userOp5)
    await mempoolManager.addUserOp(userOpHash6 ,userOp6)

    const removedItems = await mempoolManager.createNextUserOpBundle()

    expect(removedItems.length).toBe(5)
    expect(removedItems).toContainEqual([userOpHash1, mempoolEntry1])
    expect(removedItems).toContainEqual([userOpHash2, mempoolEntry2])
    expect(removedItems).toContainEqual([userOpHash3, mempoolEntry3])
    expect(removedItems).toContainEqual([userOpHash4, mempoolEntry4])
    expect(removedItems).toContainEqual([userOpHash5, mempoolEntry5])
  })

  test("should return correct size of the mempool", async () => {
    const userOp1 = mockUserOperationFactory("x0001", 1)
    const userOp2 = mockUserOperationFactory("x0002", 1)
    const userOp3 = mockUserOperationFactory("x0003", 1)

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