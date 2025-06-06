import { StorageMap, ValidationErrors } from './validation.types.js'

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

export enum ERC7562Rule {
  op011 = 'OP-011',
  op012 = 'OP-012',
  op013 = 'OP-013',
  op020 = 'OP-020',
  op031 = 'OP-031',
  op041 = 'OP-041',
  op042 = 'OP-042',
  op051 = 'OP-051',
  op052 = 'OP-052',
  op053 = 'OP-053',
  op054 = 'OP-054',
  op061 = 'OP-061',
  op062 = 'OP-062',
  op070 = 'OP-070',
  op080 = 'OP-080',
  cod010 = 'COD-010',
  sto010 = 'STO-010',
  sto021 = 'STO-021',
  sto022 = 'STO-022',
  sto031 = 'STO-031',
  sto032 = 'STO-032',
  sto033 = 'STO-033',
  sto040 = 'STO-040',
  sto041 = 'STO-041',
  grep010 = 'GREP-010',
  grep020 = 'GREP-020',
  grep040 = 'GREP-040',
  grep050 = 'GREP-050',
  srep010 = 'SREP-010',
  srep040 = 'SREP-040',
  erep010 = 'EREP-010',
  erep015 = 'EREP-015',
  erep020 = 'EREP-020',
  erep030 = 'EREP-030',
  erep040 = 'EREP-040',
  erep050 = 'EREP-050',
}

export enum AccountAbstractionEntity {
  account = 'account',
  paymaster = 'paymaster',
  factory = 'factory',
  aggregator = 'aggregator',
  senderCreator = 'SenderCreator',
  entryPoint = 'EntryPoint',
  nativeEntryPoint = 'NativeEntryPoint',
  nativeNonceManager = 'NativeNonceManager',
  none = 'none',
}

export type ERC7562Violation = {
  rule: ERC7562Rule
  depth: number
  entity: AccountAbstractionEntity
  address: string
  delegatecallStorageAddress: string
  errorCode: ValidationErrors
  description: string
  callFrameType: CallFrameType
  conflict?: string
  opcode?: string
  value?: string
  slot?: string
}

export type ERC7562ValidationResults = {
  storageMap: StorageMap
  ruleViolations: any[]
  contractAddresses: string[]
}
