import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import {
  createStateCapabilitiesBootstrap,
  type StateCapabilitiesBootstrapConfig,
  type IssuedStateCapabilitiesMapping,
} from '../../src/ocaps/bootstrap.js'
import { STATE_CAPABILITY_REGISTRY } from '../../src/ocaps/capability-registry.js'
import {
  CapabilityTypes,
  StateKey,
  StateOperations,
} from '../../src/types/index.js'
import { mockCapabilityIssuer } from '../mocks/index.js'

describe('createStateCapabilitiesBootstrap', () => {
  let config: StateCapabilitiesBootstrapConfig
  let bootstrap: () => Promise<IssuedStateCapabilitiesMapping>

  beforeEach(() => {
    config = {
      capabilityIssuer: mockCapabilityIssuer,
      stateCapabilityRegistry: STATE_CAPABILITY_REGISTRY,
    }
    bootstrap = createStateCapabilitiesBootstrap(config)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('createStateCapabilitiesBootstrap', () => {
    it('should create a bootstrap function', () => {
      expect(typeof bootstrap).toBe('function')
      expect(bootstrap).toBeInstanceOf(Function)
    })

    it('should return an async function', () => {
      const result = bootstrap()
      expect(result).toBeInstanceOf(Promise)
    })
  })

  describe('bootstrap execution', () => {
    it('should issue capabilities for all registered modules', async () => {
      // Mock the capability issuer to return test capabilities
      const mockCapabilities = {
        'reputation-manager': {
          issuer: '0x1234567890123456789012345678901234567890',
          clientVersion: 'test-1.0.0',
          moduleName: 'reputation-manager',
          ocaps: [
            {
              type: CapabilityTypes.State,
              data: {
                key: StateKey.ReputationEntries,
                operations: [StateOperations.READ, StateOperations.WRITE],
              },
            },
          ],
          salt: 'test-salt-1',
          signature:
            '0x0000000000000000000000000000000000000000000000000000000000000000',
        },
        'deposit-manager': {
          issuer: '0x1234567890123456789012345678901234567890',
          clientVersion: 'test-1.0.0',
          moduleName: 'deposit-manager',
          ocaps: [
            {
              type: CapabilityTypes.State,
              data: {
                key: StateKey.StandardPool,
                operations: [StateOperations.READ],
              },
            },
          ],
          salt: 'test-salt-2',
          signature:
            '0x0000000000000000000000000000000000000000000000000000000000000000',
        },
        'mempool-manager': {
          issuer: '0x1234567890123456789012345678901234567890',
          clientVersion: 'test-1.0.0',
          moduleName: 'mempool-manager',
          ocaps: [
            {
              type: CapabilityTypes.State,
              data: {
                key: StateKey.StandardPool,
                operations: [StateOperations.READ, StateOperations.WRITE],
              },
            },
            {
              type: CapabilityTypes.State,
              data: {
                key: StateKey.MempoolEntryCount,
                operations: [StateOperations.READ, StateOperations.WRITE],
              },
            },
          ],
          salt: 'test-salt-3',
          signature:
            '0x0000000000000000000000000000000000000000000000000000000000000000',
        },
        'bundle-manager': {
          issuer: '0x1234567890123456789012345678901234567890',
          clientVersion: 'test-1.0.0',
          moduleName: 'bundle-manager',
          ocaps: [
            {
              type: CapabilityTypes.State,
              data: {
                key: StateKey.BundleTxs,
                operations: [StateOperations.WRITE],
              },
            },
          ],
          salt: 'test-salt-4',
          signature:
            '0x0000000000000000000000000000000000000000000000000000000000000000',
        },
      }

      mockCapabilityIssuer.issueStateCapability
        .mockResolvedValueOnce(mockCapabilities['reputation-manager'])
        .mockResolvedValueOnce(mockCapabilities['deposit-manager'])
        .mockResolvedValueOnce(mockCapabilities['mempool-manager'])
        .mockResolvedValueOnce(mockCapabilities['bundle-manager'])

      const result = await bootstrap()

      expect(result).toEqual(mockCapabilities)
      expect(mockCapabilityIssuer.issueStateCapability).toHaveBeenCalledTimes(4)
    })

    it('should call issueStateCapability with correct parameters for each module', async () => {
      const mockCapability = {
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

      mockCapabilityIssuer.issueStateCapability.mockResolvedValue(
        mockCapability,
      )

      await bootstrap()

      // Verify calls for each module in the registry
      expect(mockCapabilityIssuer.issueStateCapability).toHaveBeenCalledWith({
        moduleName: 'reputation-manager',
        ocaps: STATE_CAPABILITY_REGISTRY['reputation-manager'],
        salt: expect.any(String), // randomSalt() generates different values
      })

      expect(mockCapabilityIssuer.issueStateCapability).toHaveBeenCalledWith({
        moduleName: 'deposit-manager',
        ocaps: STATE_CAPABILITY_REGISTRY['deposit-manager'],
        salt: expect.any(String),
      })

      expect(mockCapabilityIssuer.issueStateCapability).toHaveBeenCalledWith({
        moduleName: 'mempool-manager',
        ocaps: STATE_CAPABILITY_REGISTRY['mempool-manager'],
        salt: expect.any(String),
      })

      expect(mockCapabilityIssuer.issueStateCapability).toHaveBeenCalledWith({
        moduleName: 'bundle-manager',
        ocaps: STATE_CAPABILITY_REGISTRY['bundle-manager'],
        salt: expect.any(String),
      })
    })

    it('should generate unique salt for each capability request', async () => {
      const mockCapability = {
        issuer: '0x1234567890123456789012345678901234567890',
        clientVersion: 'test-1.0.0',
        moduleName: 'test-module',
        ocaps: [],
        salt: 'test-salt',
        signature:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
      }

      mockCapabilityIssuer.issueStateCapability.mockResolvedValue(
        mockCapability,
      )

      await bootstrap()

      const calls = mockCapabilityIssuer.issueStateCapability.mock.calls
      const salts = calls.map((call) => call[0].salt)

      // Verify that each salt is unique
      const uniqueSalts = new Set(salts)
      expect(uniqueSalts.size).toBe(salts.length)
      expect(salts.length).toBe(4) // Number of modules in registry
    })

    it('should handle empty registry', async () => {
      const emptyConfig: StateCapabilitiesBootstrapConfig = {
        capabilityIssuer: mockCapabilityIssuer,
        stateCapabilityRegistry: {},
      }
      const emptyBootstrap = createStateCapabilitiesBootstrap(emptyConfig)

      const result = await emptyBootstrap()

      expect(result).toEqual({})
      expect(mockCapabilityIssuer.issueStateCapability).not.toHaveBeenCalled()
    })

    it('should handle single module registry', async () => {
      const singleModuleConfig: StateCapabilitiesBootstrapConfig = {
        capabilityIssuer: mockCapabilityIssuer,
        stateCapabilityRegistry: {
          'single-module': [
            {
              type: CapabilityTypes.State,
              data: {
                key: StateKey.ReputationEntries,
                operations: [StateOperations.READ],
              },
            },
          ],
        },
      }
      const singleBootstrap =
        createStateCapabilitiesBootstrap(singleModuleConfig)

      const mockCapability = {
        issuer: '0x1234567890123456789012345678901234567890',
        clientVersion: 'test-1.0.0',
        moduleName: 'single-module',
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

      mockCapabilityIssuer.issueStateCapability.mockResolvedValue(
        mockCapability,
      )

      const result = await singleBootstrap()

      expect(result).toEqual({
        'single-module': mockCapability,
      })
      expect(mockCapabilityIssuer.issueStateCapability).toHaveBeenCalledTimes(1)
      expect(mockCapabilityIssuer.issueStateCapability).toHaveBeenCalledWith({
        moduleName: 'single-module',
        ocaps: singleModuleConfig.stateCapabilityRegistry['single-module'],
        salt: expect.any(String),
      })
    })

    it('should handle capability issuance failure', async () => {
      const error = new Error('Capability issuance failed')
      mockCapabilityIssuer.issueStateCapability.mockRejectedValue(error)

      await expect(bootstrap()).rejects.toThrow('Capability issuance failed')
      expect(mockCapabilityIssuer.issueStateCapability).toHaveBeenCalledTimes(1)
    })

    it('should handle partial capability issuance failure', async () => {
      const mockCapability = {
        issuer: '0x1234567890123456789012345678901234567890',
        clientVersion: 'test-1.0.0',
        moduleName: 'test-module',
        ocaps: [],
        salt: 'test-salt',
        signature:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
      }

      const error = new Error('Capability issuance failed')

      mockCapabilityIssuer.issueStateCapability
        .mockResolvedValueOnce(mockCapability) // First call succeeds
        .mockRejectedValueOnce(error) // Second call fails

      await expect(bootstrap()).rejects.toThrow('Capability issuance failed')
      expect(mockCapabilityIssuer.issueStateCapability).toHaveBeenCalledTimes(2)
    })

    it('should preserve module order in result mapping', async () => {
      const mockCapability = {
        issuer: '0x1234567890123456789012345678901234567890',
        clientVersion: 'test-1.0.0',
        moduleName: 'test-module',
        ocaps: [],
        salt: 'test-salt',
        signature:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
      }

      mockCapabilityIssuer.issueStateCapability.mockResolvedValue(
        mockCapability,
      )

      const result = await bootstrap()

      // Verify that the result keys match the registry keys order
      const resultKeys = Object.keys(result)
      const registryKeys = Object.keys(STATE_CAPABILITY_REGISTRY)

      expect(resultKeys).toEqual(registryKeys)
      expect(resultKeys).toHaveLength(4)
      expect(resultKeys).toContain('reputation-manager')
      expect(resultKeys).toContain('deposit-manager')
      expect(resultKeys).toContain('mempool-manager')
      expect(resultKeys).toContain('bundle-manager')
    })

    it('should use readonly config parameters', () => {
      // This test verifies that the function works with readonly config
      const readonlyConfig: Readonly<StateCapabilitiesBootstrapConfig> = {
        capabilityIssuer: mockCapabilityIssuer,
        stateCapabilityRegistry: STATE_CAPABILITY_REGISTRY,
      }

      const readonlyBootstrap = createStateCapabilitiesBootstrap(readonlyConfig)
      expect(typeof readonlyBootstrap).toBe('function')
    })
  })

  describe('edge cases', () => {
    it('should handle registry with modules that have empty capability arrays', async () => {
      const configWithEmptyCapabilities: StateCapabilitiesBootstrapConfig = {
        capabilityIssuer: mockCapabilityIssuer,
        stateCapabilityRegistry: {
          'empty-module': [],
          'normal-module': [
            {
              type: CapabilityTypes.State,
              data: {
                key: StateKey.ReputationEntries,
                operations: [StateOperations.READ],
              },
            },
          ],
        },
      }

      const bootstrapWithEmpty = createStateCapabilitiesBootstrap(
        configWithEmptyCapabilities,
      )

      const mockCapability = {
        issuer: '0x1234567890123456789012345678901234567890',
        clientVersion: 'test-1.0.0',
        moduleName: 'test-module',
        ocaps: [],
        salt: 'test-salt',
        signature:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
      }

      mockCapabilityIssuer.issueStateCapability.mockResolvedValue(
        mockCapability,
      )

      const result = await bootstrapWithEmpty()

      expect(result).toEqual({
        'empty-module': mockCapability,
        'normal-module': mockCapability,
      })
      expect(mockCapabilityIssuer.issueStateCapability).toHaveBeenCalledTimes(2)
    })

    it('should handle multiple bootstrap instances with different configs', async () => {
      const config1: StateCapabilitiesBootstrapConfig = {
        capabilityIssuer: mockCapabilityIssuer,
        stateCapabilityRegistry: {
          'module-1': [
            {
              type: CapabilityTypes.State,
              data: {
                key: StateKey.ReputationEntries,
                operations: [StateOperations.READ],
              },
            },
          ],
        },
      }

      const config2: StateCapabilitiesBootstrapConfig = {
        capabilityIssuer: mockCapabilityIssuer,
        stateCapabilityRegistry: {
          'module-2': [
            {
              type: CapabilityTypes.State,
              data: {
                key: StateKey.StandardPool,
                operations: [StateOperations.WRITE],
              },
            },
          ],
        },
      }

      const bootstrap1 = createStateCapabilitiesBootstrap(config1)
      const bootstrap2 = createStateCapabilitiesBootstrap(config2)

      const mockCapability = {
        issuer: '0x1234567890123456789012345678901234567890',
        clientVersion: 'test-1.0.0',
        moduleName: 'test-module',
        ocaps: [],
        salt: 'test-salt',
        signature:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
      }

      mockCapabilityIssuer.issueStateCapability.mockResolvedValue(
        mockCapability,
      )

      const result1 = await bootstrap1()
      const result2 = await bootstrap2()

      expect(result1).toEqual({ 'module-1': mockCapability })
      expect(result2).toEqual({ 'module-2': mockCapability })
      expect(mockCapabilityIssuer.issueStateCapability).toHaveBeenCalledTimes(2)
    })
  })
})
