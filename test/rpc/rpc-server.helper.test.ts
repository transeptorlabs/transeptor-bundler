import { describe, it, expect, beforeEach, vi } from 'vitest'

import { Either } from '../../src/monad/either.js'
import { doHandleRequest } from '../../src/rpc/rpc-server.helper.js'
import { RpcError } from '../../src/types/error.types.js'
import type { ValidatedJsonRpcRequest } from '../../src/types/rpc.types.js'

vi.mock('../../src/logger/index.js', () => ({
  Logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('RPC Server Helpers', () => {
  describe('RPC Handler', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    describe('doHandleRequest', () => {
      it('should handle successful request with direct response', async () => {
        const request: ValidatedJsonRpcRequest<any> = {
          id: 1,
          method: 'test_method',
          params: [],
          handlerFunc: async () => 'success',
          validationFunc: () => true,
        }

        const result = await doHandleRequest(request)

        expect(result).toEqual(
          Either.Right({
            jsonrpc: '2.0',
            id: 1,
            result: 'success',
          }),
        )
      })

      it('should handle successful request with Either.Right response', async () => {
        const request: ValidatedJsonRpcRequest<any> = {
          id: 2,
          method: 'test_method',
          params: [],
          handlerFunc: async () => Either.Right('success'),
          validationFunc: () => true,
        }

        const result = await doHandleRequest(request)

        expect(result).toEqual(
          Either.Right({
            jsonrpc: '2.0',
            id: 2,
            result: 'success',
          }),
        )
      })

      it('should handle request with Either.Left response', async () => {
        const error = new RpcError('Test error', -32000)
        const request: ValidatedJsonRpcRequest<any> = {
          id: 3,
          method: 'test_method',
          params: [],
          handlerFunc: async () => Either.Left(error),
          validationFunc: () => true,
        }

        const result = await doHandleRequest(request)

        expect(result).toEqual(Either.Left(error))
      })

      it('should handle request with complex response object', async () => {
        const complexResponse = {
          data: {
            value: 123,
            nested: {
              field: 'test',
            },
          },
          status: 'ok',
        }
        const request: ValidatedJsonRpcRequest<any> = {
          id: 4,
          method: 'test_method',
          params: [],
          handlerFunc: async () => complexResponse,
          validationFunc: () => true,
        }

        const result = await doHandleRequest(request)

        expect(result).toEqual(
          Either.Right({
            jsonrpc: '2.0',
            id: 4,
            result: {
              data: {
                value: '0x7b', // 123 in hex
                nested: {
                  field: 'test',
                },
              },
              status: 'ok',
            },
          }),
        )
      })

      it('should handle request with array parameters', async () => {
        const params = ['param1', 'param2']
        const request: ValidatedJsonRpcRequest<any> = {
          id: 5,
          method: 'test_method',
          params,
          handlerFunc: async (p) => p,
          validationFunc: () => true,
        }

        const result = await doHandleRequest(request)

        expect(result).toEqual(
          Either.Right({
            jsonrpc: '2.0',
            id: 5,
            result: params,
          }),
        )
      })

      it('should handle request with null response', async () => {
        const request: ValidatedJsonRpcRequest<any> = {
          id: 6,
          method: 'test_method',
          params: [],
          handlerFunc: async () => null,
          validationFunc: () => true,
        }

        const result = await doHandleRequest(request)

        expect(result).toEqual(
          Either.Right({
            jsonrpc: '2.0',
            id: 6,
            result: null,
          }),
        )
      })
    })
  })
})
