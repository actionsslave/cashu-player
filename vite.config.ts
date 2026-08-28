import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        // Prüfseiten für die riskanten Annahmen A-01 und A-02.
        a01: resolve(import.meta.dirname, 'pruefung/a01-nip07.html'),
        a02: resolve(import.meta.dirname, 'pruefung/a02-mints.html'),
        // FR-31: der Service Worker muss unter / liegen, sonst gilt sein Scope
        // nur für den Asset-Ordner. Deshalb ohne Hash und ohne Unterverzeichnis.
        sw: resolve(import.meta.dirname, 'src/sw.ts'),
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === 'sw' ? 'sw.js' : 'assets/[name]-[hash].js',
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
    setupFiles: ['test/setup.ts'],
  },
});
