import { vi, MockedObject } from 'vitest'
import { Contract, JsonRpcProvider } from 'ethers'

const mockProvider = new JsonRpcProvider('http://localhost:8545')
const mockEpAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3'

export const mockEntryPointContract: MockedObject<Contract> = {
  getUserOpHash: vi.fn(),
  interface: {
    parseTransaction: vi.fn(),
  },
  provider: mockProvider,
  address: mockEpAddress,
} as unknown as MockedObject<Contract>

export const mockEntryPoint = {
  contract: mockEntryPointContract,
  address: mockEpAddress,
}
