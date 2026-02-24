import { defineConfig } from 'vitest/config';

import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@project/anchor': fileURLToPath(new URL('./anchor/src', import.meta.url)),
    },
  },
  test: {
    globals: true,
  },
});
