export default {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:import/typescript', 'prettier'],
  rules: {
    'import/order': ['error', { 'newlines-between': 'always' }],
  },
};
