import { StorageMap } from './validation.types.js'

export type CallFrameType =
  | 'CALL'
  | 'DELEGATECALL'
  | 'CALLCODE'
  | 'STATICCALL'
  | 'CREATE'
  | 'CREATE2'

export type ContractSize = {
  contractSize: number
  opcode: number
}

export type AccessedSlots = {
  reads?: Record<string, string[]>
  transientReads?: Record<string, unknown>
  transientWrites?: Record<string, unknown>
  writes?: Record<string, number>
}

export type ERC7562Call = {
  accessedSlots: AccessedSlots
  contractSize: Record<string, ContractSize>
  error?: string
  extCodeAccessInfo: string[]
  from: string
  gas: string
  gasUsed: string
  input: string
  outOfGas: boolean
  output?: string
  to: string
  type: CallFrameType
  usedOpcodes: Record<number, number>
  value?: string
  calls: ERC7562Call[]
  keccak?: string[]
}

export type ERC7562ValidationResults = {
  storageMap: StorageMap
  ruleViolations: any[]
  contractAddresses: string[]
}
