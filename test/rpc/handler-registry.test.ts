import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createBundlerHandlerRegistry } from '../../src/rpc/bundler-handler-registry.js'
import { mockEth, mockWeb3, mockDebug } from '../mocks/index.js'
import type { HandlerRegistry } from '../../src/types/index.js'

describe('Handler Registry', () => {
  let handlerRegistry: HandlerRegistry

  beforeEach(() => {
    vi.clearAllMocks()
    handlerRegistry = createBundlerHandlerRegistry({
      eth: mockEth,
      web3: mockWeb3,
      debug: mockDebug,
    })
  })

  describe('web3_clientVersion', () => {
    it('should return client version', async () => {
      mockWeb3.clientVersion.mockResolvedValue('transeptor-bundler/1.0.0')
      const result = await handlerRegistry.web3_clientVersion.handlerFunc([])
      expect(result).toBe('transeptor-bundler/1.0.0')
      expect(mockWeb3.clientVersion).toHaveBeenCalled()
    })

    it('should reject invalid params', async () => {
      const isValid = handlerRegistry.web3_clientVersion.validationFunc([
        'invalid',
      ])
      expect(isValid).toBe(false)
    })
  })

  describe('eth_chainId', () => {
    it('should return chain ID', async () => {
      mockEth.getChainId.mockResolvedValue(1)
      const result = await handlerRegistry.eth_chainId.handlerFunc([])
      expect(result).toBe(1)
      expect(mockEth.getChainId).toHaveBeenCalled()
    })

    it('should reject invalid params', async () => {
      const isValid = handlerRegistry.eth_chainId.validationFunc(['invalid'])
      expect(isValid).toBe(false)
    })
  })

  describe('eth_supportedEntryPoints', () => {
    it('should return supported entry points', async () => {
      const entryPoints = ['0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789']
      mockEth.getSupportedEntryPoints.mockResolvedValue(entryPoints)
      const result = await handlerRegistry.eth_supportedEntryPoints.handlerFunc(
        [],
      )
      expect(result).toEqual(entryPoints)
      expect(mockEth.getSupportedEntryPoints).toHaveBeenCalled()
    })

    it('should reject invalid params', async () => {
      const isValid = handlerRegistry.eth_supportedEntryPoints.validationFunc([
        'invalid',
      ])
      expect(isValid).toBe(false)
    })
  })

  describe('eth_sendUserOperation', () => {
    it('should send user operation', async () => {
      const userOp = {
        sender: '0x123',
        nonce: '0x0',
        initCode: '0x',
        callData: '0x',
        callGasLimit: '0x0',
        verificationGasLimit: '0x0',
        preVerificationGas: '0x0',
        maxFeePerGas: '0x0',
        maxPriorityFeePerGas: '0x0',
        paymasterAndData: '0x',
        signature: '0x',
      }
      const entryPoint = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'
      mockEth.sendUserOperation.mockResolvedValue('0x456')
      const result = await handlerRegistry.eth_sendUserOperation.handlerFunc([
        userOp,
        entryPoint,
      ])
      expect(result).toBe('0x456')
      expect(mockEth.sendUserOperation).toHaveBeenCalledWith(userOp, entryPoint)
    })

    it('should reject invalid params', async () => {
      const isValid = handlerRegistry.eth_sendUserOperation.validationFunc([
        'invalid',
      ])
      expect(isValid).toBe(false)
    })
  })

  describe('eth_estimateUserOperationGas', () => {
    it('should estimate user operation gas', async () => {
      const userOp = {
        sender: '0x123',
        nonce: '0x0',
        initCode: '0x',
        callData: '0x',
        callGasLimit: '0x0',
        verificationGasLimit: '0x0',
        preVerificationGas: '0x0',
        maxFeePerGas: '0x0',
        maxPriorityFeePerGas: '0x0',
        paymasterAndData: '0x',
        signature: '0x',
      }
      const entryPoint = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'
      const expectedGas = {
        callGasLimit: '0x1',
        preVerificationGas: '0x2',
        verificationGasLimit: '0x3',
      }
      mockEth.estimateUserOperationGas.mockResolvedValue(expectedGas)
      const result =
        await handlerRegistry.eth_estimateUserOperationGas.handlerFunc([
          userOp,
          entryPoint,
        ])
      expect(result).toEqual(expectedGas)
      expect(mockEth.estimateUserOperationGas).toHaveBeenCalledWith(
        userOp,
        entryPoint,
        undefined,
      )
    })

    it('should reject invalid params', async () => {
      const isValid =
        handlerRegistry.eth_estimateUserOperationGas.validationFunc(['invalid'])
      expect(isValid).toBe(false)
    })
  })

  describe('eth_getUserOperationReceipt', () => {
    it('should get user operation receipt', async () => {
      const hash = '0x123'
      const expectedReceipt = { success: true, receipt: {} }
      mockEth.getUserOperationReceipt.mockResolvedValue(expectedReceipt)
      const result =
        await handlerRegistry.eth_getUserOperationReceipt.handlerFunc([hash])
      expect(result).toEqual(expectedReceipt)
      expect(mockEth.getUserOperationReceipt).toHaveBeenCalledWith(hash)
    })

    it('should reject invalid params', async () => {
      const isValid =
        handlerRegistry.eth_getUserOperationReceipt.validationFunc(['invalid'])
      expect(isValid).toBe(true)
    })
  })

  describe('eth_getUserOperationByHash', () => {
    it('should get user operation by hash', async () => {
      const hash = '0x123'
      const expectedOp = { userOperation: {}, entryPoint: '0x123' }
      mockEth.getUserOperationByHash.mockResolvedValue(expectedOp)
      const result =
        await handlerRegistry.eth_getUserOperationByHash.handlerFunc([hash])
      expect(result).toEqual(expectedOp)
      expect(mockEth.getUserOperationByHash).toHaveBeenCalledWith(hash)
    })

    it('should reject invalid params', async () => {
      const isValid = handlerRegistry.eth_getUserOperationByHash.validationFunc(
        ['invalid'],
      )
      expect(isValid).toBe(true)
    })
  })

  describe('debug_bundler_clearState', () => {
    it('should clear state', async () => {
      mockDebug.clearState.mockResolvedValue('ok')
      const result = await handlerRegistry.debug_bundler_clearState.handlerFunc(
        [],
      )
      expect(result).toBe('ok')
      expect(mockDebug.clearState).toHaveBeenCalled()
    })

    it('should reject invalid params', async () => {
      const isValid = handlerRegistry.debug_bundler_clearState.validationFunc([
        'invalid',
      ])
      expect(isValid).toBe(false)
    })
  })

  describe('debug_bundler_dumpMempool', () => {
    it('should dump mempool', async () => {
      const expectedMempool = []
      mockDebug.dumpMempool.mockResolvedValue(expectedMempool)
      const result =
        await handlerRegistry.debug_bundler_dumpMempool.handlerFunc([])
      expect(result).toEqual(expectedMempool)
      expect(mockDebug.dumpMempool).toHaveBeenCalled()
    })

    it('should reject invalid params', async () => {
      const isValid = handlerRegistry.debug_bundler_dumpMempool.validationFunc([
        'invalid',
      ])
      expect(isValid).toBe(true)
    })
  })

  describe('debug_bundler_clearMempool', () => {
    it('should clear mempool', async () => {
      mockDebug.clearMempool.mockResolvedValue('ok')
      const result =
        await handlerRegistry.debug_bundler_clearMempool.handlerFunc([])
      expect(result).toBe('ok')
      expect(mockDebug.clearMempool).toHaveBeenCalled()
    })

    it('should reject invalid params', async () => {
      const isValid = handlerRegistry.debug_bundler_clearMempool.validationFunc(
        ['invalid'],
      )
      expect(isValid).toBe(false)
    })
  })

  describe('debug_bundler_sendBundleNow', () => {
    it('should send bundle now', async () => {
      const expectedResult = { transactionHash: '0x123', userOpHashes: [] }
      mockDebug.sendBundleNow.mockResolvedValue(expectedResult)
      const result =
        await handlerRegistry.debug_bundler_sendBundleNow.handlerFunc([])
      expect(result).toEqual(expectedResult)
      expect(mockDebug.sendBundleNow).toHaveBeenCalled()
    })

    it('should return ok when no transaction hash and no user op hashes', async () => {
      mockDebug.sendBundleNow.mockResolvedValue({
        transactionHash: '',
        userOpHashes: [],
      })
      const result =
        await handlerRegistry.debug_bundler_sendBundleNow.handlerFunc([])
      expect(result).toBe('ok')
      expect(mockDebug.sendBundleNow).toHaveBeenCalled()
    })

    it('should reject invalid params', async () => {
      const isValid =
        handlerRegistry.debug_bundler_sendBundleNow.validationFunc(['invalid'])
      expect(isValid).toBe(false)
    })
  })

  describe('debug_bundler_setBundlingMode', () => {
    it('should set bundling mode', async () => {
      mockDebug.setBundlingMode.mockResolvedValue('ok')
      const result =
        await handlerRegistry.debug_bundler_setBundlingMode.handlerFunc([
          'manual',
        ])
      expect(result).toBe('ok')
      expect(mockDebug.setBundlingMode).toHaveBeenCalledWith('manual')
    })

    it('should reject invalid params', async () => {
      const isValid =
        handlerRegistry.debug_bundler_setBundlingMode.validationFunc([
          'invalid',
        ])
      expect(isValid).toBe(false)
    })
  })

  describe('debug_bundler_setBundleInterval', () => {
    it('should set bundle interval', async () => {
      mockDebug.setBundleInterval.mockResolvedValue('ok')
      const result =
        await handlerRegistry.debug_bundler_setBundleInterval.handlerFunc([
          1000,
        ])
      expect(result).toBe('ok')
      expect(mockDebug.setBundleInterval).toHaveBeenCalled()
    })

    it('should reject invalid params', async () => {
      const isValid =
        handlerRegistry.debug_bundler_setBundleInterval.validationFunc([
          'invalid',
        ])
      expect(isValid).toBe(false)
    })
  })

  describe('debug_bundler_setReputation', () => {
    it('should set reputation', async () => {
      const reputationEntries = [
        { address: '0x123', opsSeen: 1, opsIncluded: 1 },
      ]
      const entryPoint = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'
      mockDebug.setReputation.mockResolvedValue('ok')
      const result =
        await handlerRegistry.debug_bundler_setReputation.handlerFunc([
          reputationEntries,
          entryPoint,
        ])
      expect(result).toBe('ok')
      expect(mockDebug.setReputation).toHaveBeenCalledWith(
        reputationEntries,
        entryPoint,
      )
    })

    it('should reject invalid params', async () => {
      const isValid =
        handlerRegistry.debug_bundler_setReputation.validationFunc(['invalid'])
      expect(isValid).toBe(false)
    })
  })

  describe('debug_bundler_dumpReputation', () => {
    it('should dump reputation', async () => {
      const expectedReputation = []
      mockDebug.dumpReputation.mockResolvedValue(expectedReputation)
      const result =
        await handlerRegistry.debug_bundler_dumpReputation.handlerFunc([
          '0x123',
        ])
      expect(result).toEqual(expectedReputation)
      expect(mockDebug.dumpReputation).toHaveBeenCalledWith('0x123')
    })

    it('should reject invalid params', async () => {
      const isValid =
        handlerRegistry.debug_bundler_dumpReputation.validationFunc(['invalid'])
      expect(isValid).toBe(true)
    })
  })

  describe('debug_bundler_clearReputation', () => {
    it('should clear reputation', async () => {
      mockDebug.clearReputation.mockResolvedValue('ok')
      const result =
        await handlerRegistry.debug_bundler_clearReputation.handlerFunc([])
      expect(result).toBe('ok')
      expect(mockDebug.clearReputation).toHaveBeenCalled()
    })

    it('should reject invalid params', async () => {
      const isValid =
        handlerRegistry.debug_bundler_clearReputation.validationFunc([
          'invalid',
        ])
      expect(isValid).toBe(false)
    })
  })

  describe('debug_bundler_addUserOps', () => {
    it('should add user operations', async () => {
      const userOps = [
        {
          sender: '0x123',
          nonce: '0x0',
          initCode: '0x',
          callData: '0x',
          callGasLimit: '0x0',
          verificationGasLimit: '0x0',
          preVerificationGas: '0x0',
          maxFeePerGas: '0x0',
          maxPriorityFeePerGas: '0x0',
          paymasterAndData: '0x',
          signature: '0x',
        },
      ]
      mockDebug.addUserOps.mockResolvedValue('ok')
      const result = await handlerRegistry.debug_bundler_addUserOps.handlerFunc(
        [userOps],
      )
      expect(result).toBe('ok')
      expect(mockDebug.addUserOps).toHaveBeenCalledWith(userOps)
    })

    it('should reject invalid params', async () => {
      const isValid = handlerRegistry.debug_bundler_addUserOps.validationFunc([
        'invalid',
      ])
      expect(isValid).toBe(false)
    })
  })

  describe('debug_bundler_getStakeStatus', () => {
    it('should get stake status', async () => {
      const address = '0x123'
      const entryPoint = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'
      const expectedStatus = {
        stakeInfo: {
          addr: '0x123',
          stake: BigInt(1000),
          unstakeDelaySec: 1000,
        },
        isStaked: true,
      }
      mockDebug.getStakeStatus.mockResolvedValue(expectedStatus)
      const result =
        await handlerRegistry.debug_bundler_getStakeStatus.handlerFunc([
          address,
          entryPoint,
        ])
      expect(result).toEqual(expectedStatus)
      expect(mockDebug.getStakeStatus).toHaveBeenCalledWith(address, entryPoint)
    })

    it('should reject invalid params', async () => {
      const isValid =
        handlerRegistry.debug_bundler_getStakeStatus.validationFunc(['invalid'])
      expect(isValid).toBe(false)
    })
  })

  describe('debug_bundler_setConfiguration', () => {
    it('should set configuration', async () => {
      const config = { maxFeePerGas: '0x0', maxPriorityFeePerGas: '0x0' }
      mockDebug.setGasConfig.mockResolvedValue('ok')
      const result =
        await handlerRegistry.debug_bundler_setConfiguration.handlerFunc([
          config,
        ])
      expect(result).toBe('ok')
      expect(mockDebug.setGasConfig).toHaveBeenCalledWith(config)
    })

    it('should reject invalid params', async () => {
      const isValid =
        handlerRegistry.debug_bundler_setConfiguration.validationFunc([
          'invalid',
        ])
      expect(isValid).toBe(false)
    })
  })
})
