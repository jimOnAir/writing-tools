/* eslint-disable max-lines */
// eslint.config.js
import js from '@eslint/js';
import stylisticPlugin from '@stylistic/eslint-plugin';
import importPlugin from 'eslint-plugin-import';
import nPlugin from 'eslint-plugin-n';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import unicornPlugin from 'eslint-plugin-unicorn';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import * as eslint from '@eslint/js';

export default tseslint.config(
  {
    extends: [
      eslint.configs.recommended,
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylistic,
      nPlugin.configs['flat/recommended'],
    ],
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    ignores: [
      'dist/**',
      'build/**',
      'node_modules/**',
    ],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
      },
    },

    plugins: {
      '@stylistic': stylisticPlugin,
      '@typescript-eslint': tseslint.plugin,
      'import': importPlugin,
      'n': nPlugin,
      'unicorn': unicornPlugin,
    },
    rules: {
      '@stylistic/array-bracket-spacing': [
        'error',
        'never',
      ],
      '@stylistic/arrow-spacing': 'error',
      '@stylistic/eol-last': [
        'error',
        'always',
      ],
      '@stylistic/max-len': [
        'error',
        {
          'code': 150,
          'comments': 150,
          'ignoreComments': true,
          'ignorePattern': 'queryRunner.query|\/\/',
          'ignoreStrings': true,
        },
      ],
      '@stylistic/no-multi-spaces': 'error',
      '@stylistic/no-multiple-empty-lines': [
        'error',
        {
          'max': 1,
          'maxBOF': 0,
          'maxEOF': 1,
        },
      ],
      '@stylistic/no-trailing-spaces': 'error',
      '@stylistic/operator-linebreak': [
        'error',
        'before',
      ],
      '@stylistic/padded-blocks': [
        'error',
        'never',
      ],
      '@stylistic/space-in-parens': [
        'error',
        'never',
      ],
      '@stylistic/spaced-comment': [
        'error',
        'always',
        {
          'block': {
            'balanced': true,
            'exceptions': [
              '*',
            ],
            'markers': [
              '!',
            ],
          },
          'line': {
            'exceptions': [
              '-',
              '+',
            ],
            'markers': [
              '/',
            ],
          },
        },
      ],
      '@stylistic/brace-style': [
        'error',
        '1tbs',
      ],
      '@stylistic/comma-dangle': [
        'error',
        'always-multiline',
      ],
      '@stylistic/comma-spacing': 'error',
      '@stylistic/function-call-spacing': 'error',
      '@stylistic/indent': [
        'error',
        2,
        {
          'ignoredNodes': [
            'FunctionExpression > .params[decorators.length > 0]',
            'FunctionExpression > .params > :matches(Decorator, :not(:first-child))',
            'ClassBody.body > PropertyDefinition[decorators.length > 0] > .key',
          ],
          'SwitchCase': 1,
        },
      ],
      '@stylistic/key-spacing': 'error',
      '@stylistic/keyword-spacing': 'error',
      '@stylistic/lines-between-class-members': [
        'error',
        'always',
        {
          'exceptAfterSingleLine': true,
        },
      ],
      '@stylistic/member-delimiter-style': [
        'error',
        {
          'multiline': {
            'delimiter': 'semi',
          },
          'overrides': {
            'typeLiteral': {
              'multiline': {
                'delimiter': 'comma',
              },
              'singleline': {
                'delimiter': 'comma',
              },
            },
          },
          'singleline': {
            'delimiter': 'semi',
          },
        },
      ],
      '@stylistic/no-extra-semi': 'error',
      '@stylistic/object-curly-newline': [
        'error',
        {
          'consistent': true,
          'multiline': true,
        },
      ],
      '@stylistic/object-curly-spacing': [
        'error',
        'always',
      ],
      '@stylistic/object-property-newline': [
        'error',
        {
          'allowAllPropertiesOnSameLine': true,
        },
      ],
      '@stylistic/padding-line-between-statements': [
        'error',
        {
          'blankLine': 'always',
          'next': 'return',
          'prev': '*',
        },
      ],
      '@stylistic/quotes': [
        'error',
        'single',
        {
          'allowTemplateLiterals': 'always',
          'avoidEscape': true,
        },
      ],
      '@stylistic/semi': [
        'error',
        'always',
      ],
      '@stylistic/space-before-blocks': 'error',
      '@stylistic/space-before-function-paren': [
        'error',
        {
          'anonymous': 'always',
          'asyncArrow': 'always',
          'named': 'never',
        },
      ],
      '@stylistic/space-infix-ops': 'error',
      '@stylistic/template-curly-spacing': ['error', 'never'],
      '@stylistic/type-annotation-spacing': 'error',
      '@typescript-eslint/array-type': [
        'error',
        {
          'default': 'array-simple',
        },
      ],
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/ban-tslint-comment': 'error',
      '@typescript-eslint/consistent-indexed-object-style': 'error',
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        {
          'assertionStyle': 'as',
          'objectLiteralTypeAssertions': 'allow',
        },
      ],
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/default-param-last': 'error',
      '@typescript-eslint/dot-notation': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-member-accessibility': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/init-declarations': 'off',
      '@typescript-eslint/member-ordering': [
        'error',
        {
          'default': [
            'public-static-field',
            'protected-static-field',
            'private-static-field',
            'public-instance-field',
            'protected-instance-field',
            'private-instance-field',
            'constructor',
            'public-instance-method',
            'protected-instance-method',
            'private-instance-method',
          ],
        },
      ],
      '@typescript-eslint/method-signature-style': 'error',
      '@typescript-eslint/naming-convention': 'off',
      '@typescript-eslint/no-array-constructor': 'error',
      '@typescript-eslint/no-base-to-string': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-for-in-array': 'error',
      '@typescript-eslint/no-invalid-this': 'error',
      '@typescript-eslint/no-shadow': 'warn',
      '@typescript-eslint/no-this-alias': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          'argsIgnorePattern': '^_',
          'caughtErrors': 'all',
          'destructuredArrayIgnorePattern': '^_',
          'varsIgnorePattern': '^_',
        },
      ],
      '@typescript-eslint/no-useless-constructor': 'error',
      '@typescript-eslint/no-var-requires': [
        'error',
        {
          'allow': [
            '.json$',
          ],
        },
      ],
      '@typescript-eslint/prefer-reduce-type-parameter': 'error',
      '@typescript-eslint/promise-function-async': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/restrict-plus-operands': 'error',
      '@typescript-eslint/strict-boolean-expressions': [
        'off',
        {
          'allowRuleToRunWithoutStrictNullChecksIKnowWhatIAmDoing': true,
        },
      ],
      'curly': 'error',
      'eqeqeq': [
        'error',
        'always',
      ],
      'id-denylist': 'error',
      'import/newline-after-import': 'error',
      'import/no-extraneous-dependencies': 'error',
      'import/order': [
        'error',
        {
          'alphabetize': {
            'caseInsensitive': true,
            'order': 'asc',
          },
          'groups': [
            [
              'builtin',
              'external',
            ],
            'unknown',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'always',
          'pathGroups': [
            {
              'group': 'unknown',
              'pattern': '~common/**',
            },
            {
              'group': 'internal',
              'pattern': '~env/**',
            },
            {
              'group': 'internal',
              'pattern': '~platform/**',
            },
            {
              'group': 'internal',
              'pattern': '~portal/**',
            },
          ],
        },
      ],
      'max-lines': [
        'error',
        300,
      ],
      'n/no-extraneous-import': 'off',
      'n/no-missing-import': 'off',
      'n/no-missing-require': [
        'error',
        {
          'tryExtensions': ['.js', '.ts'],
        },
      ],
      'no-duplicate-case': 'error',
      'no-fallthrough': [
        'error',
        {
          'commentPattern': 'break[\\s\\w]*omitted',
        },
      ],
      'no-irregular-whitespace': 'error',
      'no-nested-ternary': 'warn',
      'no-new-func': 'error',
      'no-redeclare': 'warn',

      'no-sequences': 'error',
      'no-sparse-arrays': 'error',
      'no-template-curly-in-string': 'error',
      'no-throw-literal': 'error',
      'no-unneeded-ternary': 'error',
      'no-unused-expressions': 'error',
      'object-shorthand': [
        'error',
        'always',
      ],
      'prefer-arrow-callback': 'error',
      'prefer-arrow/prefer-arrow-functions': 'off',
      'prefer-object-spread': 'error',
      'prefer-promise-reject-errors': 'error',
      'unicorn/explicit-length-check': 'error',
    },
  },
  {

    files: ['packages/renderer/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    ignores: [
      'dist/**',
      'build/**',
      'node_modules/**',
    ],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parser: tseslint.parser,
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // --- React best practices ---
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      'react/jsx-uses-vars': 'error',

      // --- Hooks ---
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

    },
  },
  {
    files: ['packages/main/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    ignores: [
      'dist/**',
      'build/**',
      'node_modules/**',
    ],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parser: tseslint.parser,
      globals: {
        ...globals.node,
      },
    },
  },
);
