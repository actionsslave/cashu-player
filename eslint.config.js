import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2022 },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      // NR-04: keine Proofs in Konsolenausgaben.
      'no-console': 'error',
    },
  },
  {
    files: ['test/**/*.ts', 'test/**/*.tsx', 'tools/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
);
