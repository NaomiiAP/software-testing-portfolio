# Test Plan - RailReserve Railway Reservation System

| Item | Detail |
|---|---|
| Test plan ID | TP-RRS-01 |
| Application under test (AUT) | RailReserve - Railway Reservation System (v1.0 baseline → v2.0 release) |
| Based on | [krishanmurariji/irctc-clone](https://github.com/krishanmurariji/irctc-clone) (React + TypeScript + Vite) |
| Prepared by | _see README - team details_ |
| Standard followed | IEEE 829 / ISO/IEC/IEEE 29119-3 test plan outline |
| Status | Executed - see [Test Summary Report](../06_Test_Reports/Test_Summary_Report.md) |

---

## 1. Introduction

The aim of this project is to apply systematic software testing to a realistic web application.
We picked an open-source railway reservation front end (an IRCTC clone). We first tested it as it was,
calling that **v1.0**, and found it could not be tested repeatably: search buttons did nothing and
trains and PNR results were generated randomly on every render. The defects we found are recorded in
[04_Defect_Reports](../04_Defect_Reports/Defect_Report.md).

We then built **v2.0**, a working and deterministic version. Its business rules (fares,
concessions, seat allocation, refunds, validation) are isolated as pure functions so they can be
tested at every level. v2.0 was then tested with the techniques and tools described below.

## 2. Objectives

1. Understand the application and turn its behaviour into **numbered, testable requirements** (section 5).
2. Design test cases with **black-box techniques**: Equivalence Partitioning, Boundary Value
   Analysis, Decision Tables and State Transition testing.
3. Execute the tests at **unit, integration and system level**, record actual results and
   **identify and document defects**.
4. Automate the tests: **Vitest** (JUnit-style unit tests), **Selenium WebDriver** (browser E2E) and
   **StrykerJS mutation testing** to measure how good the tests themselves are.
5. Produce a test execution summary and keep all evidence in the GitHub repository.

## 3. Test items

| Item | Version | Location |
|---|---|---|
| Original application (baseline) | v1.0 - commit `e108a38` of irctc-clone | `D:\Desktop\ST\irctc-clone` (local clone, unchanged) and first commit of this repo |
| Improved application | v2.0 | [`app/`](../app) |
| Business-rule modules | v2.0 | `app/src/lib/*.ts`, `app/src/data/*.ts`, `app/src/store/*.ts` |

## 4. Scope

### 4.1 Modules and features to be tested

| Module | Features | Requirements |
|---|---|---|
| M1 Train search | station/date/quota validation, timetable search, running days, availability & fare display | REQ-01 … REQ-05 |
| M2 Booking | login gate, passenger details, contact details, passenger limits | REQ-06 … REQ-09 |
| M3 Fare engine | base fare, minimum fare, concessions, Tatkal premium, GST, convenience fee | REQ-10 |
| M4 Seat allocation | CNF / RAC / WL / REGRET, berth numbering, children without berth | REQ-11 |
| M5 Payment | UPI and card validation, PNR generation | REQ-12 |
| M6 PNR enquiry | format validation, lookup, consistent status | REQ-13 |
| M7 Cancellation | refund rules, promotion of waiting tickets, chart preparation | REQ-14 … REQ-16 |
| M8 Accounts | registration validation, login, lock-out, logout, protected pages | REQ-17, REQ-18 |
| M9 Navigation & UI | My Bookings, e-ticket PDF, routing/404, title, responsive layout | REQ-19 … REQ-21 |
| M10 Demo & notifications | demo control room scenarios, toast notifications with testing lens | REQ-22 |

### 4.2 Features not tested (out of scope)

| Feature | Reason |
|---|---|
| Real payment gateway, SMS/e-mail delivery | Not implemented (simulated payment only) |
| Server-side security, password hashing | No backend; data is stored in the browser. Plain-text password storage is logged as known defect **DEF-V2-01** |
| Load / performance testing | Single-user client-side application; no server to load |
| Cross-browser matrix | Chrome 158 only (Selenium); other browsers left as future work |
| Image slider content on the home page | Third-party images, purely decorative |

### 4.3 Assumptions and simplifications (documented design decisions)

* All passengers on one PNR share one status (booking-level allocation).
* Seat inventory is per train run and class, not per route segment.
* Promotion after cancellation is strict FIFO: the oldest waiting PNR goes first, and only if all its passengers fit.
* Times are interpreted in the browser's local time zone (IST assumed).
* Sample timetable of 16 trains and 18 stations; timings are approximate.

## 5. Requirements under test

| ID | Requirement |
|---|---|
| REQ-01 | The user can search trains by source, destination, journey date and quota (class optional). |
| REQ-02 | Source and destination are mandatory and must be different. |
| REQ-03 | Journey date must be from today up to today + 120 days (Advance Reservation Period). |
| REQ-04 | Tatkal quota can be used only when the journey date is tomorrow. |
| REQ-05 | Results list only trains running on that date in that direction, sorted by departure, with availability and adult fare per class. Trains that have already departed must not be bookable. |
| REQ-06 | Booking requires login; after login the user returns to the page they were on. |
| REQ-07 | A booking has 1-6 passengers, at least one of whom is older than 11. |
| REQ-08 | Passenger name: 3-40 chars, letters/spaces/dots, starting with a letter. Age: whole number 1-120. Gender: M/F/T. |
| REQ-09 | Contact mobile: 10 digits starting 6-9. E-mail: valid format. |
| REQ-10 | Fare = max(distance x class rate, class minimum) per passenger; concessions per decision table (child <5 free, child 5-11 50%, F 58+ 50%, M/T 60+ 40%, none in Tatkal); Tatkal premium 30% clamped to class min/max; GST 5% on AC classes; ₹20 convenience fee per booking. |
| REQ-11 | Allocation: CNF if enough berths, else RAC, else WL, else REGRET (no booking). Children below 5 get no berth. Berths numbered coach/berth (e.g. B1/23). |
| REQ-12 | Payment by UPI ID (`name@bank`) or card (16 digits + Luhn, expiry not in the past, 3-digit CVV). A unique 10-digit PNR is issued on success. |
| REQ-13 | PNR enquiry accepts exactly 10 digits; unknown PNRs report "PNR not found"; known PNRs always show the same, current booking. |
| REQ-14 | Cancellation refund: CNF > 48 h flat charge; 12-48 h max(25%, flat); 4-12 h max(50%, flat); ≤ 4 h none; Tatkal CNF none; RAC/WL ₹60 clerkage per passenger until 30 min before departure; no online cancellation after departure. Convenience fee not refunded. |
| REQ-15 | When a ticket is cancelled, waiting tickets are promoted FIFO: RAC → CNF, then WL → RAC. |
| REQ-16 | Chart is prepared 4 h before departure: WL tickets are cancelled automatically (refund minus clerkage), CNF/RAC are frozen. |
| REQ-17 | Registration validates full name, username (4-15, starts with a letter, unique), e-mail, mobile, password (8-20 chars with upper, lower, digit, special) and confirmation. |
| REQ-18 | Three consecutive failed logins lock the account for 15 minutes; a successful login resets the counter. |
| REQ-19 | My Bookings lists the logged-in user's tickets; each ticket can be viewed, downloaded as PDF and cancelled by its owner. |
| REQ-20 | Every navigation link leads to a real page; unknown URLs show a "Page not found" page; the browser title names the application. |
| REQ-21 | The layout works at phone width (390 px) without horizontal scrolling; the mobile menu exposes all links. |
| REQ-22 | Every user action is confirmed by a notification (toast). A demo panel prepares a scenario for each test-design technique through the real booking engine; with the testing lens on, notifications name the technique and test case. |

## 6. Test approach

### 6.1 Test levels

| Level | What | Tool | Location |
|---|---|---|---|
| Static testing | Type checking, linting, code review of v1.0 and v2.0 | `tsc`, ESLint | `npm run typecheck`, `npm run lint` |
| Unit | Business-rule functions in isolation (validation, fare, reservation, refund, state machines, dates, PNR, store) | Vitest (Jest/JUnit-style API, JUnit XML output) | `05_Test_Automation/unit-tests/*.test.ts` |
| Integration | Real React pages + real store + real rules rendered in jsdom | Vitest + React Testing Library | `05_Test_Automation/unit-tests/components.integration.test.tsx` |
| System / E2E | Complete user journeys in a real Chrome browser | Selenium WebDriver 4 + pytest, Page Object Model | `05_Test_Automation/selenium/` |
| Regression | Every v1.0 defect has a regression test in the v2.0 suites | all of the above | marked "regression Dxx" in test names |
| Test-suite quality | Mutation testing of `app/src/lib` | StrykerJS | `05_Test_Automation/mutation/` |
| Exploratory | Time-boxed session on v1.0 and v2.0 | manual + Selenium probe | [03_Test_Execution/Exploratory_Testing.md](../03_Test_Execution/Exploratory_Testing.md) |

### 6.2 Test design techniques

| Technique | Applied to | Document |
|---|---|---|
| Equivalence Partitioning | names, age, gender, stations, dates, quota, passenger count, PNR, mobile, e-mail, username, password, UPI, card, expiry, CVV, distance | [01_Equivalence_Partitioning.md](../02_Test_Case_Design/01_Equivalence_Partitioning.md) |
| Boundary Value Analysis | age 1-120, journey date 0-120 days, passengers 1-6, name 3-40, password 8-20, username 4-15, concession ages, minimum fare, Tatkal clamp, refund hours, seat allocation, berth/coach numbering, PNR sequence, login lock expiry | [02_Boundary_Value_Analysis.md](../02_Test_Case_Design/02_Boundary_Value_Analysis.md) |
| Decision Table | concessions, refund rules, seat allocation, login outcome | [03_Decision_Table.md](../02_Test_Case_Design/03_Decision_Table.md) |
| State Transition | ticket status (CNF/RAC/WL/CAN), login lock-out | [04_State_Transition.md](../02_Test_Case_Design/04_State_Transition.md) |
| Use-case / scenario testing | end-to-end user journeys | [05_Functional_Test_Cases.md](../02_Test_Case_Design/05_Functional_Test_Cases.md) |

### 6.3 Test case identification

`TC_<TECHNIQUE>_<AREA>_<NN>`, e.g. `TC_BVA_AGE_01`. Technique prefixes: `EP`, `BVA`, `DT`, `ST`,
`UT` (other unit), `IT` (integration), `E2E` (Selenium). Every automated test name starts with its
ID, so the JUnit reports map straight back to the design documents and the
[traceability matrix](../02_Test_Case_Design/06_Traceability_Matrix.md).

## 7. Entry and exit criteria

**Entry:** application builds (`npm run build`), type check and lint pass, test environment ready
(Node, Chrome, Python venv), test cases reviewed.

**Exit (release v2.0):**

| Criterion | Target |
|---|---|
| Unit + integration tests passed | 100% |
| E2E tests passed | 100% |
| Statement coverage of business rules (`app/src/lib`) | ≥ 90% |
| Mutation score of `app/src/lib` | ≥ 80% (Stryker "break" threshold 60%) |
| Open Critical / High defects | 0 |
| Every requirement covered by at least one test | 100% (traceability matrix) |

**Suspension:** the build or the dev server fails, or more than 30% of E2E tests fail for an
environmental reason (browser/driver problems). **Resumption:** after the cause is fixed, the
whole affected suite is re-run.

## 8. Defect management

Each defect gets an ID (`Dxx` for v1.0, `DEF-V2-xx` for v2.0), a severity (Critical / High /
Medium / Low), a priority (P1-P3), reproduction steps, expected vs actual result, screenshot
evidence, status (New → Open → Fixed → Verified/Closed, or Deferred) and the regression test that
verifies the fix. See [04_Defect_Reports](../04_Defect_Reports/Defect_Report.md).

| Severity | Meaning |
|---|---|
| Critical | Core function unusable, no workaround (e.g. cannot book) |
| High | Wrong result in a core function (e.g. wrong PNR data) |
| Medium | Function works but violates a rule or misleads the user |
| Low | Cosmetic / minor usability |

## 9. Test environment

| Component | Version |
|---|---|
| OS | Windows 11 |
| Node.js / npm | 24.19 / 11.17 |
| React / Vite / TypeScript | 18.3 / 5.4 / 5.x |
| Vitest / @vitest/coverage-v8 / React Testing Library | 3.2.7 / 3.2.7 / 16.x |
| StrykerJS + vitest runner | 10.1.1 |
| Python / pytest / pytest-html | 3.12 / 9.x / 4.x |
| Selenium WebDriver / Chrome | 4.54 / 158 (driver managed by Selenium Manager) |
| Test data | Deterministic sample timetable (`app/src/data/trains.ts`), demo account `demo / Demo@123`, fresh browser storage per E2E test |

## 10. Deliverables

| Deliverable | Location |
|---|---|
| Test plan | this document |
| Test case design (EP, BVA, DT, ST, functional, traceability) | [02_Test_Case_Design](../02_Test_Case_Design) |
| Test execution log, exploratory and static testing notes | [03_Test_Execution](../03_Test_Execution) |
| Defect reports | [04_Defect_Reports](../04_Defect_Reports) |
| Test scripts (unit, integration, Selenium, mutation config) | [05_Test_Automation](../05_Test_Automation) |
| Test reports (HTML, JUnit XML, coverage, mutation, summary) | [06_Test_Reports](../06_Test_Reports) |
| Screenshots | [07_Screenshots](../07_Screenshots) |

## 11. Schedule / work breakdown

| Phase | Activities | Output | Evidence (git) |
|---|---|---|---|
| 1. Setup | GitHub repo, README, folder structure | repository | first commits |
| 2. Baseline study | run v1.0, exploratory testing, static analysis, Selenium probe | defects D01-D16 | "baseline" commits |
| 3. Test planning | requirements, scope, approach | this plan | |
| 4. Improve AUT | testable rule layer, working UI (fixes D01-D16) | v2.0 | "rule layer", "rebuild UI" commits |
| 5. Test design | EP, BVA, DT, ST, functional cases | 02_Test_Case_Design | |
| 6. Automation & execution | Vitest, Selenium, Stryker | 05, 06 folders | "tests" commits |
| 7. Defect fixing & regression | v2.0 defects, re-runs | DEF-V2-xx closed | "fix" commits |
| 8. Reporting | execution log, summary, conclusion | 03, 06, Conclusion.md | |

## 12. Risks and mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Random data in v1.0 makes results unrepeatable | Tests cannot be trusted | Deterministic timetable and injected clock in v2.0 |
| Date-dependent behaviour (booking window, Tatkal, departed trains) | Tests pass today, fail tomorrow | All dates in tests are computed relative to "today", and unit tests inject a fixed date/clock |
| Flaky browser tests | False failures | Explicit waits (no fixed sleeps), fresh storage per test, Page Object Model |
| Mixed library versions (e.g. duplicate React) | Misleading test failures | Pinned React 18 at the workspace root (found and fixed during setup) |
| Limited time | Incomplete coverage | Risk-based priority: fare, allocation and refund rules tested first and most deeply |

## 13. Roles

| Role | Responsibility |
|---|---|
| Test lead | plan, schedule, summary report |
| Test designers | EP/BVA/DT/ST design, functional cases |
| Automation engineers | Vitest, Selenium, Stryker scripts |
| Developers | fixes in `app/` |

_(Assign team members in the README.)_
