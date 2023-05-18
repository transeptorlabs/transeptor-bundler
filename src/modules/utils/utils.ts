import { ethers, BigNumber } from 'ethers'
import { BigNumberish } from 'ethers/lib/ethers'

export function isValidAddress(address: string) {
    return ethers.utils.isAddress(address)
}

export function tostr (s: BigNumberish): string {
    return BigNumber.from(s).toString()
}

export function requireCond (cond: boolean, msg: string, code?: number, data: any = undefined): void {
    if (!cond) {
        throw new RpcError(msg, code, data)
    }
}

export class RpcError extends Error {
    // error codes from: https://eips.ethereum.org/EIPS/eip-1474
    constructor (msg: string, readonly code?: number, readonly data: any = undefined) {
        super(msg)
    }
}

export enum ValidationErrors {
    InvalidFields = -32602,
    SimulateValidation = -32500,
    SimulatePaymasterValidation = -32501,
    OpcodeValidation = -32502,
    ExpiresShortly = -32503,
    Reputation = -32504,
    InsufficientStake = -32505,
    UnsupportedSignatureAggregator = -32506,
    InvalidSignature = -32507,
}

export interface StakeInfo {
    addr: string
    stake: BigNumberish
    unstakeDelaySec: BigNumberish
}