import { describe, expect, test } from 'vitest'
import {
  isValidAddress,
  tostr,
  toBytes32,
  toJsonString,
  compose,
} from '../../src/utils/index.js'
import { ethers } from 'ethers'

// Test data
const validAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
const invalidAddress = '0x123'
const bigNumber = 12345678901234567890n
const bytesLike = '0x1234'
const jsonObject = { key: 'value', number: 42n }

describe('isValidAddress', () => {
  test('returns true for a valid address', () => {
    expect(isValidAddress(validAddress)).toBe(true)
  })

  test('returns false for an invalid address', () => {
    expect(isValidAddress(invalidAddress)).toBe(false)
  })
})

describe('tostr', () => {
  test('converts BigNumberish to string', () => {
    expect(tostr(bigNumber)).toBe(bigNumber.toString())
  })
})

describe('toBytes32', () => {
  test('pads bytes to 32 bytes', () => {
    expect(toBytes32(bytesLike)).toBe(
      ethers.zeroPadValue(ethers.hexlify(bytesLike).toLowerCase(), 32),
    )
  })
})

describe('toJsonString', () => {
  test('converts an object to a JSON string with hex numbers', () => {
    const result = toJsonString(jsonObject)
    expect(result).toContain('0x2a') // 42n converted to hex
  })
})

describe('compose', () => {
  test('composes two functions correctly', () => {
    const double = (x: number) => x * 2
    const increment = (x: number) => x + 1
    const incrementThenDouble = compose(double, increment)
    expect(incrementThenDouble(3)).toBe(8) // (3 + 1) * 2 = 8
  })
})
