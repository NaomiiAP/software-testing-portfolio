/**
 * Vitest configuration used only by Stryker.
 *
 * Same tests and aliases as ../../vitest.config.ts, but console output only: Stryker runs
 * several Vitest workers inside ONE sandbox, and the JUnit/HTML file reporters made them
 * write the same files at the same time (EBUSY on Windows), crashing workers.
 */
import { fileURLToPath } from 'node:url';
import base from '../../vitest.config';

export default {
  ...base,
  root: fileURLToPath(new URL('../../', import.meta.url)),
  test: { ...base.test, reporters: ['default'], outputFile: undefined },
};
