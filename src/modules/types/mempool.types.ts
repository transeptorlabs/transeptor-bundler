import { UserOperation } from './userop.types'
import { ReferencedCodeHashes } from './validation.types'

export interface MempoolEntry {
    userOp: UserOperation;
    userOpHash: string;
    referencedContracts: ReferencedCodeHashes;
    status: 'bundling' | 'idle';
}