import { ethers } from 'ethers'
import { describe, expect, it } from 'vitest'

import {
  isValidAddress,
  tostr,
  toBytes32,
  toJsonString,
  compose,
  assertEnvVar,
  type AssertEnvVarArgs,
  type PostValidationFn,
} from '../../src/utils/index.js'

// Test data
const validAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
const invalidAddress = '0x123'
const bigNumber = 12345678901234567890n
const bytesLike = '0x1234'
const jsonObject = { key: 'value', number: 42n }

describe('isValidAddress', () => {
  it('returns true for a valid address', () => {
    expect(isValidAddress(validAddress)).toBe(true)
  })

  it('returns false for an invalid address', () => {
    expect(isValidAddress(invalidAddress)).toBe(false)
  })
})

describe('tostr', () => {
  it('converts BigNumberish to string', () => {
    expect(tostr(bigNumber)).toBe(bigNumber.toString())
  })
})

describe('toBytes32', () => {
  it('pads bytes to 32 bytes', () => {
    expect(toBytes32(bytesLike)).toBe(
      ethers.zeroPadValue(ethers.hexlify(bytesLike).toLowerCase(), 32),
    )
  })
})

describe('toJsonString', () => {
  it('converts an object to a JSON string with hex numbers', () => {
    const result = toJsonString(jsonObject)
    expect(result).toContain('0x2a') // 42n converted to hex
  })
})

describe('compose', () => {
  it('composes two functions correctly', () => {
    const double = (x: number) => x * 2
    const increment = (x: number) => x + 1
    const incrementThenDouble = compose(double, increment)
    expect(incrementThenDouble(3)).toBe(8) // (3 + 1) * 2 = 8
  })
})

