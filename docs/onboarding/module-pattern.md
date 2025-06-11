# Module Pattern: Using readonlyWrapper + Currying

## Why We Do This

To enforce immutability across the codebase, we use a combination of:

- **TypeScript's Readonly<T>** – compile-time safety (prevents accidental mutation of module dependencies)
- **JavaScript's Object.freeze()** – runtime safety (throws or silently fails on mutation)
- **Currying the factory function** – enforces consistency so readonlyWrapper is always applied
- **Avoid classes** - Avoid classes altogether and use plain objects + functions (FP style), which fits better with immutability.

This protects against unexpected mutations in shared dependencies and ensures modules are pure, predictable, and safe by default.

Use the `withReadonly()` Higher-order function to automatically wrap dependencies. The `withReadonly()` wrapper is not required when a module does not have dependencies.

> :warning: **When you do need immutability with classes:**
If you want immutability with classes, use TypeScript readonly types (Readonly<T> or as const) at compile-time without applying `withReadonly()` wrapper.
>

## Usage Example


**`module/example-module.ts`(Mock Example)**

```ts
import { withReadonly } from '../utils/index.js'

type ExampleDeps = {
  logger: { log: (msg: string) => void }
  config: { mode: string }
}

type ExampleModule = {
  run: () => void
}

// Internal implementation: receives frozen, readonly deps
function _createExampleModule(deps: Readonly<ExampleDeps>): ExampleModule {
  deps.logger.log('Creating ExampleModule...')

  return {
    run: () => {
      deps.logger.log(`Running in mode: ${deps.config.mode}`)
    },
  }
}

// Exported factory: automatically freezes and marks deps readonly
export const createExampleModule = withReadonly<ExampleDeps, ExampleModule>(_createExampleModule)
```

**Usage ExampleModule (Mock)**

```ts
import { createExampleModule } from './module/example-module.js'

const deps = {
  logger: { log: (msg: string) => console.log(`[Log]: ${msg}`) },
  config: { mode: 'dev' },
}

const example = createExampleModule(deps)

example.run() // ➜ [Log]: Creating ExampleModule...
// ➜ [Log]: Running in mode: dev

// 🚫 Mutation blocked at compile-time:
// deps.config.mode = 'prod'

// 🚫 Mutation blocked at runtime:
// Object.freeze prevents this from taking effect:
;(deps.config as any).mode = 'prod'
example.run() // Still runs in "dev" mode
```
