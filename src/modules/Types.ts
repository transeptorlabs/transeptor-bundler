import type {BigNumberish, BytesLike } from 'ethers'

/* 
    types: https://docs.ethers.org/v5/api/utils/bignumber/
    Adding BigNumber:BigNumber.from('10').add(BigNumber.from('10')).toString()
*/
export type UserOperation = {
    sender: string;
    nonce: BigNumberish;
    initCode: BytesLike;
    callData: BytesLike;
    callGasLimit: BigNumberish;
    verificationGasLimit: BigNumberish;
    preVerificationGas: BigNumberish;
    maxFeePerGas: BigNumberish;
    maxPriorityFeePerGas: BigNumberish;
    paymasterAndData: BytesLike;
    signature: BytesLike;
}

export interface MempoolEntry {
    userOp: UserOperation;
    userOpHash: string;
}



