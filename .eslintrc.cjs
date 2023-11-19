const { defineConfig } = require('eslint-define-config')

module.exports = defineConfig({
  root: true,

  env: {
    node: true,
    es6: true,
  },

  extends: ['eslint:recommended', 'prettier'],

  overrides: [
    {
      files: ['*.ts'],
      parser: '@typescript-eslint/parser',
      extends: ['plugin:@typescript-eslint/recommended'],
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },

      plugins: ['@typescript-eslint', 'prettier'],
    },
  ],

  rules: {
    'prettier/prettier': [
      'error',
      {
        semi: false,
      },
    ],
  },
})
