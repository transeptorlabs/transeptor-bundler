import { vi, MockedObject } from 'vitest'
import { Contract, Interface, JsonRpcProvider } from 'ethers'
import { IENTRY_POINT_ABI } from '../../src/abis/index.js'

const mockProvider = new JsonRpcProvider('http://localhost:8545')
const mockEpAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3'

export const mockEntryPointContract: MockedObject<Contract> = {
  getUserOpHash: vi.fn(),
  getDepositInfo: vi.fn(),
  interface: new Interface(IENTRY_POINT_ABI),
  provider: mockProvider,
  address: mockEpAddress,
} as unknown as MockedObject<Contract>

export const mockEntryPoint = {
  contract: mockEntryPointContract,
  address: mockEpAddress,
}
