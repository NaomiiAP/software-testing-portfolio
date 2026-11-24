# Test Summary Report - RailReserve v2.0

| Item | Detail |
|---|---|
| Report ID | TSR-RRS-01 (refers to test plan TP-RRS-01) |
| Builds | v1.0 = original irctc-clone `e108a38` · v2.0 = `app/` (final commit of this repository) |
| Execution date | 2026-11-23 |
| Environment | Windows 11 · Node 24.19 · Chrome 158 headless · Python 3.12 · Selenium 4.54 · Vitest 3.2.7 · StrykerJS 10.1.1 |
| Recommendation | **Release v2.0** - all exit criteria met (section 9) |

---

## 1. Summary

| Suite | Level | Executed | Passed | Failed | Pass rate |
|---|---|---|---|---|---|
| Vitest unit tests | Unit | 345 | 345 | 0 | 100% |
| Vitest + React Testing Library | Integration | 18 | 18 | 0 | 100% |
| Selenium WebDriver (final run) | System / E2E | 28 | 28 | 0 | 100% |
| Selenium WebDriver (run #1) | System / E2E | 26 | 24 | **2** | 92.3% - both failures were real defects |
| Selenium baseline probe on v1.0 | System (baseline) | 17 | 0 | **17** | expected: every failure = a v1.0 defect |
| StrykerJS mutation testing | Test-suite quality | 919 mutants | 911 detected | 8 undetected | score **99.13%** |

Per-test results: [03_Test_Execution/Test_Execution_Log.md](../03_Test_Execution/Test_Execution_Log.md) ·
numbers per suite/technique: [Execution_Metrics.md](Execution_Metrics.md) ·
Excel: [Test_Execution_Workbook.xlsx](Test_Execution_Workbook.xlsx).

## 2. Test cases by design technique (v2.0)

| Technique | Test cases | Passed | Main targets |
|---|---|---|---|
| Equivalence Partitioning | 91 | 91 | every input field, quota, PNR, payment, distance |
| Boundary Value Analysis | 85 | 85 | ranges, concession ages, min fare, Tatkal clamp, refund hours, chart, departure, berths, card expiry, PNR sequence |
| Decision Table | 30 | 30 | concessions (13), refunds (11), allocation (6) |
| State Transition | 27 | 27 | ticket status (16), login lock-out (11) |
| Other unit (functional) | 112 | 112 | search, journeys, data integrity, fares, booking, cancellation, chart, store, mutation-gap tests |
| Integration (components) | 18 | 18 | search form, results, PNR page, login, routing, header |
| System / E2E (Selenium) | 28 | 28 | 28 user journeys in Chrome |
| **Total** | **391** | **391** | |

_Exact counts are regenerated in [Execution_Metrics.md](Execution_Metrics.md) after every run._

## 3. Requirements coverage

22 / 22 requirements are covered by passing tests, and 21 / 22 are also verified in the browser.
REQ-16 (chart preparation, which is time-triggered) is verified with an injected clock. See the
[traceability matrix](../02_Test_Case_Design/06_Traceability_Matrix.md).

## 4. Code coverage (V8, business rules)

| Scope | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| `app/src/lib` (rules) | 100% | 100% | 100% | 100% |
| `app/src/data` (timetable) | 100% | 100% | 100% | 100% |
| `app/src/store` (browser storage) | 96.2% | 90.2% | 100% | 96.2% |
| **All measured files** | **99.48%** | **98.78%** | **100%** | **99.48%** |

The UI pages are not in the coverage scope; they are covered by the 18 integration tests and the
28 Selenium tests. HTML report: [coverage/index.html](coverage/index.html).

## 5. Defects

| | Found | Fixed & verified | Deferred | Open |
|---|---|---|---|---|
| v1.0 (original) | 19 (3 Critical, 6 High, 4 Medium, 6 Low) | 19 | 0 | 0 |
| v2.0 (our build) | 4 (1 High, 2 Medium, 1 Low) | 3 | 1 (DEF-V2-01, security, needs backend) | 0 |

How the v2.0 defects were found:

| Defect | Found by | Why earlier levels missed it |
|---|---|---|
| DEF-V2-02 departed trains bookable | Selenium TC_E2E_08 (run #1 failed) | The rule existed in `createBooking()` and was unit-tested, but the **results page** did not apply it |
| DEF-V2-03 oversized group sent to payment | Selenium TC_E2E_18 (run #1 failed) | Same pattern: the capacity rule was checked only at the payment step |
| DEF-V2-04 wrong menu highlight | Reviewing E2E screenshots | Cosmetic, no assertion covered it |
| DEF-V2-01 plain-text passwords | Code review | Not a functional failure |

Full reports: [04_Defect_Reports/Defect_Report.md](../04_Defect_Reports/Defect_Report.md).

## 6. Mutation testing

StrykerJS mutated every business-rule file in `app/src/lib` (constants excluded) and re-ran the
Vitest suite for each mutant.

| Run | Mutants | Killed | Timeout | Survived | No coverage | Score |
|---|---|---|---|---|---|---|
| #1 (after the first 327 tests) | 932 | 838 | 5 | 87 | 2 | **90.45%** |
| #2 (after closing the gaps) | 919 | 907 | 4 | 8 | 0 | **99.13%** |

Per file, run #2:

| File | Mutants | Killed | Timeout | Survived | No coverage | Score |
|---|---|---|---|---|---|---|
| auth.ts | 39 | 38 | 0 | 1 | 0 | 97.44% |
| dates.ts | 74 | 72 | 0 | 2 | 0 | 97.30% |
| fare.ts | 102 | 100 | 0 | 2 | 0 | 98.04% |
| pnr.ts | 18 | 18 | 0 | 0 | 0 | 100% |
| refund.ts | 63 | 63 | 0 | 0 | 0 | 100% |
| reservation.ts | 335 | 331 | 3 | 1 | 0 | 99.70% |
| ticketState.ts | 28 | 28 | 0 | 0 | 0 | 100% |
| validation.ts | 260 | 257 | 1 | 2 | 0 | 99.23% |
| **Total** | **919** | **907** | **4** | **8** | **0** | **99.13%** |

The total fell from 932 to 919 mutants because the redundant code found in run #1 was removed
(fewer places to mutate), while the new `hasDeparted()` rule (DEF-V2-02 fix) added a few.

### What the 89 undetected mutants of run #1 taught us

| Category | Examples (file:line, mutant) | Action |
|---|---|---|
| Assertion too weak | `reservation.ts:161-164` `kind: 'CNF'` → `""`, `count: occ.rac + 1` → `- 1` - tests checked only `label` | assert the whole availability object (TC_UT_MUT_10) |
| Missing boundary | `reservation.ts:244/245/248` `>` → `>=` (6 passengers, oldest age 11, booking at the departure minute); `:364` chart at exactly 4 h | TC_BVA_BOOK_01-04, TC_BVA_CHART_01 |
| Missing input class | `.trim()` removed in age/mobile/e-mail/UPI/expiry; regex anchors `^`/`$` removed; 17-digit Luhn-valid card; same-year card expiry | TC_UT_MUT_01-03, TC_BVA_CARD_01, TC_BVA_EXP_01-04 |
| Untested scenario | FIFO `sort` removed (`:310`); WL promoted although RAC is full (`:320`); children counted in cancellation fee (`:342`, `:368`); other train/class counted in occupancy (`:120`) | TC_UT_MUT_11, 15-20 |
| User-visible text never asserted | concession labels, refund rule texts, status labels, error class names | TC_UT_MUT_06-08 |
| Redundant code | `dates.ts:25` year/day checks were redundant with the month check; `reservation.ts:177/294` re-allocation and `exceptPnr` never needed | code simplified (one round-trip check; only PROMOTE re-allocates) |

### Remaining survivors (run #2) - analysis

All 8 remaining mutants were inspected one by one. Each is an **equivalent mutant**: the code
changes, but no input can make the program behave differently, so no test can kill it.

| # | Location | Mutant | Why it is equivalent |
|---|---|---|---|
| 1 | `auth.ts:29` | `lockedUntil !== null && …` → `true && …` | when `lockedUntil` is `null`, `now < null` compares with 0 and is already false |
| 2-3 | `dates.ts:7` | regex `^` or `$` removed | the round-trip check (`roundTrip === iso`) already rejects any extra characters |
| 4-5 | `fare.ts:55` | `gender !== 'F'` → `true`, and `'F'` → `""` | women aged 58+ have already returned on the line above, so this condition can never be false here (kept for readability) |
| 6 | `reservation.ts:178` | `if (p.slot !== null)` → always add | adding `null` to the set of used slots never matches a numeric slot |
| 7 | `validation.ts:176` | Luhn `d > 9` → `d >= 9` | a doubled digit is always even, so it is never exactly 9 |
| 8 | `validation.ts:178` | Luhn `sum += d` → `sum -= d` | `(-s) % 10 === 0` exactly when `s % 10 === 0` |

**Effective result:** 911 of 911 non-equivalent mutants were detected (100%).

## 7. Execution history

| # | What was run | Result | Follow-up |
|---|---|---|---|
| 1 | Baseline probe on v1.0 (15 probes) | 15 failed | defects D01-D15 |
| 2 | `npx vitest run` - first 319 tests | 305 passed, **14 failed** (all component tests) | environment problem, not product: React 19 (pulled in by Testing Library) next to the app's React 18 → pinned React 18 at the workspace root → 319/319 |
| 3 | Coverage | lib 100% statements, 99.4% branches | - |
| 4 | Stryker run #1 | 90.45% | 30 targeted tests + 2 simplifications |
| 5 | Selenium E2E, first attempt (run **concurrently** with Stryker) | 3 passed, 23 failed (timeouts) | invalid run - CPU starvation; rule adopted: never run E2E and mutation testing at the same time |
| 6 | Selenium E2E run #1 (alone) | 24 passed, **2 failed** | genuine defects DEF-V2-02, DEF-V2-03 |
| 7 | Fixes + regression tests | 363/363 unit+integration | DEF-V2-02/03/04 closed |
| 8 | Selenium E2E final | **26/26 passed** | - |
| 9 | Baseline probe on v1.0 (17 probes, corrected D16) | 17 failed | defects D16, D17 confirmed |
| 10 | Stryker run #2, first attempt | workers crashed (`EBUSY`), and the sandbox was deleted by mistake while it was running | **run discarded** - results not used; Stryker given its own Vitest config without file reporters |
| 11 | Stryker run #2 (clean) | 99.13% | remaining survivors analysed (section 6) |
| 12 | UI restyled (neobrutalist style, later replaced) - regression run | 363 / 363 unit + integration, **26 / 26 E2E** | only TC_IT_18 changed: it now checks the `is-active` marker instead of a colour class; no behaviour changed |

| 13 | UI rebuilt as "Night Express" (research-based design, animations, demo panel, toasts, ERS-style PDF) | first E2E run 24/26: TC_E2E_10 (toast covered the Login button), TC_E2E_16 (CVV kept old value) | see section 8; after fixes **28 / 28 E2E** (2 new: TC_E2E_27/28), 363 / 363 unit + integration |

## 8. Problems in the test process itself

| Problem | Impact | Resolution |
|---|---|---|
| Two React copies in the workspace | 14 integration tests failed with "A React Element from an older version of React was rendered" | Pinned `react@18.3.1` / `react-dom@18.3.1` at the root |
| Overflow probe used `window.innerWidth` | V1-D16 passed although a scrollbar was visible (false negative) | Changed to `scrollWidth` vs `clientWidth` in V1-D16 and TC_E2E_26 |
| TC_IT_18 assertion used a substring match | `hover:text-yellow-300` matched `text-yellow-300` (false failure) | Compare whole class tokens |
| E2E run concurrently with Stryker | 23 timeouts (false failures) | Run suites one at a time |
| Windows console code page | Python printing "₹" crashed a helper script | Run Python in UTF-8 mode (`PYTHONUTF8=1`) |
| Stryker workers share one sandbox; the JUnit/HTML reporters of `vitest.config.ts` wrote the same files concurrently | `EBUSY: resource busy or locked`, crashed workers during mutation run #2 | Separate `05_Test_Automation/mutation/vitest.stryker.config.ts` with console output only |
| Windows Application Control started blocking `selenium-manager.exe` (2026-11-24) | Selenium could not obtain a driver (`NoSuchDriverException`) | `05_Test_Automation/selenium/driver_factory.py` uses `CHROMEDRIVER` if set, else Selenium Manager, else the cached ChromeDriver that matches Chrome 158 - the policy itself was left untouched |
| Smooth scrolling (`scroll-behavior: smooth`) made `scrollIntoView` animate, so clicks landed mid-scroll | Clicks intercepted by other elements | Smooth scrolling only under `prefers-reduced-motion: no-preference`; Selenium forces reduced motion |
| Toast notifications stacked over a form's submit button | TC_E2E_10 failed (click intercepted) - also bad UX | Toasts made click-through (only the close button takes clicks) |
| `WebElement.clear()` sets the value directly; React's change tracking ignores it and a re-render restored the old CVV | TC_E2E_16 failed (CVV "1231") | Page objects clear fields with Ctrl+A / Delete like a user |
| React Router v7 transition flag defers rendering after navigation | TC_E2E_01 read the result list before it rendered | List helpers wait for their container (`wait_any`) |
| Dev server started before the Tailwind theme was replaced kept the old config | Blank page (`bg-mist` class unknown) during visual review | Restart the dev server after changing `tailwind.config.js` |
| The Stryker sandbox (`.stryker-tmp`) was deleted while the run was still going | Remaining mutants would have been judged against missing files | Run stopped, discarded and repeated from scratch; rule adopted: never clean `.stryker-tmp` during a run |

## 9. Exit criteria

| Criterion (from the Test Plan) | Target | Actual | Met |
|---|---|---|---|
| Unit + integration tests passed | 100% | 363 / 363 | ✅ |
| E2E tests passed | 100% | 28 / 28 | ✅ |
| Statement coverage of `app/src/lib` | ≥ 90% | 100% | ✅ |
| Mutation score of `app/src/lib` | ≥ 80% | 99.13% | ✅ |
| Open Critical / High defects | 0 | 0 | ✅ |
| Requirements covered | 100% | 22 / 22 | ✅ |

## 10. Conclusion and recommendation

All exit criteria are met. The original application (v1.0) is **not** fit for use: its core
functions do not work and its data is random. RailReserve v2.0 is **recommended for release** as a
demonstration system. The one known limitation (DEF-V2-01, browser-side password storage) is
accepted because there is no backend; it is listed as future work in [Conclusion.md](../Conclusion.md).
