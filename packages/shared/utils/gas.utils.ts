import { BigNumber } from 'ethers'
import { arrayify, hexlify } from 'ethers/lib/utils.js'

import { Logger } from '../logger/index.js'
import { UserOperation } from '../types/index.js'

import { packUserOp, encodeUserOp } from './bundle.utils.js'

export const DefaultGasOverheads: GasOverheads = {
  fixed: 21000,
  perUserOp: 18300,
  perUserOpWord: 4,
  zeroByte: 4,
  nonZeroByte: 16,
  bundleSize: 1,
  sigSize: 65,
}

export type GasOverheads = {
  /**
   * fixed overhead for entire handleOp bundle.
   */
  fixed: number

  /**
   * per userOp overhead, added on top of the above fixed per-bundle.
   */
  perUserOp: number

  /**
   * overhead for userOp word (32 bytes) block
   */
  perUserOpWord: number

  // perCallDataWord: number

  /**
   * zero byte cost, for calldata gas cost calculations
   */
  zeroByte: number

  /**
   * non-zero byte cost, for calldata gas cost calculations
   */
  nonZeroByte: number

  /**
   * expected bundle size, to split per-bundle overhead between all ops.
   */
  bundleSize: number

  /**
   * expected length of the userOp signature.
   */
  sigSize: number
}

/**
 * Calculate the gas cost of the pre-verification of the userOp.
 *
 * @param userOp - The UserOperation to calculate the gas cost for.
 * @param overheads - The gas overheads to use for the calculation.
 * @returns the gas cost of the pre-verification of the userOp
 */
export function calcPreVerificationGas(
  userOp: Partial<UserOperation>,
  overheads?: Partial<GasOverheads>,
): number {
  Logger.debug('Running calcPreVerificationGas on userOp')
  const ov = { ...DefaultGasOverheads, ...(overheads ?? {}) }
  const p: UserOperation = {
    // dummy value for incomplete userops
    preVerificationGas: BigNumber.from(21000).toHexString(),
    signature: hexlify(Buffer.alloc(ov.sigSize, 1)),
    ...userOp,
  } as any

  const packed = arrayify(encodeUserOp(packUserOp(p), false))
  const lengthInWord = (packed.length + 31) / 32
  const callDataCost = packed
    .map((x) => (x === 0 ? ov.zeroByte : ov.nonZeroByte))
    .reduce((sum, x) => sum + x)
  const ret = Math.round(
    callDataCost +
      ov.fixed / ov.bundleSize +
      ov.perUserOp +
      ov.perUserOpWord * lengthInWord,
  )
  return ret
}
