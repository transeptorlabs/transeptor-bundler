import { ethers, BigNumber, BytesLike } from 'ethers'
import { hexlify, hexZeroPad } from 'ethers/lib/utils'
import { BigNumberish } from 'ethers/lib/ethers'

export function isValidAddress(address: string) {
  return ethers.utils.isAddress(address)
}

export function tostr (s: BigNumberish): string {
  return BigNumber.from(s).toString()
}

export function toBytes32 (b: BytesLike | number): string {
  return hexZeroPad(hexlify(b).toLowerCase(), 32)
}

/**
* create a dictionary object with given keys
* @param keys the property names of the returned object
* @param mapper mapper from key to property value
* @param filter if exists, must return true to add keys
*/
export function mapOf<T> (keys: Iterable<string>, mapper: (key: string) => T, filter?: (key: string) => boolean): { [key: string]: T } {
  const ret: { [key: string]: T } = {}
  for (const key of keys) {
    if (filter == null || filter(key)) {
      ret[key] = mapper(key)
    }
  }
  return ret
}