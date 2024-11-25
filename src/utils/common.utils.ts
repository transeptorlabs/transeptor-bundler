import { isAddress, BytesLike, BigNumberish, hexlify, ethers } from 'ethers'

/**
 * Check if the address is valid.
 *
 * @param address - The address to validate.
 * @returns Whether the address is valid.
 */
export const isValidAddress = (address: string): boolean => {
  return isAddress(address)
}

/**
 * Convert a big number to a string.
 *
 * @param s - The big number to convert.
 * @returns The string representation of the big number.
 */
export const tostr = (s: BigNumberish): string => {
  return BigInt(s).toString()
}

/**
 * Padding a string to 32 bytes.
 *
 * @param b - The bytes to pad.
 * @returns The padded bytes.
 */
export const toBytes32 = (b: BytesLike): string => {
  return ethers.zeroPadValue(hexlify(b).toLowerCase(), 32)
}
