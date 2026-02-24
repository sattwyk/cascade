import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import oxlint from 'eslint-plugin-oxlint';
import { defineConfig, globalIgnores } from 'eslint/config';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      react: {
        version: '19.2.4',
      },
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'anchor/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Nix shell artifacts (corepack, Solana SBF SDK)
    '.corepack/**',
    '.corepack-bin/**',
    '.sbf-sdk/**',
  ]),
  // Disable ESLint rules that Oxlint already handles (must be last).
  oxlint.configs['flat/recommended'],
]);

export default eslintConfig;
