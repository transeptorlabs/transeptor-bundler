import { UserOperation } from './userop.types'

export interface MempoolEntry {
    userOp: UserOperation;
    userOpHash: string;
}