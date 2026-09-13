import { defineConfig } from 'vitest/config';

/** Eigene Konfiguration, damit die Regeltests nicht bei jedem `npm test` den Emulator brauchen. */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 20000,
    hookTimeout: 60000,
    fileParallelism: false,
  },
});
