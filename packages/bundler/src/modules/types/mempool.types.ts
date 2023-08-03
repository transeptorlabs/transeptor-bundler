import { BigNumberish } from 'ethers'
import { UserOperation } from './userop.types'
import { ReferencedCodeHashes } from './validation.types'

export interface MempoolEntry {
    userOp: UserOperation;
    userOpHash: string;
    prefund: BigNumberish;
    referencedContracts: ReferencedCodeHashes;
    status: 'bundling' | 'pending';
    // aggregator, if one was found during simulation
    aggregator?: string
}