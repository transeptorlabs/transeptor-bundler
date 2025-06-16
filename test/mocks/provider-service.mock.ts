import { vi, MockedObject } from 'vitest'
import { Either } from '../../src/monad/index.js'
import { ProviderService } from '../../src/provider/index.js'

export const mockProviderService: MockedObject<ProviderService> = {
  getNetwork: vi.fn(),
  checkContractDeployment: vi.fn(),
  clientVersion: vi.fn(),
  getChainId: vi.fn(),
  getBlockNumber: vi.fn(),
  getFeeData: vi.fn(),
  estimateGas: vi.fn(),
  send: vi.fn().mockResolvedValue(Either.Right({})),
  call: vi.fn(),
  debug_traceCall: vi.fn().mockResolvedValue(Either.Right({})),
  runContractScript: vi.fn(),
  getTransactionReceipt: vi.fn(),
  getSupportedNetworks: vi.fn(),
  sendTransactionToFlashbots: vi.fn(),
  getBalance: vi.fn(),
  getTransactionCount: vi.fn(),
  getCode: vi.fn(),
  getEntryPointContractDetails: vi.fn(),
  getStakeManagerContractDetails: vi.fn(),
  getBundlerSignerWallets: vi.fn(),
}
