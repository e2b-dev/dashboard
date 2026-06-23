import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '.next/**',
      'tests/preview/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    setupFiles: ['./tests/setup.ts'],
    server: {
      deps: {
        // @ory/nextjs ships ESM that imports 'next/server' without the .js
        // extension, which vitest's default resolver cannot follow. Inlining
        // lets vite's bundler resolve next.js exports correctly.
        inline: [/@ory\/nextjs/],
      },
    },
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
