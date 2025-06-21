import { describe, it, expect, vi, afterEach } from 'vitest'

import {
  randomSalt,
  sortedStateOperations,
  encodeStateCapability,
  getStateCapabilityHash,
} from '../../src/ocaps/capability-helper.js'
import {
  CapabilityTypes,
  StateKey,
  StateOperations,
} from '../../src/types/index.js'

describe('capability-helper', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('randomSalt', () => {
    it('should generate a hex string with 0x prefix', () => {
      const salt = randomSalt()
      expect(salt).toMatch(/^0x[a-fA-F0-9]+$/)
    })

    it('should generate different salts on each call', () => {
      const salt1 = randomSalt()
      const salt2 = randomSalt()
      expect(salt1).not.toBe(salt2)
    })

    it('should generate 32 bytes by default', () => {
      const salt = randomSalt()
      // 32 bytes = 64 hex characters + 0x prefix = 66 characters
      expect(salt).toHaveLength(66)
    })

    it('should generate custom byte length', () => {
      const salt = randomSalt(16)
      // 16 bytes = 32 hex characters + 0x prefix = 34 characters
      expect(salt).toHaveLength(34)
    })

    it('should generate different salts with same byte length', () => {
      const salt1 = randomSalt(16)
      const salt2 = randomSalt(16)
      expect(salt1).not.toBe(salt2)
      expect(salt1).toHaveLength(34)
      expect(salt2).toHaveLength(34)
    })

    it('should handle zero byte length', () => {
      const salt = randomSalt(0)
      expect(salt).toBe('0x')
    })

    it('should handle large byte length', () => {
      const salt = randomSalt(100)
      // 100 bytes = 200 hex characters + 0x prefix = 202 characters
      expect(salt).toHaveLength(202)
    })
  })

  describe('sortedStateOperations', () => {
    it('should sort operations alphabetically', () => {
      const operations = [StateOperations.WRITE, StateOperations.READ]
      const sorted = sortedStateOperations(operations)
      expect(sorted).toEqual([StateOperations.READ, StateOperations.WRITE])
    })

    it('should handle already sorted operations', () => {
      const operations = [StateOperations.READ, StateOperations.WRITE]
      const sorted = sortedStateOperations(operations)
      expect(sorted).toEqual([StateOperations.READ, StateOperations.WRITE])
    })

    it('should handle single operation', () => {
      const operations = [StateOperations.READ]
      const sorted = sortedStateOperations(operations)
      expect(sorted).toEqual([StateOperations.READ])
    })

    it('should handle empty array', () => {
      const operations: StateOperations[] = []
      const sorted = sortedStateOperations(operations)
      expect(sorted).toEqual([])
    })

    it('should handle duplicate operations', () => {
      const operations = [
        StateOperations.WRITE,
        StateOperations.READ,
        StateOperations.WRITE,
        StateOperations.READ,
      ]
      const sorted = sortedStateOperations(operations)
      expect(sorted).toEqual([
        StateOperations.READ,
        StateOperations.READ,
        StateOperations.WRITE,
        StateOperations.WRITE,
      ])
    })

    it('should not mutate the original array', () => {
      const operations = [StateOperations.WRITE, StateOperations.READ]
      const original = [...operations]
      sortedStateOperations(operations)
      expect(operations).toEqual(original)
    })
  })

  describe('encodeStateCapability', () => {
    it('should encode a capability with single operation', () => {
      const capability = {
        issuer: '0x1234567890123456789012345678901234567890',
        clientVersion: 'test-1.0.0',
        moduleName: 'test-module',
        ocaps: [
          {
            type: CapabilityTypes.State,
            data: {
              key: StateKey.ReputationEntries,
              operations: [StateOperations.READ],
            },
          },
        ],
        salt: 'test-salt',
        signature:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
      }

      const encoded = encodeStateCapability(capability)
      expect(encoded).toBeDefined()
      expect(typeof encoded).toBe('string')
      expect(encoded).toMatch(/^0x[a-fA-F0-9]+$/)
    })

    it('should encode a capability with multiple operations', () => {
      const capability = {
        issuer: '0x1234567890123456789012345678901234567890',
        clientVersion: 'test-1.0.0',
        moduleName: 'test-module',
        ocaps: [
          {
            type: CapabilityTypes.State,
            data: {
              key: StateKey.ReputationEntries,
              operations: [StateOperations.WRITE, StateOperations.READ],
            },
          },
        ],
        salt: 'test-salt',
        signature:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
      }

      const encoded = encodeStateCapability(capability)
      expect(encoded).toBeDefined()
      expect(typeof encoded).toBe('string')
      expect(encoded).toMatch(/^0x[a-fA-F0-9]+$/)
    })

    it('should encode a capability with multiple ocaps', () => {
      const capability = {
        issuer: '0x1234567890123456789012345678901234567890',
        clientVersion: 'test-1.0.0',
        moduleName: 'test-module',
        ocaps: [
          {
            type: CapabilityTypes.State,
            data: {
              key: StateKey.ReputationEntries,
              operations: [StateOperations.READ],
            },
          },
          {
            type: CapabilityTypes.State,
            data: {
              key: StateKey.StandardPool,
              operations: [StateOperations.WRITE],
            },
          },
        ],
        salt: 'test-salt',
        signature:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
      }

      const encoded = encodeStateCapability(capability)
      expect(encoded).toBeDefined()
      expect(typeof encoded).toBe('string')
      expect(encoded).toMatch(/^0x[a-fA-F0-9]+$/)
    })

    it('should encode a capability with empty ocaps array', () => {
      const capability = {
        issuer: '0x1234567890123456789012345678901234567890',
        clientVersion: 'test-1.0.0',
        moduleName: 'test-module',
        ocaps: [],
        salt: 'test-salt',
        signature:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
      }

      const encoded = encodeStateCapability(capability)
      expect(encoded).toBeDefined()
      expect(typeof encoded).toBe('string')
      expect(encoded).toMatch(/^0x[a-fA-F0-9]+$/)
    })

    it('should produce deterministic encoding for same capability', () => {
      const capability = {
        issuer: '0x1234567890123456789012345678901234567890',
        clientVersion: 'test-1.0.0',
        moduleName: 'test-module',
        ocaps: [
          {
            type: CapabilityTypes.State,
            data: {
              key: StateKey.ReputationEntries,
              operations: [StateOperations.READ, StateOperations.WRITE],
            },
          },
        ],
        salt: 'test-salt',
        signature:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
      }

      const encoded1 = encodeStateCapability(capability)
      const encoded2 = encodeStateCapability(capability)
      expect(encoded1).toBe(encoded2)
    })

    it('should produce different encoding for different capabilities', () => {
      const capability1 = {
        issuer: '0x1234567890123456789012345678901234567890',
        clientVersion: 'test-1.0.0',
        moduleName: 'test-module',
        ocaps: [
          {
            type: CapabilityTypes.State,
            data: {
              key: StateKey.ReputationEntries,
              operations: [StateOperations.READ],
            },
          },
        ],
        salt: 'test-salt',
        signature:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
      }

      const capability2 = {
        ...capability1,
        salt: 'different-salt',
      }

      const encoded1 = encodeStateCapability(capability1)
      const encoded2 = encodeStateCapability(capability2)
      expect(encoded1).not.toBe(encoded2)
    })

    it('should sort operations within each ocap', () => {
      const capability = {
        issuer: '0x1234567890123456789012345678901234567890',
        clientVersion: 'test-1.0.0',
        moduleName: 'test-module',
        ocaps: [
          {
            type: CapabilityTypes.State,
            data: {
              key: StateKey.ReputationEntries,
              operations: [StateOperations.WRITE, StateOperations.READ],
            },
          },
        ],
        salt: 'test-salt',
        signature:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
      }

      const encoded = encodeStateCapability(capability)

      // Create the same capability but with pre-sorted operations
      const capabilitySorted = {
        ...capability,
        ocaps: [
          {
            type: CapabilityTypes.State,
            data: {
              key: StateKey.ReputationEntries,
              operations: [StateOperations.READ, StateOperations.WRITE],
            },
          },
        ],
      }

      const encodedSorted = encodeStateCapability(capabilitySorted)
      expect(encoded).toBe(encodedSorted)
    })

    it('should handle special characters in module name', () => {
      const capability = {
        issuer: '0x1234567890123456789012345678901234567890',
        clientVersion: 'test-1.0.0',
        moduleName: 'test-module-!@#$%^&*()_+-=[]{}|;:,.<>?',
        ocaps: [
          {
            type: CapabilityTypes.State,
            data: {
              key: StateKey.ReputationEntries,
              operations: [StateOperations.READ],
            },
          },
        ],
        salt: 'test-salt',
        signature:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
      }

      const encoded = encodeStateCapability(capability)
      expect(encoded).toBeDefined()
      expect(typeof encoded).toBe('string')
      expect(encoded).toMatch(/^0x[a-fA-F0-9]+$/)
    })

    it('should handle very long values', () => {
      const longString = 'a'.repeat(1000)
      const capability = {
        issuer: '0x1234567890123456789012345678901234567890',
        clientVersion: longString,
        moduleName: longString,
        ocaps: [
          {
            type: CapabilityTypes.State,
            data: {
              key: StateKey.ReputationEntries,
              operations: [StateOperations.READ],
            },
          },
        ],
        salt: longString,
        signature:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
      }

      const encoded = encodeStateCapability(capability)
      expect(encoded).toBeDefined()
      expect(typeof encoded).toBe('string')
      expect(encoded).toMatch(/^0x[a-fA-F0-9]+$/)
    })
  })

  describe('getStateCapabilityHash', () => {
    it('should generate a hash for a capability', () => {
      const capability = {
        issuer: '0x1234567890123456789012345678901234567890',
        clientVersion: 'test-1.0.0',
        moduleName: 'test-module',
        ocaps: [
          {
            type: CapabilityTypes.State,
            data: {
              key: StateKey.ReputationEntries,
              operations: [StateOperations.READ],
            },
          },
        ],
        salt: 'test-salt',
        signature:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
      }

      const hash = getStateCapabilityHash(capability)
      expect(hash).toBeDefined()
      expect(typeof hash).toBe('string')
      expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/) // 32 bytes = 64 hex characters
    })

    it('should produce deterministic hashes for same capability', () => {
      const capability = {
        issuer: '0x1234567890123456789012345678901234567890',
        clientVersion: 'test-1.0.0',
        moduleName: 'test-module',
        ocaps: [
          {
            type: CapabilityTypes.State,
            data: {
              key: StateKey.ReputationEntries,
              operations: [StateOperations.READ, StateOperations.WRITE],
            },
          },
        ],
        salt: 'test-salt',
        signature:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
      }

      const hash1 = getStateCapabilityHash(capability)
      const hash2 = getStateCapabilityHash(capability)
      expect(hash1).toBe(hash2)
    })

    it('should produce different hashes for different capabilities', () => {
      const capability1 = {
        issuer: '0x1234567890123456789012345678901234567890',
        clientVersion: 'test-1.0.0',
        moduleName: 'test-module',
        ocaps: [
          {
            type: CapabilityTypes.State,
            data: {
              key: StateKey.ReputationEntries,
              operations: [StateOperations.READ],
            },
          },
        ],
        salt: 'test-salt',
        signature:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
      }

      const capability2 = {
        ...capability1,
        moduleName: 'different-module',
      }

      const hash1 = getStateCapabilityHash(capability1)
      const hash2 = getStateCapabilityHash(capability2)
      expect(hash1).not.toBe(hash2)
    })

    it('should produce different hashes for different issuers', () => {
      const capability1 = {
        issuer: '0x1234567890123456789012345678901234567890',
        clientVersion: 'test-1.0.0',
        moduleName: 'test-module',
        ocaps: [
          {
            type: CapabilityTypes.State,
            data: {
              key: StateKey.ReputationEntries,
              operations: [StateOperations.READ],
            },
          },
        ],
        salt: 'test-salt',
        signature:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
      }

      const capability2 = {
        ...capability1,
        issuer: '0x0987654321098765432109876543210987654321',
      }

      const hash1 = getStateCapabilityHash(capability1)
      const hash2 = getStateCapabilityHash(capability2)
      expect(hash1).not.toBe(hash2)
    })

    it('should produce different hashes for different client versions', () => {
      const capability1 = {
        issuer: '0x1234567890123456789012345678901234567890',
        clientVersion: 'test-1.0.0',
        moduleName: 'test-module',
        ocaps: [
          {
            type: CapabilityTypes.State,
            data: {
              key: StateKey.ReputationEntries,
              operations: [StateOperations.READ],
            },
          },
        ],
        salt: 'test-salt',
        signature:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
      }

      const capability2 = {
        ...capability1,
        clientVersion: 'test-2.0.0',
      }

      const hash1 = getStateCapabilityHash(capability1)
      const hash2 = getStateCapabilityHash(capability2)
      expect(hash1).not.toBe(hash2)
    })

    it('should produce different hashes for different salts', () => {
      const capability1 = {
        issuer: '0x1234567890123456789012345678901234567890',
        clientVersion: 'test-1.0.0',
        moduleName: 'test-module',
        ocaps: [
          {
            type: CapabilityTypes.State,
            data: {
              key: StateKey.ReputationEntries,
              operations: [StateOperations.READ],
            },
          },
        ],
        salt: 'test-salt',
        signature:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
      }

      const capability2 = {
        ...capability1,
        salt: 'different-salt',
      }

      const hash1 = getStateCapabilityHash(capability1)
      const hash2 = getStateCapabilityHash(capability2)
      expect(hash1).not.toBe(hash2)
    })

    it('should produce different hashes for different ocaps', () => {
      const capability1 = {
        issuer: '0x1234567890123456789012345678901234567890',
        clientVersion: 'test-1.0.0',
        moduleName: 'test-module',
        ocaps: [
          {
            type: CapabilityTypes.State,
            data: {
              key: StateKey.ReputationEntries,
              operations: [StateOperations.READ],
            },
          },
        ],
        salt: 'test-salt',
        signature:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
      }

      const capability2 = {
        ...capability1,
        ocaps: [
          {
            type: CapabilityTypes.State,
            data: {
              key: StateKey.StandardPool,
              operations: [StateOperations.READ],
            },
          },
        ],
      }

      const hash1 = getStateCapabilityHash(capability1)
      const hash2 = getStateCapabilityHash(capability2)
      expect(hash1).not.toBe(hash2)
    })

    it('should produce different hashes for different operations', () => {
      const capability1 = {
        issuer: '0x1234567890123456789012345678901234567890',
        clientVersion: 'test-1.0.0',
        moduleName: 'test-module',
        ocaps: [
          {
            type: CapabilityTypes.State,
            data: {
              key: StateKey.ReputationEntries,
              operations: [StateOperations.READ],
            },
          },
        ],
        salt: 'test-salt',
        signature:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
      }

      const capability2 = {
        ...capability1,
        ocaps: [
          {
            type: CapabilityTypes.State,
            data: {
              key: StateKey.ReputationEntries,
              operations: [StateOperations.WRITE],
            },
          },
        ],
      }

      const hash1 = getStateCapabilityHash(capability1)
      const hash2 = getStateCapabilityHash(capability2)
      expect(hash1).not.toBe(hash2)
    })

    it('should produce same hash regardless of operation order', () => {
      const capability1 = {
        issuer: '0x1234567890123456789012345678901234567890',
        clientVersion: 'test-1.0.0',
        moduleName: 'test-module',
        ocaps: [
          {
            type: CapabilityTypes.State,
            data: {
              key: StateKey.ReputationEntries,
              operations: [StateOperations.WRITE, StateOperations.READ],
            },
          },
        ],
        salt: 'test-salt',
        signature:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
      }

      const capability2 = {
        ...capability1,
        ocaps: [
          {
            type: CapabilityTypes.State,
            data: {
              key: StateKey.ReputationEntries,
              operations: [StateOperations.READ, StateOperations.WRITE],
            },
          },
        ],
      }

      const hash1 = getStateCapabilityHash(capability1)
      const hash2 = getStateCapabilityHash(capability2)
      expect(hash1).toBe(hash2)
    })

    it('should handle empty ocaps array', () => {
      const capability = {
        issuer: '0x1234567890123456789012345678901234567890',
        clientVersion: 'test-1.0.0',
        moduleName: 'test-module',
        ocaps: [],
        salt: 'test-salt',
        signature:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
      }

      const hash = getStateCapabilityHash(capability)
      expect(hash).toBeDefined()
      expect(typeof hash).toBe('string')
      expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/)
    })

    it('should handle empty operations array', () => {
      const capability = {
        issuer: '0x1234567890123456789012345678901234567890',
        clientVersion: 'test-1.0.0',
        moduleName: 'test-module',
        ocaps: [
          {
            type: CapabilityTypes.State,
            data: {
              key: StateKey.ReputationEntries,
              operations: [],
            },
          },
        ],
        salt: 'test-salt',
        signature:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
      }

      const hash = getStateCapabilityHash(capability)
      expect(hash).toBeDefined()
      expect(typeof hash).toBe('string')
      expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/)
    })
  })

  describe('hash determinism across different scenarios', () => {
    it('should produce consistent hashes across multiple runs', () => {
      const capability = {
        issuer: '0x1234567890123456789012345678901234567890',
        clientVersion: 'test-1.0.0',
        moduleName: 'test-module',
        ocaps: [
          {
            type: CapabilityTypes.State,
            data: {
              key: StateKey.ReputationEntries,
              operations: [StateOperations.READ, StateOperations.WRITE],
            },
          },
          {
            type: CapabilityTypes.State,
            data: {
              key: StateKey.StandardPool,
              operations: [StateOperations.READ],
            },
          },
        ],
        salt: 'test-salt',
        signature:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
      }

      const hashes: string[] = []
      for (let i = 0; i < 10; i++) {
        hashes.push(getStateCapabilityHash(capability))
      }

      // All hashes should be identical
      const firstHash = hashes[0]
      hashes.forEach((hash) => {
        expect(hash).toBe(firstHash)
      })
    })

    it('should produce same hash for capabilities with different signatures but same data', () => {
      const baseCapability = {
        issuer: '0x1234567890123456789012345678901234567890',
        clientVersion: 'test-1.0.0',
        moduleName: 'test-module',
        ocaps: [
          {
            type: CapabilityTypes.State,
            data: {
              key: StateKey.ReputationEntries,
              operations: [StateOperations.READ],
            },
          },
        ],
        salt: 'test-salt',
      }

      const capability1 = {
        ...baseCapability,
        signature:
          '0x1111111111111111111111111111111111111111111111111111111111111111',
      }

      const capability2 = {
        ...baseCapability,
        signature:
          '0x2222222222222222222222222222222222222222222222222222222222222222',
      }

      const hash1 = getStateCapabilityHash(capability1)
      const hash2 = getStateCapabilityHash(capability2)
      expect(hash1).toBe(hash2)
    })
  })
})
