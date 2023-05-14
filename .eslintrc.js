module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],

  rules: {
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'no-console': 'warn',
    'no-debugger': 'warn',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'semi': ["error", "never"],
    'quotes': ["error", "single"],
  },
  ignorePatterns: ['node_modules', 'dist', '**/*.js'],
  overrides: [
    {
      files: ['*.ts'],
      excludedFiles: 'dist/**',
    },
  ],
}