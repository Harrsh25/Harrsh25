import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import reactPlugin from 'eslint-plugin-react';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default [
  { ignores: ['dist', 'node_modules'] },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true }, sourceType: 'module' },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...js.configs.recommended.rules,
      // react-hooks rules (compatible with ESLint 10)
      ...reactHooks.configs.recommended.rules,
      // react rules — manually selected to avoid ESLint 10 getFilename() crash
      'react/jsx-key': 'warn',
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-no-target-blank': 'warn',
      'react/jsx-no-undef': 'error',
      'react/jsx-uses-vars': 'warn',
      'react/no-children-prop': 'warn',
      'react/no-danger-with-children': 'error',
      'react/no-deprecated': 'off',
      'react/no-direct-mutation-state': 'off',
      'react/no-unescaped-entities': 'warn',
      // explicitly disabled — crashes with ESLint 10 getFilename removal
      'react/display-name': 'off',
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      // react-refresh
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // general
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      // a11y
      'jsx-a11y/alt-text': 'warn',
      'jsx-a11y/aria-props': 'warn',
      'jsx-a11y/label-has-associated-control': 'warn',
    },
    settings: { react: { version: 'detect' } },
  },
];
