import { defineConfig } from 'vitest/config'

// TODO: Waiting on support for hardhat to support ESM in TypeScript projects to improve testing
// https://github.com/NomicFoundation/hardhat/issues/3385
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: [],
    setupFiles: './vitest.setup.ts',
    environment: 'node',
  },
})
