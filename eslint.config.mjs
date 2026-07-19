// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import js from '@eslint/js'
import tseslint from 'typescript-eslint'

/**
 * The purity rule (ENGINEERING.md R7) is the one lint config here that is load-bearing.
 * `core`, `quality`, `providers` and `generator` must stay platform-free and deterministic,
 * or the engine stops being testable and the renderers silently drift apart. CI enforces it
 * because a rule only written in a document erodes.
 */
const PURE_PACKAGES = [
  'packages/kernel/**',
  'packages/core/**',
  'packages/quality/**',
  'packages/providers/**',
  'packages/generator/**',
  'packages/editor/src/op.ts',
  'packages/editor/src/ops.ts',
  'packages/editor/src/ops/**',
  'packages/editor/src/history.ts',
]

const FORBIDDEN_IN_PURE = [
  { name: 'react', message: 'Pure packages are platform-free (R7). Inject via a port.' },
  { name: 'react-dom', message: 'Pure packages are platform-free (R7).' },
  { name: 'react-native', message: 'Pure packages are platform-free (R7).' },
  { name: 'fs', message: 'Pure packages do no I/O (R7). Use a port.' },
  { name: 'path', message: 'Pure packages do no I/O (R7). Use a port.' },
  { name: 'crypto', message: 'Pure packages are deterministic (R7). Inject a hasher.' },
]

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/node_modules/**',
      '**/contract/**',
      '**/generated/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,

  // Root config files are not part of any tsconfig project, so type-aware rules cannot
  // apply to them. Lint them as plain JS rather than excluding them entirely.
  {
    files: ['**/*.mjs', '**/*.cjs', '*.js'],
    ...tseslint.configs.disableTypeChecked,
  },

  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // R7: purity. Enforced, not merely documented.
  {
    files: PURE_PACKAGES,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: FORBIDDEN_IN_PURE,
          patterns: [{ group: ['next/*', 'node:*'], message: 'Pure packages are platform-free (R7).' }],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Pure packages do no I/O (R7). Use a port.' },
        { name: 'process', message: 'Pure packages never read the environment (R7, R16).' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'Non-determinism breaks golden tests (R7). Inject a clock port.',
        },
        {
          selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message: 'Non-determinism breaks golden tests (R7). Inject a random port.',
        },
        {
          selector: 'NewExpression[callee.name=/^(Date)$/][arguments.length=0]',
          message: 'Non-determinism breaks golden tests (R7). Inject a clock port.',
        },
      ],
    },
  },

  // Tests may reach for the tools production code may not.
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/test/**', '**/scripts/**'],
    rules: {
      'no-restricted-globals': 'off',
      'no-restricted-syntax': 'off',
      'no-console': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
)
