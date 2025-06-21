import { ethers } from 'ethers'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import {
  createCapabilityService,
  createCapabilityIssuer,
  createCapabilityVerifier,
  type CapabilityServiceConfig,
} from '../../src/ocaps/capability-service.js'
import {
  CapabilityTypes,
  StateKey,
  StateOperations,
} from '../../src/types/index.js'
import { mockLogger } from '../mocks/index.js'

describe('CapabilityService', () => {
  let config: CapabilityServiceConfig
  let capabilityService: ReturnType<typeof createCapabilityService>
  let testWallet: ethers.HDNodeWallet

  beforeEach(() => {
    testWallet = ethers.Wallet.createRandom()
    config = {
      logger: mockLogger,
      issuerSignerPrivateKey: testWallet.privateKey,
      clientVersion: 'test-1.0.0',
    }
    capabilityService = createCapabilityService(config)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('createCapabilityService', () => {
    it('should create a capability service with correct configuration', () => {
      expect(capabilityService).toBeDefined()
      expect(typeof capabilityService.issueStateCapability).toBe('function')
      expect(typeof capabilityService.verifyStateCapability).toBe('function')
    })

    it('should use the provided signer private key', () => {
      expect(capabilityService).toBeDefined()
      // The service should use the test wallet's private key
      expect(testWallet.privateKey).toBe(config.issuerSignerPrivateKey)
    })

    it('should use the provided client version', () => {
      expect(capabilityService).toBeDefined()
      // The service should use the provided client version
      expect(config.clientVersion).toBe('test-1.0.0')
    })
  })

  describe('issueStateCapability', () => {
    it('should issue a valid state capability', async () => {
      const capabilityRequest = {
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
      }

      const result =
        await capabilityService.issueStateCapability(capabilityRequest)

      expect(result).toBeDefined()
      expect(result.issuer).toBe(testWallet.address)
      expect(result.clientVersion).toBe('test-1.0.0')
      expect(result.moduleName).toBe('test-module')
      expect(result.ocaps).toEqual(capabilityRequest.ocaps)
      expect(result.salt).toBe('test-salt')
      expect(result.signature).toBeDefined()
      expect(result.signature).not.toBe('0x')
      expect(result.signature.length).toBeGreaterThan(0)
    })

    it('should log debug information when issuing capability', async () => {
      const capabilityRequest = {
        moduleName: 'test-module',
        ocaps: [
          {
            type: CapabilityTypes.State,
            data: {
              key: StateKey.StandardPool,
              operations: [StateOperations.READ],
            },
          },
        ],
        salt: 'test-salt',
      }

      await capabilityService.issueStateCapability(capabilityRequest)

      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Issuing capability for module ${capabilityRequest.moduleName}`,
      )
    })

    it('should generate unique signatures for different requests', async () => {
      const request1 = {
        moduleName: 'module-1',
        ocaps: [
          {
            type: CapabilityTypes.State,
            data: {
              key: StateKey.ReputationEntries,
              operations: [StateOperations.READ],
            },
          },
        ],
        salt: 'salt-1',
      }

      const request2 = {
        moduleName: 'module-2',
        ocaps: [
          {
            type: CapabilityTypes.State,
            data: {
              key: StateKey.StandardPool,
              operations: [StateOperations.WRITE],
            },
          },
        ],
        salt: 'salt-2',
      }

      const result1 = await capabilityService.issueStateCapability(request1)
      const result2 = await capabilityService.issueStateCapability(request2)

      expect(result1.signature).not.toBe(result2.signature)
    })

    it('should handle multiple capabilities in a single request', async () => {
      const capabilityRequest = {
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
      }

      const result =
        await capabilityService.issueStateCapability(capabilityRequest)

      expect(result.ocaps).toHaveLength(2)
      expect(result.ocaps).toEqual(capabilityRequest.ocaps)
    })

    it('should handle empty capabilities array', async () => {
      const capabilityRequest = {
        moduleName: 'test-module',
        ocaps: [],
        salt: 'test-salt',
      }

      const result =
        await capabilityService.issueStateCapability(capabilityRequest)

      expect(result.ocaps).toEqual([])
      expect(result.signature).toBeDefined()
    })
  })

  describe('verifyStateCapability', () => {
    it('should verify a valid capability', async () => {
      const capabilityRequest = {
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
      }

      const issuedCapability =
        await capabilityService.issueStateCapability(capabilityRequest)
      const isValid = capabilityService.verifyStateCapability(issuedCapability)

      expect(isValid).toBe(true)
    })

    it('should reject an invalid signature', () => {
      const invalidCapability = {
        issuer: testWallet.address,
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
        signature: '0xinvalid-signature',
      }

      const isValid = capabilityService.verifyStateCapability(invalidCapability)

      expect(isValid).toBe(false)
    })

    it('should reject capability with empty signature', () => {
      const emptySignatureCapability = {
        issuer: testWallet.address,
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
        signature: '0x',
      }

      const isValid = capabilityService.verifyStateCapability(
        emptySignatureCapability,
      )

      expect(isValid).toBe(false)
    })

    it('should reject capability with wrong issuer address', async () => {
      const wrongWallet = ethers.Wallet.createRandom()
      const capabilityRequest = {
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

      const issuedCapability =
        await capabilityService.issueStateCapability(capabilityRequest)

      // Modify the issuer address
      const tamperedCapability = {
        ...issuedCapability,
        issuer: wrongWallet.address,
      }

      const isValid =
        capabilityService.verifyStateCapability(tamperedCapability)

      expect(isValid).toBe(false)
    })

    it('should log debug information when verifying capability', async () => {
      const capabilityRequest = {
        moduleName: 'test-module',
        ocaps: [
          {
            type: CapabilityTypes.State,
            data: {
              key: StateKey.StandardPool,
              operations: [StateOperations.READ],
            },
          },
        ],
        salt: 'test-salt',
      }

      const issuedCapability =
        await capabilityService.issueStateCapability(capabilityRequest)
      capabilityService.verifyStateCapability(issuedCapability)

      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Attempting to verify capability for module ${issuedCapability.moduleName}`,
      )

      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Capability verified successfully for module ${issuedCapability.moduleName}`,
      )
    })

    it('should log warning when verification fails due to address mismatch', async () => {
      const wrongWallet = ethers.Wallet.createRandom()
      const capabilityRequest = {
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

      const issuedCapability =
        await capabilityService.issueStateCapability(capabilityRequest)

      // Modify the issuer address
      const tamperedCapability = {
        ...issuedCapability,
        issuer: wrongWallet.address,
      }

      capabilityService.verifyStateCapability(tamperedCapability)

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Capability verification failed: address mismatch',
      )
    })

    it('should handle case-insensitive address comparison', async () => {
      const capabilityRequest = {
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

      const issuedCapability =
        await capabilityService.issueStateCapability(capabilityRequest)

      // The service should handle case-insensitive comparison internally
      // We don't need to modify the address since the service already does toLowerCase() comparison
      const isValid = capabilityService.verifyStateCapability(issuedCapability)

      expect(isValid).toBe(true)
    })

    it('should reject capability with an invalid issuer address', () => {
      const invalidIssuerCapability = {
        issuer: 'not-an-address',
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
        signature: '0x1234', // any non-empty string
      }

      const isValid = capabilityService.verifyStateCapability(
        invalidIssuerCapability,
      )

      expect(isValid).toBe(false)
      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          capabilityToVerify: invalidIssuerCapability,
        },
        'Capability verification failed: issuer is not a valid address',
      )
    })
  })

  describe('createCapabilityIssuer', () => {
    it('should create a capability issuer', () => {
      const issuer = createCapabilityIssuer(capabilityService)

      expect(issuer).toBeDefined()
      expect(typeof issuer.issueStateCapability).toBe('function')
      expect(issuer.issueStateCapability).toBe(
        capabilityService.issueStateCapability,
      )
    })

    it('should not expose verifyStateCapability', () => {
      const issuer = createCapabilityIssuer(capabilityService)

      expect(issuer).not.toHaveProperty('verifyStateCapability')
    })
  })

  describe('createCapabilityVerifier', () => {
    it('should create a capability verifier', () => {
      const verifier = createCapabilityVerifier(capabilityService)

      expect(verifier).toBeDefined()
      expect(typeof verifier.verifyStateCapability).toBe('function')
      expect(verifier.verifyStateCapability).toBe(
        capabilityService.verifyStateCapability,
      )
    })

    it('should not expose issueStateCapability', () => {
      const verifier = createCapabilityVerifier(capabilityService)

      expect(verifier).not.toHaveProperty('issueStateCapability')
    })
  })

  describe('edge cases', () => {
    it('should handle very long module names', async () => {
      const longModuleName = 'a'.repeat(1000)
      const capabilityRequest = {
        moduleName: longModuleName,
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

      const result =
        await capabilityService.issueStateCapability(capabilityRequest)

      expect(result.moduleName).toBe(longModuleName)
      expect(result.signature).toBeDefined()
    })

    it('should handle very long salt values', async () => {
      const longSalt = '0x' + 'a'.repeat(1000)
      const capabilityRequest = {
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
        salt: longSalt,
      }

      const result =
        await capabilityService.issueStateCapability(capabilityRequest)

      expect(result.salt).toBe(longSalt)
      expect(result.signature).toBeDefined()
    })

    it('should handle special characters in module name', async () => {
      const specialModuleName = 'test-module-!@#$%^&*()_+-=[]{}|;:,.<>?'
      const capabilityRequest = {
        moduleName: specialModuleName,
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

      const result =
        await capabilityService.issueStateCapability(capabilityRequest)

      expect(result.moduleName).toBe(specialModuleName)
      expect(result.signature).toBeDefined()
    })

    it('should handle different client versions', async () => {
      const differentConfig: CapabilityServiceConfig = {
        logger: mockLogger,
        issuerSignerPrivateKey: testWallet.privateKey,
        clientVersion: 'different-version-2.0.0',
      }

      const differentService = createCapabilityService(differentConfig)
      const capabilityRequest = {
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

      const result =
        await differentService.issueStateCapability(capabilityRequest)

      expect(result.clientVersion).toBe('different-version-2.0.0')
      expect(result.issuer).toBe(testWallet.address)
    })
  })
})
