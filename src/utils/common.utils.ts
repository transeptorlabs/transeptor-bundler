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

/**
 * Concatenate multiple byte arrays.
 *
 * @param items - array of bytes
 * @returns concatenated bytes
 */
export function hexConcat(items: ReadonlyArray<BytesLike>): string {
  let result = '0x'
  items.forEach((item) => {
    result += hexlify(item).substring(2)
  })
  return result
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

export type PostValidationFn<T> = (envVar: T) => boolean

export type AssertEnvVarArgs<T> = {
  envVar: T
  errorMessage: string
  postValidationFunctions?: {
    fn: PostValidationFn<T>
    errorMessage: string
  }[]
}

/**
 * Asserts that an environment variable is set and returns it.
 *
 * @param assertEnvVarArgs - The environment variable to assert and the error message to throw if the environment variable is not set.
 * @returns The environment variable.
 */
export const assertEnvVar = <T>(assertEnvVarArgs: AssertEnvVarArgs<T>): T => {
  const { envVar, errorMessage, postValidationFunctions } = assertEnvVarArgs
  if (!envVar) {
    throw new Error(errorMessage)
  } else {
    if (postValidationFunctions) {
      for (const postValidationFunction of postValidationFunctions) {
        if (!postValidationFunction.fn(envVar)) {
          throw new Error(postValidationFunction.errorMessage)
        }
      }
    }
    return envVar
  }
}
