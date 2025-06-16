import { describe, expect, test } from 'vitest'
import { withReadonly } from '../../src/utils/index.js'
import { createLogger } from '../../src/logger/index.js'

describe('withReadonly', () => {
  test('should make a simple object readonly', () => {
    const deps = { name: 'test', value: 42 }
    const createModule = (deps: Readonly<{ name: string; value: number }>) =>
      deps
    const wrapped = withReadonly(createModule)(deps)

    expect(() => {
      ;(wrapped as any).name = 'modified'
    }).toThrow()
  })

  test('should make nested objects readonly', () => {
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

  test('should handle arrays correctly', () => {
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

  test('should preserve original values', () => {
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

  test('should handle primitive values', () => {
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

  test('should throw error for class instances', () => {
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

  test('should handle empty objects and arrays', () => {
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

  test('should skip freezing Pino logger instances', () => {
    const mockPinoLogger = createLogger()

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
