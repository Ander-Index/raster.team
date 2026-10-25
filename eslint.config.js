import js from '@eslint/js';
import globals from 'globals';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import astro from 'eslint-plugin-astro';
import jsxA11y from 'eslint-plugin-jsx-a11y';

/**
 * Lint maintained source/config/scripts/tests only.
 *
 * `public/` intentionally contains third-party/vendored games and a
 * Chapbook handbook whose browser globals and minified code we do not own.
 * Obsidian vault metadata is authoring state, not project code.
 */
export default [
  {
    ignores: [
      'dist/**',
      '.astro/**',
      'node_modules/**',
      '.bun-cache/**',
      '.cache/**',
      'pagefind/**',
      'public/**',
      '**/.obsidian/**',
      'tests/fixtures/**',
      'bun.lock',
    ],
  },
  {
    // Keep the standard correctness baseline for maintained JS, TS and
    // Astro (frontmatter + client scripts). Globals are environment-aware.
    files: ['**/*.{js,mjs,cjs,ts,tsx,astro}'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // TypeScript itself reports these; the base rules misfire on
      // type-only imports, declaration merging and ambient globals.
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'no-redeclare': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  ...astro.configs.recommended,
  {
    files: ['**/*.astro'],
    languageOptions: {
      // Astro files have both build-time frontmatter (Node) and client
      // `<script>` blocks (browser).
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'jsx-a11y': jsxA11y,
      '@typescript-eslint': tseslint,
    },
    rules: {
      // Astro frontmatter/client scripts are TypeScript-aware; use the TS
      // rule so type-only positions are not reported as unused variables.
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'jsx-a11y/alt-text': 'warn',
      'jsx-a11y/anchor-has-content': 'warn',
    },
  },
  {
    // Explicit Node/config/CLI scripts.
    files: [
      'scripts/**/*.{js,mjs,ts}',
      'convert-posts.js',
      'astro.config.mjs',
      'eslint.config.js',
    ],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
];
