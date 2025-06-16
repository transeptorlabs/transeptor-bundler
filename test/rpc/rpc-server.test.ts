import { describe, it, vi, expect, beforeEach } from 'vitest'
import { createRpcServerWithHandlers } from '../../src/rpc/rpc-server.js'
import {
  RpcError,
  RpcServer,
  type HandlerRegistry,
} from '../../src/types/index.js'
import express, { Express, Request, Response, NextFunction } from 'express'
import { createServer } from 'http'
import { MockHandlerRegistry, mockLogger } from '../mocks/index.js'
import { Either } from '../../src/monad/index.js'

// Mock dependencies
let rpcHandler: (req: any, res: any) => Promise<void>

vi.mock('express', () => {
  const jsonMiddleware = vi
    .fn()
    .mockReturnValue((req: Request, res: Response, next: NextFunction) =>
      next(),
    )

  const mockUse = vi.fn()
  const mockPost = vi.fn((path: string, handler: any) => {
    rpcHandler = handler
  })

  const mockApp = {
    use: mockUse,
    post: mockPost,
  }

  const mockExpress = vi.fn(() => mockApp) as unknown as {
    (): Express
    json: typeof jsonMiddleware
  }
  mockExpress.json = jsonMiddleware

  return {
    __esModule: true,
    default: mockExpress,
  }
})

vi.mock('http', () => ({
  createServer: vi.fn((_handler) => ({
    listen: vi.fn((port, cb) => cb()),
    close: vi.fn((cb) => cb()),
  })),
}))

vi.mock('cors', () => ({
  default: vi
    .fn()
    .mockReturnValue((req: Request, res: Response, next: NextFunction) =>
      next(),
    ),
}))

vi.mock('helmet', () => ({
  default: vi
    .fn()
    .mockReturnValue((req: Request, res: Response, next: NextFunction) =>
      next(),
    ),
}))

describe('RPC Server', () => {
  const mockHandlerRegistry: HandlerRegistry = MockHandlerRegistry
  let mockPreflightCheck: () => Promise<void>
  let mockExpress: typeof express
  const mockSupportedApiPrefixes = ['eth', 'web3', 'debug']
  let server: RpcServer

  beforeEach(() => {
    vi.clearAllMocks()
    mockExpress = vi.mocked(express)

    mockPreflightCheck = vi.fn().mockResolvedValue(undefined)
    server = createRpcServerWithHandlers({
      handlerRegistry: mockHandlerRegistry,
      supportedApiPrefixes: mockSupportedApiPrefixes,
      port: 3000,
      logger: mockLogger,
    })
  })

  describe('start', () => {
    it('should start server successfully', async () => {
      await server.start(mockPreflightCheck)

      expect(mockPreflightCheck).toHaveBeenCalled()
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Node listening on http://localhost:3000/rpc',
      )
    })

    it('should handle preflight check failure', async () => {
      const error = new Error('Preflight check failed')
      vi.mocked(mockPreflightCheck).mockRejectedValue(error)

      await expect(server.start(mockPreflightCheck)).rejects.toThrow(error)
      expect(mockLogger.error).toHaveBeenCalledWith(
        { error: 'Preflight check failed' },
        'Preflight check failed',
      )
    })
  })

  describe('stop', () => {
    it('should stop server successfully', async () => {
      await server.stop()
      expect(mockLogger.info).toHaveBeenCalledWith('Stopping server')
    })

    it('should handle server closure error', async () => {
      const error = new Error('Server closure failed')
      vi.mocked(createServer).mockReturnValue({
        listen: vi.fn(),
        close: vi.fn((cb) => cb(error)),
      } as any)

      await expect(
        createRpcServerWithHandlers({
          handlerRegistry: mockHandlerRegistry,
          supportedApiPrefixes: mockSupportedApiPrefixes,
          port: 3000,
          logger: mockLogger,
        }).stop(),
      ).rejects.toThrow(error)
      expect(mockLogger.error).toHaveBeenCalledWith(
        { error: 'Server closure failed' },
        'Failed to close server',
      )
    })
  })

  describe('RPC endpoint handling', () => {
    it('should register RPC endpoint with correct middleware', async () => {
      await server.start(mockPreflightCheck)

      const app = mockExpress()
      expect(app.use).toHaveBeenCalled()
      expect(app.post).toHaveBeenCalledWith('/rpc', expect.any(Function))
    })

    it('should handle RPC request with correct response', async () => {
      await server.start(mockPreflightCheck)

      const mockReq = {
        parsedRpcRequest: {
          id: 1,
          method: 'web3_clientVersion',
          params: [],
          handlerFunc: mockHandlerRegistry.web3_clientVersion.handlerFunc,
        },
      }

      const mockRes = {
        json: vi.fn(),
      }

      await rpcHandler(mockReq, mockRes)

      expect(mockRes.json).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: 1,
        result: 'transeptor-bundler/1.0.0',
      })
    })

    it('should handle RPC request with known error response', async () => {
      await server.start(mockPreflightCheck)

      const mockReq = {
        parsedRpcRequest: {
          id: 1,
          method: 'eth_getUserOperationReceipt',
          params: [''],
          handlerFunc: vi
            .fn()
            .mockResolvedValue(
              Either.Left(new RpcError('Missing/invalid userOpHash', -32602)),
            ),
        },
      }

      const mockRes = {
        json: vi.fn(),
      }

      vi.clearAllMocks() // Clear previous mock calls
      await rpcHandler(mockReq, mockRes)

      expect(mockRes.json).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32602,
          message: 'Missing/invalid userOpHash',
          data: undefined,
        },
      })
      expect(mockLogger.error).toHaveBeenCalledWith(
        { error: 'Missing/invalid userOpHash' },
        `<--- Error handling method requestId(${mockReq.parsedRpcRequest.id})`,
      )
    })

    it('should handle RPC request with unknown error', async () => {
      await server.start(mockPreflightCheck)

      const mockReq = {
        parsedRpcRequest: {
          id: 1,
          method: 'web3_clientVersion',
          params: [],
          handlerFunc: mockHandlerRegistry.web3_clientVersion.handlerFunc,
        },
      }

      const mockRes = {
        json: vi.fn(),
      }

      const error = new Error('Unknown error')
      vi.spyOn(
        mockHandlerRegistry.web3_clientVersion,
        'handlerFunc',
      ).mockRejectedValue(error)

      await rpcHandler(mockReq, mockRes)

      expect(mockRes.json).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32000,
          message: 'Unknown error',
          data: undefined,
        },
      })
      expect(mockLogger.error).toHaveBeenCalledWith(
        { error: 'Unknown error' },
        `<--- Unknown error handling method requestId(${mockReq.parsedRpcRequest.id})`,
      )
    })
  })
})
