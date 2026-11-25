# Software Testing Portfolio - RailReserve (Railway Reservation System)

![Unit + integration](https://img.shields.io/badge/unit%20%2B%20integration-363%20passed-brightgreen)
![Selenium E2E](https://img.shields.io/badge/Selenium%20E2E-28%20passed-brightgreen)
![Coverage](https://img.shields.io/badge/rule%20coverage-100%25-brightgreen)
![Mutation score](https://img.shields.io/badge/mutation%20score-99.13%25-brightgreen)
![Defects](https://img.shields.io/badge/defects%20found-23-orange)

## Student details

| Field | Details |
|---|---|
| Subject | **Software Testing** - Other Component (Online Portfolio using GitHub Activity) |
| Faculty | Mrs. Kavya K S, Assistant Professor |
| Department | Information Science and Engineering |
| Institution | Ramaiah Institute of Technology, Bengaluru |
| Academic year | 2026-2027 |

**Team members**

| # | Name | USN |
|---|---|---|
| 1 | Harshendra M | 1MS23IS042 |
| 2 | Hemanth L Bangera | 1MS23IS043 |
| 3 | K S Rithesh Hebbar | 1MS23IS049 |
| 4 | Naomi Pereira | 1MS23IS074 |

## Objectives

1. Select a real application and identify its modules and testable requirements.
2. Prepare a test plan and design test cases with **Equivalence Partitioning, Boundary Value Analysis, Decision Tables and State Transition** testing.
3. Execute the tests, record actual results, and identify and document defects.
4. Automate testing with **unit tests (Vitest, JUnit-style)**, **Selenium WebDriver** and **mutation testing (StrykerJS)**.
5. Report results and keep the whole process visible through meaningful Git commits.

## Project description

**Application selected:** a *Railway reservation system*. We started from the open-source
[krishanmurariji/irctc-clone](https://github.com/krishanmurariji/irctc-clone) (React + TypeScript + Vite).

1. **Baseline (v1.0).** We ran and tested the original project unchanged. Its search buttons did
   nothing and its trains and PNR results were random on every render. A Selenium probe of 17
   expected behaviours failed 17 times, and with static testing we logged **19 defects** (D01-D19).
2. **Improvement (v2.0).** To make the application testable, we rebuilt it as **RailReserve**
   ([`app/`](app)). It has a deterministic timetable, a working booking flow, and all business rules
   (validation, fares, concessions, seat allocation, refunds, state machines) written as pure
   functions with an injected clock.
3. **Testing v2.0.** 363 unit/integration tests, 28 Selenium E2E tests and mutation testing. The
   first E2E run found **2 new defects** in our own build and screenshot review found a third. All
   three were fixed and re-tested; one security item is deferred.

### Application modules under test

| Module | Functionality |
|---|---|
| M1 Train search | From/To/date/class/quota search, 120-day window, Tatkal window, running days, availability and fares |
| M2 Booking | Login gate, 1-6 passengers, passenger and contact validation |
| M3 Fare engine | Distance × class rate, minimum fare, concessions (child, senior), Tatkal premium, GST, convenience fee |
| M4 Seat allocation | CNF → RAC → WL → REGRET, berth numbering, children below 5 without berth |
| M5 Payment | UPI / card (Luhn, expiry, CVV), PNR generation |
| M6 PNR enquiry | Format validation, lookup, current status |
| M7 Cancellation | Refund rules by time and status, FIFO promotion, chart preparation |
| M8 Accounts | Registration, login, 3-strike lock-out, logout |
| M9 UI & navigation | My Bookings, PDF e-ticket, 404, responsive layout |
| M10 Demo & notifications | Demo control room scenarios, toast notifications with testing lens |

## The application (RailReserve v2.0)

Designed after studying real rail-booking sites (IRCTC redesign case studies, ixigo, Trainline) and
the official *Electronic Reservation Slip* layout: navy + saffron identity, mint for confirmed tickets.

* **Search** - station autocomplete (type a code, name or city), quick dates, class and quota toggles, animated route-network hero.
* **Results** - 7-day date strip with train counts, filters (class, departure time, availability, departed) and sorting, running-day indicators, colour-coded availability per class.
* **Booking** - live concession chips per passenger, animated fare total, "status if you pay now" preview, 10-minute seat-hold timer.
* **Payment** - UPI with bank handles, card form with live card preview (flips for the CVV, detects Visa / Mastercard / RuPay), animated processing steps.
* **E-ticket** - boarding-pass ticket with QR code, booking vs current status, status history, print, and a PDF in the ERS format.
* **Demo control room** - the **Demo** button (bottom-left) runs one-click scenarios for each test technique (EP, BVA, decision tables, state transition) using the real booking engine.
* **Toasts + testing lens** - every action is confirmed by a notification; with the testing lens on, each one names the technique and test case it demonstrates (e.g. `BVA · today − 1 · TC_BVA_DATE_01`).
* Micro-interactions and SVG animations throughout; all motion respects *prefers-reduced-motion*.

## Results at a glance

| Activity | Result |
|---|---|
| Requirements | 22 numbered requirements, **22/22 traced** to passing tests |
| Unit + integration tests (Vitest) | **363 / 363 passed** |
| System tests (Selenium, Chrome) | **28 / 28 passed** (run #1: 24/26 → 2 defects found and fixed) |
| Baseline probe of the original app | 17 / 17 failed as expected → defects D01-D17 |
| Code coverage of business rules (`app/src/lib`, `app/src/data`) | **100%** statements, branches, functions, lines |
| Mutation score (`app/src/lib`) | run #1 **90.45%** → final **99.13%** |
| Defects | **23 found** (19 in v1.0, 4 in v2.0) - 22 fixed and verified, 1 deferred, 0 open |

Full details: [Test Summary Report](06_Test_Reports/Test_Summary_Report.md).

## Repository structure

```
Software-Testing-Portfolio/
├── README.md                      ← this file
├── 01_Test_Plan/                  ← IEEE 829-style test plan, 22 requirements
├── 02_Test_Case_Design/           ← EP, BVA, decision tables, state transition, functional cases, RTM
├── 03_Test_Execution/             ← execution log (generated), static & exploratory testing
├── 04_Defect_Reports/             ← 23 defects with steps, evidence, status, regression tests
├── 05_Test_Automation/            ← Vitest unit/integration, Selenium (POM), Stryker config
├── 06_Test_Reports/               ← summary report, HTML/JUnit/coverage/mutation reports, Excel workbook
├── 07_Screenshots/                ← evidence captured automatically by Selenium
├── Conclusion.md
├── app/                           ← RailReserve v2.0 (application under test)
└── tools/generate_reports.py      ← builds the execution log, metrics and workbook from the JUnit XML
```

## Quick start (Windows)

```powershell
git clone https://github.com/NaomiiAP/software-testing-portfolio.git Software-Testing-Portfolio
cd Software-Testing-Portfolio
npm install
python -m venv .venv
.venv\Scripts\python -m pip install selenium pytest pytest-html openpyxl

npm run dev                 # app on http://127.0.0.1:5173  (login: demo / Demo@123)
npm test                    # 363 unit + integration tests
.venv\Scripts\python -m pytest          # 28 Selenium tests (app must be running)
npm run test:mutation       # mutation testing (~20 min)
```

More options are in [05_Test_Automation/README.md](05_Test_Automation/README.md).

## Where each assessment criterion is addressed

| Criterion (marks) | Evidence |
|---|---|
| GitHub repository creation and organisation (2) | Folder layout above; commit history from baseline import → tests → defect fixes → reports |
| Test plan and application understanding (3) | [01_Test_Plan/Test_Plan.md](01_Test_Plan/Test_Plan.md) - modules, 22 requirements, scope, approach, criteria, risks |
| Test case design using techniques (5) | [02_Test_Case_Design](02_Test_Case_Design) - EP, BVA, 4 decision tables, 2 state machines, 28 functional cases, RTM |
| Automation / tool implementation (5) | [05_Test_Automation](05_Test_Automation) - Vitest (JUnit-style), Selenium WebDriver with Page Objects, StrykerJS mutation testing |
| Test execution and defect identification (4) | [03_Test_Execution](03_Test_Execution), [04_Defect_Reports](04_Defect_Reports), [06_Test_Reports](06_Test_Reports) |
| Documentation and README (1) | this README, folder READMEs, [Conclusion.md](Conclusion.md) |

## Tools

React 18 · TypeScript · Vite 5 · Tailwind CSS · Framer Motion · node-qrcode · jsPDF · Vitest 3 · React Testing Library · V8 coverage ·
StrykerJS 10 · Python 3.12 · pytest · Selenium WebDriver 4 · Chrome · pytest-html · openpyxl · Git / GitHub
