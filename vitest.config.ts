/**
 * Unit + integration test configuration (Vitest, Jest-compatible API).
 * Tests live in 05_Test_Automation/unit-tests and exercise the application in app/src.
 * Reports: JUnit XML (same schema JUnit produces) + HTML -> 06_Test_Reports/unit,
 *          coverage -> 06_Test_Reports/coverage.
 */
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@app': fileURLToPath(new URL('./app/src', import.meta.url)) },
  },
  test: {
    include: ['05_Test_Automation/unit-tests/**/*.test.{ts,tsx}'],
    environment: 'node',
    setupFiles: ['05_Test_Automation/unit-tests/setup.ts'],
    reporters: ['default', 'junit', 'html'],
    outputFile: {
      junit: '06_Test_Reports/unit/junit.xml',
      html: '06_Test_Reports/unit/html/index.html',
    },
    coverage: {
      provider: 'v8',
      include: ['app/src/lib/**', 'app/src/data/**', 'app/src/store/**'],
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: '06_Test_Reports/coverage',
    },
  },
});
