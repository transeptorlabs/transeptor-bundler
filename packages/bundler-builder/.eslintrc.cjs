module.exports = {
  extends: ['../../.eslintrc.cjs'],
   overrides: [
    {
      files: ['**/*.ts'],
    },
  ],
  ignorePatterns: [
    'node_modules',
    '!.eslintrc.cjs',
  ],
 }
 