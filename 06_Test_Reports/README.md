# 06 - Test Reports

| Report | File | Produced by |
|---|---|---|
| **Test Summary Report** (read this first) | [Test_Summary_Report.md](Test_Summary_Report.md) | team |
| Execution metrics (auto-generated) | [Execution_Metrics.md](Execution_Metrics.md) | `tools/generate_reports.py` |
| Excel workbook of all executed tests | [Test_Execution_Workbook.xlsx](Test_Execution_Workbook.xlsx) | `tools/generate_reports.py` |
| Unit + integration - JUnit XML | [unit/junit.xml](unit/junit.xml) | Vitest |
| Unit + integration - interactive HTML | `unit/html/index.html` (open with `npx vite preview --outDir 06_Test_Reports/unit/html`) | Vitest UI reporter |
| Code coverage - HTML | [coverage/index.html](coverage/index.html) | V8 via Vitest |
| Code coverage - summary JSON | [coverage/coverage-summary.json](coverage/coverage-summary.json) | V8 via Vitest |
| E2E - HTML report | [e2e/e2e_report.html](e2e/e2e_report.html) | pytest-html |
| E2E - JUnit XML (final run) | [e2e/junit.xml](e2e/junit.xml) | pytest |
| E2E - JUnit XML (run #1, 2 failures = DEF-V2-02/03) | [e2e/junit_run1.xml](e2e/junit_run1.xml) | pytest |
| Baseline probe of v1.0 - HTML / JUnit | [baseline_v1/v1_probe_report.html](baseline_v1/v1_probe_report.html) · [junit](baseline_v1/v1_probe_junit.xml) | pytest-html |
| Mutation testing - HTML (final run) | [mutation/mutation-report.html](mutation/mutation-report.html) | StrykerJS |
| Mutation testing - run #1 summary | [mutation/run1_summary.md](mutation/run1_summary.md) | StrykerJS console |

HTML reports are self-contained: download the file and open it in a browser (GitHub shows HTML
as source). The Vitest UI report needs a small static server because it loads its data with
`fetch`.
