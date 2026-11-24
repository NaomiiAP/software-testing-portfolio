/**
 * Mutation testing with StrykerJS.
 *
 * Stryker makes small deliberate changes ("mutants") to the business-rule code -
 * e.g. `<` -> `<=`, `&&` -> `||`, `+` -> `-`, removing a statement - and re-runs
 * the unit tests. A mutant that makes a test fail is "killed"; one that survives
 * reveals a gap in the test suite. Mutation score = killed / (killed + survived).
 *
 * Run from the repository root:  npm run test:mutation
 */
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: 'vitest',
  vitest: { configFile: '05_Test_Automation/mutation/vitest.stryker.config.ts' },
  plugins: ['@stryker-mutator/vitest-runner'],
  mutate: ['app/src/lib/**/*.ts', '!app/src/lib/constants.ts'],
  coverageAnalysis: 'perTest',
  reporters: ['html', 'json', 'clear-text', 'progress'],
  htmlReporter: { fileName: '06_Test_Reports/mutation/mutation-report.html' },
  jsonReporter: { fileName: '06_Test_Reports/mutation/mutation-report.json' },
  thresholds: { high: 85, low: 70, break: 60 },
  tempDirName: '.stryker-tmp',
  ignorePatterns: ['06_Test_Reports', '07_Screenshots', '.venv', 'app/dist', 'tools'],
  concurrency: 4,
  timeoutMS: 20000,
};
