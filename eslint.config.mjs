import css from '@eslint/css'
import { defineConfig } from 'eslint/config'
import globals from 'globals'
import js from '@eslint/js'
import markdown from '@eslint/markdown'
import stylistic from '@stylistic/eslint-plugin'

export default defineConfig([
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      sourceType: 'script',
    },
    extends: [js.configs.recommended, stylistic.configs.recommended],
  },
  {
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.node,
      },
      sourceType: 'module',
    },
    extends: [js.configs.recommended, stylistic.configs.recommended],
  },
  {
    files: ['**/*.css'],
    language: 'css/css',
    plugins: { css },
    extends: [css.configs.recommended],
  },
  {
    files: ['**/*.md'],
    language: 'markdown/gfm',
    plugins: { markdown },
    extends: ['markdown/recommended'],
  },
])
