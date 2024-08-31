import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.ts'],
    exclude: ['test/test-helpers.ts'],
    environment: 'node', // or 'jsdom' depending on your test environment needs
  },
})