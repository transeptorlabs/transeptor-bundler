import { describe, expect, it } from 'vitest'

import { createLogger } from '../../src/logger/index.js'
import { withReadonly } from '../../src/utils/index.js'

describe('withReadonly', () => {
  it('should make a simple object readonly', () => {
    const deps = { name: 'test', value: 42 }
    const createModule = (deps: Readonly<{ name: string; value: number }>) =>
      deps
    const wrapped = withReadonly(createModule)(deps)

    expect(() => {
      ;(wrapped as any).name = 'modified'
    }).toThrow()
  })

  it('should make nested objects readonly', () => {
    const deps = {
      config: {
        settings: {
          enabled: true,
          options: ['a', 'b', 'c'],
        },
      },
    }
    const createModule = (
      deps: Readonly<{
        config: { settings: { enabled: boolean; options: string[] } }
      }>,
    ) => deps
    const wrapped = withReadonly(createModule)(deps)

    expect(() => {
      ;(wrapped.config.settings as any).enabled = false
    }).toThrow()

    expect(() => {
      ;(wrapped.config.settings.options as any).push('d')
    }).toThrow()
  })

  it('should handle arrays correctly', () => {
    const deps = {
      items: [1, 2, 3],
      nested: [{ id: 1 }, { id: 2 }],
    }
    const createModule = (
      deps: Readonly<{ items: number[]; nested: Array<{ id: number }> }>,
    ) => deps
    const wrapped = withReadonly(createModule)(deps)

    expect(() => {
      ;(wrapped.items as any).push(4)
    }).toThrow()

    expect(() => {
      ;(wrapped.nested[0] as any).id = 3
    }).toThrow()
  })

  it('should preserve original values', () => {
    const deps = {
      name: 'test',
      numbers: [1, 2, 3],
      nested: { value: 42 },
    }
    const createModule = (
      deps: Readonly<{
        name: string
        numbers: number[]
        nested: { value: number }
      }>,
    ) => deps
    const wrapped = withReadonly(createModule)(deps)

    expect(wrapped.name).toBe('test')
    expect(wrapped.numbers).toEqual([1, 2, 3])
    expect(wrapped.nested.value).toBe(42)
  })

  it('should handle primitive values', () => {
    const deps = {
      str: 'test',
      num: 42,
      bool: true,
      null: null,
      undefined: undefined,
    }
    const createModule = (
      deps: Readonly<{
        str: string
        num: number
        bool: boolean
        null: null
        undefined: undefined
      }>,
    ) => deps
    const wrapped = withReadonly(createModule)(deps)

    expect(wrapped.str).toBe('test')
    expect(wrapped.num).toBe(42)
    expect(wrapped.bool).toBe(true)
    expect(wrapped.null).toBe(null)
    expect(wrapped.undefined).toBe(undefined)
  })

  it('should throw error for class instances', () => {
    class TestClass {
      value = 42
    }

    const deps = {
      instance: new TestClass(),
    }
    const createModule = (deps: Readonly<{ instance: TestClass }>) => deps

    expect(() => {
      withReadonly(createModule)(deps)
    }).toThrow('deepFreezeClone only supports plain objects and arrays')
  })

  it('should handle empty objects and arrays', () => {
    const deps = {
      emptyObj: {},
      emptyArr: [],
    }
    const createModule = (
      deps: Readonly<{ emptyObj: Record<string, never>; emptyArr: never[] }>,
    ) => deps
    const wrapped = withReadonly(createModule)(deps)

    expect(wrapped.emptyObj).toEqual({})
    expect(wrapped.emptyArr).toEqual([])
  })

  it('should skip freezing Pino logger instances', () => {
    const mockPinoLogger = createLogger('error')

    const deps = {
      logger: mockPinoLogger,
      config: { enabled: true },
    }
    const createModule = (
      deps: Readonly<{
        logger: typeof mockPinoLogger
        config: { enabled: boolean }
      }>,
    ) => deps
    const wrapped = withReadonly(createModule)(deps)

    // Verify the logger is not frozen
    expect(() => {
      wrapped.logger.info = () => undefined
    }).not.toThrow()

    // Verify other properties are still frozen
    expect(() => {
      ;(wrapped.config as any).enabled = false
    }).toThrow()
  })
})
