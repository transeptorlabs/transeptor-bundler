import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  mockUserOperationFactory,
  mockBuildRelayUserOpParam,
  mockEntryPointGetUserOpHash,
  createTestStateCapability,
} from './test-helpers.js'
import { createState } from '../src/state/index.js'
import { createMempoolManagerCore } from '../src/mempool/mempool-manager.js'
import {
  mockReputationManager,
  mockDepositManager,
  mockLogger,
  mockCapabilityVerifier,
} from './mocks/index.js'
import { MempoolManagerCore, StateKey } from '../src/types/index.js'

describe('MempoolManagerCore', () => {
  let mempoolManager: MempoolManagerCore
  const MOCK_BUNDLE_SIZE = 5

  beforeEach(() => {
    vi.clearAllMocks()
    mempoolManager = createMempoolManagerCore({
      state: createState({
        logger: mockLogger,
        capabilityVerifier: mockCapabilityVerifier,
      }),
      reputationManager: mockReputationManager,
      depositManager: mockDepositManager,
      bundleSize: MOCK_BUNDLE_SIZE,
      logger: mockLogger,
      stateCapability: createTestStateCapability('test', [
        StateKey.MempoolEntryCount,
        StateKey.StandardPool,
      ]),
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should addUserOp and findByHash correctly', async () => {
    mockCapabilityVerifier.verifyStateCapability.mockResolvedValue(true)

    const userOp1 = mockUserOperationFactory('x0001', true, 1)
    const userOp2 = mockUserOperationFactory('x0002', true, 1)
    const userOp3 = mockUserOperationFactory('x0003', true, 1)

    const userOpHash1 = mockEntryPointGetUserOpHash(userOp1)
    const userOpHash2 = mockEntryPointGetUserOpHash(userOp2)
    const userOpHash3 = mockEntryPointGetUserOpHash(userOp3)

    const relayUserOpParam1 = mockBuildRelayUserOpParam(
      'x0001',
      userOp1,
      userOpHash1,
    )

    const relayUserOpParam2 = mockBuildRelayUserOpParam(
      'x0002',
      userOp2,
      userOpHash2,
    )

    const relayUserOpParam3 = mockBuildRelayUserOpParam(
      'x0003',
      userOp3,
      userOpHash3,
    )

    await Promise.all([
      mempoolManager.addUserOp(relayUserOpParam1),
      mempoolManager.addUserOp(relayUserOpParam2),
      mempoolManager.addUserOp(relayUserOpParam3),
    ])

    const value1 = await mempoolManager.findByHash(userOpHash1)
    const value2 = await mempoolManager.findByHash(userOpHash2)
    const value3 = await mempoolManager.findByHash(userOpHash3)
    const mempoolSize = await mempoolManager.size()

    expect(mempoolSize).toEqual(3)
    expect(value1?.userOpHash).toEqual(relayUserOpParam1.userOpHash)
    expect(value2?.userOpHash).toEqual(relayUserOpParam2.userOpHash)
    expect(value3?.userOpHash).toEqual(relayUserOpParam3.userOpHash)
  })

  it('should remove removeUserOp correctly', async () => {
    mockCapabilityVerifier.verifyStateCapability.mockResolvedValue(true)

    const userOp1 = mockUserOperationFactory('x0004', true, 1)
    const userOp2 = mockUserOperationFactory('x0005', true, 1)
    const userOp3 = mockUserOperationFactory('x0006', true, 1)

    const userOpHash1 = mockEntryPointGetUserOpHash(userOp1)
    const userOpHash2 = mockEntryPointGetUserOpHash(userOp2)
    const userOpHash3 = mockEntryPointGetUserOpHash(userOp3)

    const relayUserOpParam1 = mockBuildRelayUserOpParam(
      'x0004',
      userOp1,
      userOpHash1,
    )

    const relayUserOpParam2 = mockBuildRelayUserOpParam(
      'x0005',
      userOp2,
      userOpHash2,
    )

    const relayUserOpParam3 = mockBuildRelayUserOpParam(
      'x0006',
      userOp3,
      userOpHash3,
    )

    await Promise.all([
      mempoolManager.addUserOp(relayUserOpParam1),
      mempoolManager.addUserOp(relayUserOpParam2),
      mempoolManager.addUserOp(relayUserOpParam3),
    ])
    let mempoolSize = await mempoolManager.size()
    expect(mempoolSize).toEqual(3)

    const removed1 = await mempoolManager.removeUserOp(userOpHash1)
    const removed2 = await mempoolManager.removeUserOp(userOpHash2)
    const removed3 = await mempoolManager.removeUserOp(userOpHash3)
    const notRemoved = await mempoolManager.removeUserOp('key4')

    mempoolSize = await mempoolManager.size()
    expect(mempoolSize).toEqual(0)

    expect(removed1).toEqual(true)
    expect(removed2).toEqual(true)
    expect(removed3).toEqual(true)
    expect(notRemoved).toEqual(false)
  })

  it('should getNextPending using pending userOps using bundleSize', async () => {
    mockCapabilityVerifier.verifyStateCapability.mockResolvedValue(true)

    const userOp1 = mockUserOperationFactory('x0001', true, 1)
    const userOp2 = mockUserOperationFactory('x0002', true, 1)
    const userOp3 = mockUserOperationFactory('x0003', true, 1)
    const userOp4 = mockUserOperationFactory('x0004', true, 1)
    const userOp5 = mockUserOperationFactory('x0005', true, 1)
    const userOp6 = mockUserOperationFactory('x0006', true, 1)

    const userOpHash1 = mockEntryPointGetUserOpHash(userOp1)
    const userOpHash2 = mockEntryPointGetUserOpHash(userOp2)
    const userOpHash3 = mockEntryPointGetUserOpHash(userOp3)
    const userOpHash4 = mockEntryPointGetUserOpHash(userOp4)
    const userOpHash5 = mockEntryPointGetUserOpHash(userOp5)
    const userOpHash6 = mockEntryPointGetUserOpHash(userOp6)

    const relayUserOpParam1 = mockBuildRelayUserOpParam(
      'x0001',
      userOp1,
      userOpHash1,
    )

    const relayUserOpParam2 = mockBuildRelayUserOpParam(
      'x0002',
      userOp2,
      userOpHash2,
    )

    const relayUserOpParam3 = mockBuildRelayUserOpParam(
      'x0003',
      userOp3,
      userOpHash3,
    )

    const relayUserOpParam4 = mockBuildRelayUserOpParam(
      'x0004',
      userOp4,
      userOpHash4,
    )

    const relayUserOpParam5 = mockBuildRelayUserOpParam(
      'x0005',
      userOp5,
      userOpHash5,
    )

    const relayUserOpParam6 = mockBuildRelayUserOpParam(
      'x0006',
      userOp6,
      userOpHash6,
    )

    await Promise.all([
      mempoolManager.addUserOp(relayUserOpParam1),
      mempoolManager.addUserOp(relayUserOpParam2),
      mempoolManager.addUserOp(relayUserOpParam3),
      mempoolManager.addUserOp(relayUserOpParam4),
      mempoolManager.addUserOp(relayUserOpParam5),
      mempoolManager.addUserOp(relayUserOpParam6),
    ])
    const mempoolSize = await mempoolManager.size()
    expect(mempoolSize).toEqual(6)

    const nextBundle = await mempoolManager.getNextPending()
    expect(nextBundle.length).toEqual(MOCK_BUNDLE_SIZE)

    // Check of the state in the mempool has been updated to 'bundling'
    const [value1, value2, value3, value4, value5] = await Promise.all([
      mempoolManager.findByHash(nextBundle[0].userOpHash),
      mempoolManager.findByHash(nextBundle[1].userOpHash),
      mempoolManager.findByHash(nextBundle[2].userOpHash),
      mempoolManager.findByHash(nextBundle[3].userOpHash),
      mempoolManager.findByHash(nextBundle[4].userOpHash),
    ])
    expect(value1?.status).toEqual('bundling')
    expect(value2?.status).toEqual('bundling')
    expect(value3?.status).toEqual('bundling')
    expect(value4?.status).toEqual('bundling')
    expect(value5?.status).toEqual('bundling')
  })

  it('should return all addresses that are currently known to be "senders" according to the current mempool', async () => {
    mockCapabilityVerifier.verifyStateCapability.mockResolvedValue(true)

    const userOp1 = mockUserOperationFactory('x0001', true, 1)
    const userOp2 = mockUserOperationFactory('x0002', true, 1)
    const userOp3 = mockUserOperationFactory('x0003', true, 1)

    const userOpHash1 = mockEntryPointGetUserOpHash(userOp1)
    const userOpHash2 = mockEntryPointGetUserOpHash(userOp2)
    const userOpHash3 = mockEntryPointGetUserOpHash(userOp3)

    const relayUserOpParam1 = mockBuildRelayUserOpParam(
      'x0001',
      userOp1,
      userOpHash1,
    )

    const relayUserOpParam2 = mockBuildRelayUserOpParam(
      'x0002',
      userOp2,
      userOpHash2,
    )

    const relayUserOpParam3 = mockBuildRelayUserOpParam(
      'x0003',
      userOp3,
      userOpHash3,
    )

    await Promise.all([
      mempoolManager.addUserOp(relayUserOpParam1),
      mempoolManager.addUserOp(relayUserOpParam2),
      mempoolManager.addUserOp(relayUserOpParam3),
    ])

    const knownSenders = await mempoolManager.getKnownSenders()
    expect(knownSenders.length).toEqual(3)
    expect(knownSenders).includes('x0001')
    expect(knownSenders).includes('x0002')
    expect(knownSenders).includes('x0003')
  })

  it('should return addresses that are currently known to be any kind of entity according to the current mempool excluding "sender"', async () => {
    mockCapabilityVerifier.verifyStateCapability.mockResolvedValue(true)

    const userOp1 = mockUserOperationFactory('x0001', false, 1)
    const userOp2 = mockUserOperationFactory('x0002', false, 1)
    const userOp3 = mockUserOperationFactory('x0003', false, 1, {
      paymaster: 'x000_mock_paymaster',
      paymasterData: '0x',
      paymasterPostOpGasLimit: BigInt('1'),
    })

    const userOpHash1 = mockEntryPointGetUserOpHash(userOp1)
    const userOpHash2 = mockEntryPointGetUserOpHash(userOp2)
    const userOpHash3 = mockEntryPointGetUserOpHash(userOp3)

    const relayUserOpParam1 = mockBuildRelayUserOpParam(
      'x0001',
      userOp1,
      userOpHash1,
    )

    const relayUserOpParam2 = mockBuildRelayUserOpParam(
      'x0002',
      userOp2,
      userOpHash2,
    )

    const relayUserOpParam3 = mockBuildRelayUserOpParam(
      'x0003',
      userOp3,
      userOpHash3,
    )

    await Promise.all([
      mempoolManager.addUserOp(relayUserOpParam1),
      mempoolManager.addUserOp(relayUserOpParam2),
      mempoolManager.addUserOp(relayUserOpParam3),
    ])

    const knownEntities = await mempoolManager.getKnownEntities()
    expect(knownEntities.length).toEqual(1)
    expect(knownEntities).toEqual(['x000_mock_paymaster'])
  })
})
