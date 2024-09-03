module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint/eslint-plugin', '@typescript-eslint', 'jsdoc'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:jsdoc/recommended',
  ],
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': 'error',
    'no-debugger': 'warn',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    "varsIgnorePattern": "^_",
    semi: ['error', 'never'],
    quotes: ['error', 'single'],
    '@typescript-eslint/no-unused-vars': 'error',

    // JSDoc-specific rules
    'jsdoc/check-alignment': 'warn', // Ensures JSDoc comments are aligned
    'jsdoc/check-param-names': 'error', // Validates JSDoc parameter names
    'jsdoc/check-tag-names': 'error', // Validates JSDoc tag names
    'jsdoc/check-types': 'error', // Validates JSDoc type names
    'jsdoc/require-param': 'error', // Requires JSDoc param
    'jsdoc/require-returns': 'error', // Requires JSDoc returns if a function has a return statement
    "jsdoc/tag-lines": ["error", "any",{"startLines":1}], // Requires JSDoc: Expected only 1 line after block description
    "jsdoc/require-returns-type": ["off", {"contexts":["never"]}],
    "jsdoc/require-param-type": ["off", {"contexts":["never"]}]
  },
  ignorePatterns: [
    'node_modules',
    '.eslintrc.cjs',
    '**/*.js', // Ignore tracer file
    '**/.cache',
    '**/dist'
  ],
  overrides: [
    {
      files: ['*.ts'],
    },
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  settings: {
    jsdoc: {
      mode: 'typescript', // Enable TypeScript support in JSDoc
    },
  },
}