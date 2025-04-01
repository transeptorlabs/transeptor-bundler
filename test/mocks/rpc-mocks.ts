import {
  HandlerRegistry,
  EthAPI,
  Web3API,
  DebugAPI,
  StakeInfo,
} from '../../src/types/index.js'
import { Either } from '../../src/monad/either.js'
import { MockedObject, vi } from 'vitest'

export const mockEth: MockedObject<EthAPI> = {
  getChainId: vi.fn().mockResolvedValue(1),
  getSupportedEntryPoints: vi
    .fn()
    .mockResolvedValue(['0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789']),
  sendUserOperation: vi.fn().mockResolvedValue(Either.Right('0x456')),
  estimateUserOperationGas: vi.fn().mockResolvedValue(
    Either.Right({
      callGasLimit: '0x1',
      preVerificationGas: '0x2',
      verificationGasLimit: '0x3',
    }),
  ),
  getUserOperationReceipt: vi
    .fn()
    .mockResolvedValue(Either.Right({ success: true, receipt: {} })),
  getUserOperationByHash: vi.fn().mockResolvedValue(
    Either.Right({
      userOperation: {},
      entryPoint: '0x123',
    }),
  ),
}

export const mockWeb3: MockedObject<Web3API> = {
  clientVersion: vi.fn().mockResolvedValue('transeptor-bundler/1.0.0'),
}

export const mockDebug: MockedObject<DebugAPI> = {
  clearState: vi.fn().mockResolvedValue('ok'),
  dumpMempool: vi.fn().mockResolvedValue([]),
  clearMempool: vi.fn().mockResolvedValue('ok'),
  sendBundleNow: vi.fn().mockResolvedValue({
    transactionHash: '0x123',
    userOpHashes: [],
  }),
  setBundlingMode: vi.fn().mockResolvedValue('ok'),
  setBundleInterval: vi.fn().mockResolvedValue('ok'),
  setReputation: vi.fn().mockResolvedValue('ok'),
  dumpReputation: vi.fn().mockResolvedValue([]),
  clearReputation: vi.fn().mockResolvedValue('ok'),
  addUserOps: vi.fn().mockResolvedValue('ok'),
  getStakeStatus: vi.fn().mockResolvedValue({
    stakeInfo: {
      addr: '0x123',
      stake: BigInt(1000),
      unstakeDelaySec: 1000,
    } as StakeInfo,
    isStaked: true,
  }),
  setGasConfig: vi.fn().mockResolvedValue('ok'),
}

export const MockHandlerRegistry: MockedObject<HandlerRegistry> = {
  web3_clientVersion: {
    validationFunc: vi
      .fn()
      .mockImplementation((params: any[]) => params.length === 0),
    handlerFunc: vi.fn().mockResolvedValue('transeptor-bundler/1.0.0'),
  },
  eth_chainId: {
    validationFunc: vi
      .fn()
      .mockImplementation((params: any[]) => params.length === 0),
    handlerFunc: vi.fn().mockResolvedValue(1),
  },
  eth_supportedEntryPoints: {
    validationFunc: vi
      .fn()
      .mockImplementation((params: any[]) => params.length === 0),
    handlerFunc: vi
      .fn()
      .mockResolvedValue(['0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789']),
  },
  eth_sendUserOperation: {
    validationFunc: vi
      .fn()
      .mockImplementation((params: any[]) => params.length === 2),
    handlerFunc: vi.fn().mockResolvedValue('0x456'),
  },
  eth_estimateUserOperationGas: {
    validationFunc: vi
      .fn()
      .mockImplementation((params: any[]) => params.length >= 2),
    handlerFunc: vi.fn().mockResolvedValue({
      callGasLimit: '0x1',
      preVerificationGas: '0x2',
      verificationGasLimit: '0x3',
    }),
  },
  eth_getUserOperationReceipt: {
    validationFunc: vi
      .fn()
      .mockImplementation((params: any[]) => params.length === 1),
    handlerFunc: vi.fn().mockResolvedValue({ success: true, receipt: {} }),
  },
  eth_getUserOperationByHash: {
    validationFunc: vi
      .fn()
      .mockImplementation((params: any[]) => params.length === 1),
    handlerFunc: vi
      .fn()
      .mockResolvedValue({ userOperation: {}, entryPoint: '0x123' }),
  },
  debug_bundler_clearState: {
    validationFunc: vi
      .fn()
      .mockImplementation((params: any[]) => params.length === 0),
    handlerFunc: vi.fn().mockResolvedValue('ok'),
  },
  debug_bundler_dumpMempool: {
    validationFunc: vi
      .fn()
      .mockImplementation((params: any[]) => params.length === 1),
    handlerFunc: vi.fn().mockResolvedValue([]),
  },
  debug_bundler_clearMempool: {
    validationFunc: vi
      .fn()
      .mockImplementation((params: any[]) => params.length === 0),
    handlerFunc: vi.fn().mockResolvedValue('ok'),
  },
  debug_bundler_sendBundleNow: {
    validationFunc: vi
      .fn()
      .mockImplementation((params: any[]) => params.length === 0),
    handlerFunc: vi
      .fn()
      .mockResolvedValue({ transactionHash: '0x123', userOpHashes: [] }),
  },
  debug_bundler_setBundlingMode: {
    validationFunc: vi
      .fn()
      .mockImplementation((params: any[]) => params.length === 1),
    handlerFunc: vi.fn().mockResolvedValue('ok'),
  },
  debug_bundler_setBundleInterval: {
    validationFunc: vi
      .fn()
      .mockImplementation((params: any[]) => params.length === 0),
    handlerFunc: vi.fn().mockResolvedValue('ok'),
  },
  debug_bundler_setReputation: {
    validationFunc: vi
      .fn()
      .mockImplementation((params: any[]) => params.length === 2),
    handlerFunc: vi.fn().mockResolvedValue('ok'),
  },
  debug_bundler_dumpReputation: {
    validationFunc: vi
      .fn()
      .mockImplementation((params: any[]) => params.length === 1),
    handlerFunc: vi.fn().mockResolvedValue([]),
  },
  debug_bundler_clearReputation: {
    validationFunc: vi
      .fn()
      .mockImplementation((params: any[]) => params.length === 0),
    handlerFunc: vi.fn().mockResolvedValue('ok'),
  },
  debug_bundler_addUserOps: {
    validationFunc: vi
      .fn()
      .mockImplementation((params: any[]) => params.length === 1),
    handlerFunc: vi.fn().mockResolvedValue('ok'),
  },
  debug_bundler_getStakeStatus: {
    validationFunc: vi
      .fn()
      .mockImplementation((params: any[]) => params.length === 2),
    handlerFunc: vi.fn().mockResolvedValue({
      stakeInfo: {
        addr: '0x123',
        stake: BigInt(1000),
        unstakeDelaySec: 1000,
      } as StakeInfo,
      isStaked: true,
    }),
  },
  debug_bundler_setConfiguration: {
    validationFunc: vi
      .fn()
      .mockImplementation((params: any[]) => params.length === 1),
    handlerFunc: vi.fn().mockResolvedValue('ok'),
  },
}
