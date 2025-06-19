module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  overrides: [
    {
      files: ['src/**/*.ts'],
    },
  ],
  plugins: ['@typescript-eslint', 'jsdoc', 'prettier', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:jsdoc/recommended',
    'plugin:prettier/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
  ],
  rules: {
    "complexity": ["warn", { "max": 10 }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': 'error',
    'no-debugger': 'warn',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    semi: ['error', 'never'],
    quotes: ['error', 'single'],

    // Import rules for duplicate detection
    'import/no-duplicates': 'error',
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
        ],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],

    // Prettier specific rule
    'prettier/prettier': ['error', {
      semi: false,
      singleQuote: true
    }],

    // JSDoc-specific rules
    'jsdoc/check-alignment': 'warn',
    'jsdoc/check-param-names': 'error',
    'jsdoc/check-tag-names': 'error',
    'jsdoc/check-types': 'error',
    'jsdoc/require-param': 'error',
    'jsdoc/require-returns': 'error',
    "jsdoc/tag-lines": ["error", "any",{"startLines":1}],
    "jsdoc/require-returns-type": ["off", {"contexts":["never"]}],
    "jsdoc/require-param-type": ["off", {"contexts":["never"]}]
  },
  ignorePatterns: [
    'node_modules',
    '.eslintrc.cjs',
    '**/*.js',
    '**/.cache',
    '**/dist',
    '**/contracts',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  settings: {
    jsdoc: {
      mode: 'typescript',
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
    },
  },
}
