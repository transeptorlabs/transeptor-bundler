import {
  isAddress,
  BytesLike,
  BigNumberish,
  hexlify,
  ethers,
  toBeHex,
} from 'ethers'

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

/**
 * Convert an object to a JSON string.
 *
 * @param obj - The object to convert.
 * @returns The JSON string representation of the object.
 */
export const toJsonString = (obj: any): string => {
  return JSON.stringify(
    obj,
    (_, value: any) =>
      typeof value === 'bigint' || typeof value === 'number'
        ? toBeHex(value)
        : value,
    2,
  )
}

type Compose = <A, B, C>(f: (x: B) => C, g: (x: A) => B) => (x: A) => C

/**
 * Composes two functions into one function: (f,g) => x => f(g(x))
 *
 * @param f - The first function.
 * @param g - The second function.
 * @returns - The composed function.
 */
export const compose: Compose = (f, g) => (x) => f(g(x))

/**
 * sum the given bignumberish items (numbers, hex, bignumbers, ignore nulls)
 *
 * @param args - The array of items to sum.
 * @returns The sum of the items.
 */
export const sum = (...args: Array<BigNumberish | undefined>): bigint => {
  return args.reduce((acc: bigint, cur) => acc + BigInt(cur ?? 0), BigInt(0))
}
