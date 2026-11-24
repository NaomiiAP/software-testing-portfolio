# 05 - Test Automation

Three kinds of automation, all run from the **repository root**:

| Suite | Tool | Tests | Folder | Command |
|---|---|---|---|---|
| Unit + integration | **Vitest 3** (Jest/JUnit-style API, JUnit XML output) + React Testing Library | 363 | [`unit-tests/`](unit-tests) | `npm test` |
| Coverage | V8 coverage via Vitest | - | - | `npm run test:coverage` |
| System / E2E | **Selenium WebDriver 4** + pytest, Page Object Model | 28 | [`selenium/`](selenium) | `.venv\Scripts\python -m pytest` |
| Baseline probe (v1.0) | Selenium WebDriver 4 + pytest | 17 | [`selenium/baseline_v1/`](selenium/baseline_v1) | `.venv\Scripts\python -m pytest 05_Test_Automation/selenium/baseline_v1` |
| Mutation testing | **StrykerJS 10** (vitest runner) | ~920 mutants | [`mutation/`](mutation) | `npm run test:mutation` |

> The assignment suggests JUnit, Selenium, Postman or mutation testing. The application is
> TypeScript, so **Vitest** plays the role of JUnit (same `describe / it / expect` style, and it
> writes the same JUnit XML report format). Selenium and mutation testing are implemented in full.
> Postman does not apply because RailReserve has no HTTP API.

## One-time setup (Windows, everything on D:)

```powershell
cd D:\Desktop\ST\Software-Testing-Portfolio
npm install                                   # app + Vitest + Stryker (npm workspace)
python -m venv .venv
.venv\Scripts\python -m pip install selenium pytest pytest-html openpyxl
```

Chrome must be installed; Selenium Manager downloads the matching ChromeDriver automatically.
If Windows blocks `selenium-manager.exe` (Application Control), `selenium/driver_factory.py` falls back
to the ChromeDriver already in `%USERPROFILE%\.cache\selenium`, or set `$env:CHROMEDRIVER` to a driver path.

## Running

```powershell
npm test                     # 363 unit + integration tests  -> 06_Test_Reports/unit/
npm run test:coverage        # same + coverage               -> 06_Test_Reports/coverage/
npm run test:mutation        # mutation testing (~20 min)    -> 06_Test_Reports/mutation/

npm run dev                  # start RailReserve on http://127.0.0.1:5173 (keep running)
.venv\Scripts\python -m pytest --junitxml=06_Test_Reports/e2e/junit.xml --html=06_Test_Reports/e2e/e2e_report.html --self-contained-html

$env:HEADED=1; .venv\Scripts\python -m pytest -k TC_E2E_15     # watch one test in a visible browser

.venv\Scripts\python tools\generate_reports.py   # rebuild execution log, metrics and Excel workbook
```

Baseline probe of the original app (needs the original clone running on port 5174):

```powershell
cd D:\Desktop\ST\irctc-clone; npx vite --port 5174
cd D:\Desktop\ST\Software-Testing-Portfolio
.venv\Scripts\python -m pytest 05_Test_Automation/selenium/baseline_v1 --junitxml=06_Test_Reports/baseline_v1/v1_probe_junit.xml
```

## Unit and integration tests - `unit-tests/`

| File | Technique / level | Tests |
|---|---|---|
| `validation.ep.test.ts` | Equivalence Partitioning | 87 |
| `validation.bva.test.ts` | Boundary Value Analysis | 34 |
| `fare.test.ts` | Decision table (concessions) + BVA (ages, min fare, Tatkal) + functional | 45 |
| `refund.test.ts` | Decision table (refund) + BVA (hours) | 22 |
| `stateTransition.test.ts` | State transition (ticket status, login lock-out) | 27 |
| `reservation.test.ts` | Decision table (allocation) + BVA + booking, cancellation, promotion, chart | 51 |
| `trains.test.ts` | Search, timetable integrity, dates, PNR | 41 |
| `store.test.ts` | Browser storage layer (jsdom) | 8 |
| `components.integration.test.tsx` | Integration: real pages rendered with React Testing Library (jsdom) | 18 |
| `mutationGaps.test.ts` | Tests written to kill surviving mutants | 30 |

Design principles:

* **No mocks of business logic.** Rules are pure functions; integration tests render real pages with the real store.
* **Injected time.** Functions take `today` / `now` as parameters, so date rules are tested with a fixed clock (2026-01-05 10:00).
* **Table-driven tests** (`it.each`) mirror the EP / BVA / decision tables one row per test case.
* **IDs in names.** `TC_BVA_AGE_01: age 0` - reports map straight back to the design documents.

## Selenium E2E - `selenium/`

```
selenium/
├── conftest.py            # Chrome fixture, fresh storage per test, screenshot evidence
├── driver_factory.py      # finds ChromeDriver (Selenium Manager → cached driver fallback)
├── flows.py               # reusable journeys: login, open booking, book ticket
├── pages/                 # Page Object Model
│   ├── base_page.py       # waits, click/type/select, React-safe value setter
│   └── pages.py           # HomePage, ResultsPage, LoginPage, RegisterPage, BookingPage,
│                          # PaymentPage, TicketPage, PnrPage, MyBookingsPage
├── test_e2e_search.py     # TC_E2E_01-08
├── test_e2e_auth.py       # TC_E2E_09-12
├── test_e2e_booking.py    # TC_E2E_13-18
├── test_e2e_pnr_cancel.py # TC_E2E_19-22
├── test_e2e_navigation.py # TC_E2E_23-26
├── test_e2e_demo.py       # TC_E2E_27-28 (demo control room, toasts)
└── baseline_v1/           # 17 probes for the ORIGINAL app (expected to fail = defects)
```

* **Page Object Model:** tests talk to pages (`booking.fill_passengers(...)`), never to raw locators.
* **Stable locators:** every interactive element in v2.0 has a `data-testid`.
* **Explicit waits only:** `WebDriverWait` + expected conditions, no fixed sleeps in v2.0 tests; list helpers wait for their container (`wait_any`).
* **Reduced motion:** Chrome runs with `--force-prefers-reduced-motion`, so the UI renders final states (no half-faded text, no smooth scrolling).
* **User-like typing:** fields are cleared with Ctrl+A / Delete - `WebElement.clear()` bypasses React's change tracking.
* **Isolation:** one Chrome per session, but `localStorage`/`sessionStorage` are wiped and the page reloaded before every test.
* **Evidence:** each test saves `07_Screenshots/release_v2/TC_E2E_xx__<step>.png` and a final screenshot.

## Mutation testing - `mutation/stryker.config.mjs`

`mutation/vitest.stryker.config.ts` is the Vitest configuration Stryker uses: the same tests, but
console output only. Stryker's parallel workers share one sandbox, and the file reporters made them
write the same report files at once, which crashed workers on Windows (`EBUSY`).

Stryker changes the business-rule code in small ways (`<` → `<=`, `&&` → `||`, removes a call,
empties a string…) and re-runs the unit tests for each change. A **killed** mutant means the tests
noticed the change; a **survived** mutant means a real gap in the tests. Run #1 → run #2 history
and analysis are in the [Test Summary Report](../06_Test_Reports/Test_Summary_Report.md#6-mutation-testing).
