import { ethers, BigNumber, BytesLike } from 'ethers'
import { BigNumberish } from 'ethers/lib/ethers'
import { hexlify, hexZeroPad } from 'ethers/lib/utils.js'

/**
 * Check if the address is valid.
 *
 * @param address - The address to validate.
 * @returns Whether the address is valid.
 */
export const isValidAddress = (address: string): boolean => {
  return ethers.utils.isAddress(address)
}

/**
 * Convert a big number to a string.
 *
 * @param s - The big number to convert.
 * @returns The string representation of the big number.
 */
export const tostr = (s: BigNumberish): string => {
  return BigNumber.from(s).toString()
}

/**
 * Convert a string to a big number.
 *
 * @param b - The bytes to convert.
 * @returns The big number representation of the bytes.
 */
export const toBytes32 = (b: BytesLike | number): string => {
  return hexZeroPad(hexlify(b).toLowerCase(), 32)
}