describe('assertEnvVar', () => {
  describe('basic functionality', () => {
    it('should return the environment variable when it is truthy', () => {
      // Given
      const args: AssertEnvVarArgs<string> = {
        envVar: 'test-value',
        errorMessage: 'Environment variable is required',
      }

      // When
      const result = assertEnvVar(args)

      // Then
      expect(result).toBe('test-value')
    })

    it('should return the environment variable when it is a number', () => {
      // Given
      const args: AssertEnvVarArgs<number> = {
        envVar: 42,
        errorMessage: 'Environment variable is required',
      }

      // When
      const result = assertEnvVar(args)

      // Then
      expect(result).toBe(42)
    })

    it('should return the environment variable when it is a boolean true', () => {
      // Given
      const args: AssertEnvVarArgs<boolean> = {
        envVar: true,
        errorMessage: 'Environment variable is required',
      }

      // When
      const result = assertEnvVar(args)

      // Then
      expect(result).toBe(true)
    })

    it('should return the environment variable when it is an object', () => {
      // Given
      const testObj = { key: 'value' }
      const args: AssertEnvVarArgs<object> = {
        envVar: testObj,
        errorMessage: 'Environment variable is required',
      }

      // When
      const result = assertEnvVar(args)

      // Then
      expect(result).toBe(testObj)
    })

    it('should return the environment variable when it is an array', () => {
      // Given
      const testArray = [1, 2, 3]
      const args: AssertEnvVarArgs<number[]> = {
        envVar: testArray,
        errorMessage: 'Environment variable is required',
      }

      // When
      const result = assertEnvVar(args)

      // Then
      expect(result).toBe(testArray)
    })
  })

  describe('error handling', () => {
    it('should throw an error when environment variable is undefined', () => {
      // Given
      const args: AssertEnvVarArgs<string | undefined> = {
        envVar: undefined,
        errorMessage: 'Environment variable is required',
      }

      // When & Then
      expect(() => assertEnvVar(args)).toThrow(
        'Environment variable is required',
      )
    })

    it('should throw an error when environment variable is null', () => {
      // Given
      const args: AssertEnvVarArgs<string | null> = {
        envVar: null,
        errorMessage: 'Environment variable cannot be null',
      }

      // When & Then
      expect(() => assertEnvVar(args)).toThrow(
        'Environment variable cannot be null',
      )
    })

    it('should throw an error when environment variable is empty string', () => {
      // Given
      const args: AssertEnvVarArgs<string> = {
        envVar: '',
        errorMessage: 'Environment variable cannot be empty',
      }

      // When & Then
      expect(() => assertEnvVar(args)).toThrow(
        'Environment variable cannot be empty',
      )
    })

    it('should throw an error when environment variable is false', () => {
      // Given
      const args: AssertEnvVarArgs<boolean> = {
        envVar: false,
        errorMessage: 'Environment variable must be true',
      }

      // When & Then
      expect(() => assertEnvVar(args)).toThrow(
        'Environment variable must be true',
      )
    })

    it('should throw an error when environment variable is 0', () => {
      // Given
      const args: AssertEnvVarArgs<number> = {
        envVar: 0,
        errorMessage: 'Environment variable must be greater than 0',
      }

      // When & Then
      expect(() => assertEnvVar(args)).toThrow(
        'Environment variable must be greater than 0',
      )
    })

    it('should return the environment variable when it is an empty array (arrays are truthy)', () => {
      // Given
      const args: AssertEnvVarArgs<number[]> = {
        envVar: [],
        errorMessage: 'Environment variable cannot be empty array',
      }

      // When
      const result = assertEnvVar(args)

      // Then
      expect(result).toEqual([])
    })
  })

  describe('post-validation functions', () => {
    it('should return the environment variable when post-validation passes', () => {
      // Given
      const isValidString: PostValidationFn<string> = (value) =>
        value.length > 0
      const args: AssertEnvVarArgs<string> = {
        envVar: 'test-value',
        errorMessage: 'Environment variable is required',
        postValidationFunctions: [
          {
            fn: isValidString,
            errorMessage: 'String must not be empty',
          },
        ],
      }

      // When
      const result = assertEnvVar(args)

      // Then
      expect(result).toBe('test-value')
    })

    it('should throw an error when first post-validation function fails', () => {
      // Given
      const isValidString: PostValidationFn<string> = (value) =>
        value.length > 10
      const args: AssertEnvVarArgs<string> = {
        envVar: 'short',
        errorMessage: 'Environment variable is required',
        postValidationFunctions: [
          {
            fn: isValidString,
            errorMessage: 'String must be longer than 10 characters',
          },
        ],
      }

      // When & Then
      expect(() => assertEnvVar(args)).toThrow(
        'String must be longer than 10 characters',
      )
    })

    it('should throw an error when second post-validation function fails', () => {
      // Given
      const isValidLength: PostValidationFn<string> = (value) =>
        value.length > 5
      const isValidFormat: PostValidationFn<string> = (value) =>
        value.startsWith('test')
      const args: AssertEnvVarArgs<string> = {
        envVar: 'other-value',
        errorMessage: 'Environment variable is required',
        postValidationFunctions: [
          {
            fn: isValidLength,
            errorMessage: 'String must be longer than 5 characters',
          },
          {
            fn: isValidFormat,
            errorMessage: 'String must start with "test"',
          },
        ],
      }

      // When & Then
      expect(() => assertEnvVar(args)).toThrow('String must start with "test"')
    })

    it('should execute all post-validation functions when they all pass', () => {
      // Given
      const isValidLength: PostValidationFn<string> = (value) =>
        value.length > 5
      const isValidFormat: PostValidationFn<string> = (value) =>
        value.startsWith('test')
      const args: AssertEnvVarArgs<string> = {
        envVar: 'test-value',
        errorMessage: 'Environment variable is required',
        postValidationFunctions: [
          {
            fn: isValidLength,
            errorMessage: 'String must be longer than 5 characters',
          },
          {
            fn: isValidFormat,
            errorMessage: 'String must start with "test"',
          },
        ],
      }

      // When
      const result = assertEnvVar(args)

      // Then
      expect(result).toBe('test-value')
    })

    it('should work with number validation functions', () => {
      // Given
      const isPositive: PostValidationFn<number> = (value) => value > 0
      const isEven: PostValidationFn<number> = (value) => value % 2 === 0
      const args: AssertEnvVarArgs<number> = {
        envVar: 42,
        errorMessage: 'Environment variable is required',
        postValidationFunctions: [
          {
            fn: isPositive,
            errorMessage: 'Number must be positive',
          },
          {
            fn: isEven,
            errorMessage: 'Number must be even',
          },
        ],
      }

      // When
      const result = assertEnvVar(args)

      // Then
      expect(result).toBe(42)
    })

    it('should throw error when number validation fails', () => {
      // Given
      const isPositive: PostValidationFn<number> = (value) => value > 0
      const isEven: PostValidationFn<number> = (value) => value % 2 === 0
      const args: AssertEnvVarArgs<number> = {
        envVar: 41,
        errorMessage: 'Environment variable is required',
        postValidationFunctions: [
          {
            fn: isPositive,
            errorMessage: 'Number must be positive',
          },
          {
            fn: isEven,
            errorMessage: 'Number must be even',
          },
        ],
      }

      // When & Then
      expect(() => assertEnvVar(args)).toThrow('Number must be even')
    })
  })

  describe('edge cases', () => {
    it('should handle undefined postValidationFunctions gracefully', () => {
      // Given
      const args: AssertEnvVarArgs<string> = {
        envVar: 'test-value',
        errorMessage: 'Environment variable is required',
        postValidationFunctions: undefined,
      }

      // When
      const result = assertEnvVar(args)

      // Then
      expect(result).toBe('test-value')
    })

    it('should handle empty postValidationFunctions array', () => {
      // Given
      const args: AssertEnvVarArgs<string> = {
        envVar: 'test-value',
        errorMessage: 'Environment variable is required',
        postValidationFunctions: [],
      }

      // When
      const result = assertEnvVar(args)

      // Then
      expect(result).toBe('test-value')
    })

    it('should handle complex validation functions', () => {
      // Given
      const isValidEmail: PostValidationFn<string> = (value) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(value)
      }
      const args: AssertEnvVarArgs<string> = {
        envVar: 'test@example.com',
        errorMessage: 'Environment variable is required',
        postValidationFunctions: [
          {
            fn: isValidEmail,
            errorMessage: 'Invalid email format',
          },
        ],
      }

      // When
      const result = assertEnvVar(args)

      // Then
      expect(result).toBe('test@example.com')
    })

    it('should throw error for invalid email format', () => {
      // Given
      const isValidEmail: PostValidationFn<string> = (value) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(value)
      }
      const args: AssertEnvVarArgs<string> = {
        envVar: 'invalid-email',
        errorMessage: 'Environment variable is required',
        postValidationFunctions: [
          {
            fn: isValidEmail,
            errorMessage: 'Invalid email format',
          },
        ],
      }

      // When & Then
      expect(() => assertEnvVar(args)).toThrow('Invalid email format')
    })
  })
})
