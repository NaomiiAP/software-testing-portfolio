# Conclusion

## What we did

We chose a **railway reservation system** as the application under test, starting from the
open-source *irctc-clone*. The work went through the full testing life cycle:

1. **Understanding and planning.** We studied the original application, identified 10 modules,
   wrote 21 testable requirements and an IEEE 829-style test plan.
2. **Baseline testing.** We tested the original (v1.0) with an automated Selenium probe and static
   analysis. It had **19 defects**, 3 of them critical: the search buttons did nothing, there was no
   booking flow, and train and PNR data were random on every render.
3. **Making the application testable.** We rebuilt it as **RailReserve v2.0**. The business rules
   became pure functions with an injected clock, the timetable is deterministic, and every UI
   element has a stable test id. This step was necessary: random behaviour cannot have an expected
   result, so it cannot be tested.
4. **Test design.** We applied Equivalence Partitioning (~100 partitions), Boundary Value Analysis
   (ranges plus business thresholds such as concession ages, refund windows and coach boundaries),
   4 Decision Tables and 2 State Machines, and wrote 28 scenario-based system test cases. All of
   them are linked in a traceability matrix.
5. **Automation and execution.** 363 Vitest unit and integration tests (JUnit-style), 28 Selenium
   WebDriver tests using the Page Object Model, and StrykerJS mutation testing. Execution logs and
   metrics are generated from the JUnit XML, so the recorded "actual results" are exactly what the
   tools observed.
6. **Defects and regression.** The first Selenium run against our own build failed twice. Both
   failures were real defects (departed trains were bookable; an oversized group was sent to
   payment). Reviewing the evidence screenshots found a third. All were fixed, regression tests were
   added at unit, integration and system level, and the suites were re-run to green.

## Results

| Measure | Value |
|---|---|
| Requirements traced to passing tests | 22 / 22 |
| Unit + integration tests | 363 passed |
| Selenium E2E tests | 28 passed |
| Coverage of business rules | 100% statements / branches / functions / lines |
| Mutation score | 90.45% → 99.13% |
| Defects found | 23 (19 in the original, 4 in our build) |
| Open defects at release | 0 (1 security item deferred: plain-text passwords need a backend) |

## What we learned

* **Testability is a design property.** Most v1.0 defects were found in minutes, but none could be
  *regression-tested* until randomness and the system clock were moved out of the logic.
* **Coverage is not enough.** Line coverage was already 100% when mutation testing still found 87
  surviving mutants. Some assertions checked a label but not the value behind it, and some
  boundaries (`>` vs `>=`) were never exercised. Thirty targeted tests closed those gaps, and the
  run also exposed redundant code that we simplified.
* **Black-box techniques find different bugs at different levels.** BVA and decision tables made
  the fare and refund rules solid at unit level. The two v2.0 defects were found only at system
  level, because the rule existed but was not applied on the right *page*.
* **Tests need testing too.** One probe passed for the wrong reason (it measured the viewport
  including the scrollbar). We caught it only because a screenshot contradicted the green result.
  Evidence screenshots are worth keeping.
* **Small environment details matter.** Two copies of React in the workspace made every component
  test fail with a confusing error; pinning one version fixed it.

## Limitations and future work

* Add a backend with hashed passwords and server-side sessions (**DEF-V2-01**), then API testing (e.g. Postman/Newman).
* Run the Selenium suite on Firefox and Edge (cross-browser) and in CI (GitHub Actions) on every push.
* Add accessibility testing (axe-core) and visual regression testing.
* Make seat inventory segment-aware and allow per-passenger statuses, as on the real system.
