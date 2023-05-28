module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint/eslint-plugin',
  ],
  extends: [
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
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": "off"
  },
  ignorePatterns: ['node_modules', 'dist', '**/*.js', '.eslintrc.js', 'scripts' ,'deploy'],
  overrides: [
    {
      files: ['*.ts'],
      excludedFiles: 'dist/**',
    },
  ],
}