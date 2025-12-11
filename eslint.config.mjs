import js from '@eslint/js';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import prettier from 'eslint-plugin-prettier';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import preferArrow from 'eslint-plugin-prefer-arrow';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],

    plugins: {
      '@typescript-eslint': typescriptEslint,
      prettier,
      react,
      'react-hooks': reactHooks,
      'prefer-arrow': preferArrow,
    },

    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.jasmine,
        ...globals.jest,
        process: true,
      },
      parser: tsParser,
    },

    settings: {
      react: {
        pragma: 'React',
        version: 'detect',
      },
    },

    rules: {
      ...typescriptEslint.configs.recommended.rules,
      ...react.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'prettier/prettier': 'warn',
      'react/prop-types': 'off',
      'react/jsx-no-bind': 'off',
      'react/no-array-index-key': 'off',
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      '@typescript-eslint/no-empty-interface': 'warn',
      '@typescript-eslint/no-empty-function': 'off',
      'quotes': 'off',
      '@typescript-eslint/quotes': ['off', 'backtick'],
      'react/jsx-curly-brace-presence': ['off', {
        props: 'always',
        children: 'never',
      }],
      'prefer-arrow/prefer-arrow-functions': ['off', {
        disallowPrototype: true,
        singleReturnOnly: false,
        classPropertiesAllowed: true,
        allowStandaloneDeclarations: false,
      }],
      'prefer-arrow-callback': ['off', {
        allowNamedFunctions: false,
        allowUnboundThis: false,
      }],
      'func-style': ['off', 'expression'],
      'arrow-body-style': ['off', 'as-needed'],
      'object-shorthand': 'off',
    },
  },
  prettierConfig,
];
