import { Request, Response } from 'express'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  headerChecks,
  validateRequest,
  parseValidRequest,
} from '../../src/rpc/rpc-middleware.js'
import { MockHandlerRegistry } from '../mocks/index.js'

interface ExtendedRequest extends Request {
  validRpcRequest?: any
  parsedRpcRequest?: any
  json?: () => void
}

describe('RPC Middleware', () => {
  let mockReq: Partial<ExtendedRequest>
  let mockRes: Partial<Response>
  let next: () => void

  beforeEach(() => {
    vi.clearAllMocks()
    mockReq = {
      headers: {},
      body: {},
      json: vi.fn(),
    }
    mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    }
    next = vi.fn()
  })

  describe('headerChecks', () => {
    it('should pass with valid content-type', () => {
      mockReq.headers = { 'content-type': 'application/json' }
      headerChecks(mockReq as ExtendedRequest, mockRes as Response, next)
      expect(next).toHaveBeenCalled()
      expect(mockRes.json).not.toHaveBeenCalled()
    })

    it('should reject invalid content-type', () => {
      mockReq.headers = { 'content-type': 'text/plain' }
      headerChecks(mockReq as ExtendedRequest, mockRes as Response, next)
      expect(next).not.toHaveBeenCalled()
      expect(mockRes.json).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32600,
          message: 'Invalid Request',
          data: 'Invalid content type',
        },
      })
    })
  })

  describe('validateRequest', () => {
    const validateRequestMiddleware = validateRequest(['web3', 'eth', 'debug'])

    it('should pass valid request', () => {
      mockReq.body = {
        jsonrpc: '2.0',
        method: 'web3_clientVersion',
        params: [],
        id: 1,
      }
      validateRequestMiddleware(
        mockReq as ExtendedRequest,
        mockRes as Response,
        next,
      )
      expect(next).toHaveBeenCalled()
      expect(mockRes.json).not.toHaveBeenCalled()
    })

    it('should reject invalid jsonrpc version', () => {
      mockReq.body = {
        jsonrpc: '1.0',
        method: 'web3_clientVersion',
        params: [],
        id: 1,
      }
      validateRequestMiddleware(
        mockReq as ExtendedRequest,
        mockRes as Response,
        next,
      )
      expect(next).not.toHaveBeenCalled()
      expect(mockRes.json).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32600,
          message: 'Invalid Request, jsonrpc must be exactly "2.0"',
          data: undefined,
        },
      })
    })

    it('should reject unsupported method prefix', () => {
      mockReq.body = {
        jsonrpc: '2.0',
        method: 'unsupported_method',
        params: [],
        id: 1,
      }
      validateRequestMiddleware(
        mockReq as ExtendedRequest,
        mockRes as Response,
        next,
      )
      expect(next).not.toHaveBeenCalled()
      expect(mockRes.json).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32600,
          message:
            'Method unsupported_method is not supported. Make sure the API is enabled in the config',
          data: undefined,
        },
      })
    })
  })

  describe('parseValidRequest', () => {
    const parseValidRequestMiddleware = parseValidRequest(MockHandlerRegistry)

    it('should parse valid request', () => {
      mockReq.validRpcRequest = {
        jsonrpc: '2.0',
        method: 'web3_clientVersion',
        params: [],
        id: 1,
      }
      parseValidRequestMiddleware(
        mockReq as ExtendedRequest,
        mockRes as Response,
        next,
      )
      expect(next).toHaveBeenCalled()
      expect(mockRes.json).not.toHaveBeenCalled()
      expect(mockReq.parsedRpcRequest).toBeDefined()
      expect(mockReq.parsedRpcRequest?.method).toBe('web3_clientVersion')
    })

    it('should reject invalid params', () => {
      mockReq.validRpcRequest = {
        jsonrpc: '2.0',
        method: 'web3_clientVersion',
        params: ['invalid'],
        id: undefined,
      }
      parseValidRequestMiddleware(
        mockReq as ExtendedRequest,
        mockRes as Response,
        next,
      )
      expect(next).not.toHaveBeenCalled()
      expect(mockRes.json).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: undefined,
        error: {
          code: -32602,
          message: 'Invalid params for method web3_clientVersion',
          data: undefined,
        },
      })
    })

    it('should reject unsupported method', () => {
      mockReq.validRpcRequest = {
        jsonrpc: '2.0',
        method: 'unsupported_method',
        params: [],
        id: undefined,
      }
      parseValidRequestMiddleware(
        mockReq as ExtendedRequest,
        mockRes as Response,
        next,
      )
      expect(next).not.toHaveBeenCalled()
      expect(mockRes.json).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: undefined,
        error: {
          code: -32600,
          message: 'Method unsupported_method is not supported',
          data: undefined,
        },
      })
    })
  })
})
