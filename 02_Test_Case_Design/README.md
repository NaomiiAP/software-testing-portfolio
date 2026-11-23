# 02 - Test Case Design

| Document | Technique | What it covers |
|---|---|---|
| [01_Equivalence_Partitioning.md](01_Equivalence_Partitioning.md) | Equivalence Partitioning | ~100 valid/invalid classes for 17 inputs |
| [02_Boundary_Value_Analysis.md](02_Boundary_Value_Analysis.md) | Boundary Value Analysis | ranges (age, date, passengers, lengths) and business thresholds (concession ages, min fare, Tatkal clamp, refund hours, chart, departure, berths) |
| [03_Decision_Table.md](03_Decision_Table.md) | Decision Tables | concession, refund, seat allocation, login outcome |
| [04_State_Transition.md](04_State_Transition.md) | State Transition | ticket status (CNF/RAC/WL/CAN) and login lock-out, with diagrams |
| [05_Functional_Test_Cases.md](05_Functional_Test_Cases.md) | Scenario / use-case testing | 28 end-to-end browser test cases with steps, data and expected results |
| [06_Traceability_Matrix.md](06_Traceability_Matrix.md) | Traceability | requirement → test cases → defects, and defect → regression test |

## Test case ID convention

```
TC_<TECHNIQUE>_<AREA>_<NN>        e.g. TC_BVA_AGE_01, TC_DT_REF_04, TC_E2E_17
```

| Prefix | Meaning | Where it runs |
|---|---|---|
| `TC_EP_` | Equivalence Partitioning | Vitest (unit) |
| `TC_BVA_` | Boundary Value Analysis | Vitest (unit) |
| `TC_DT_` | Decision Table | Vitest (unit) |
| `TC_ST_` | State Transition | Vitest (unit) |
| `TC_UT_` | Other unit tests (functional checks of a module) | Vitest (unit) |
| `TC_UT_MUT_` | Unit tests added to kill surviving mutants | Vitest (unit) |
| `TC_IT_` | Integration - real React pages in jsdom | Vitest + React Testing Library |
| `TC_E2E_` | System / end-to-end in Chrome | Selenium WebDriver + pytest |
| `V1-Dxx` | Baseline probe of the original app | Selenium WebDriver + pytest |

Every automated test's name **starts with its ID**, so the JUnit XML reports, the execution log
and these design documents all use the same identifiers.

## How expected results are fixed before execution

* Validation messages are constants (`MESSAGES` in `app/src/lib/validation.ts`) and are asserted word for word.
* Money values were **calculated by hand** from the fare rules before the tests were run
  (e.g. 1384 km × ₹3.6 = ₹4,982.4 → ₹4,982 base; senior female 50% = ₹2,491; GST 5% = ₹125 → ₹2,616).
* Dates use an **injected "today" / clock** in unit tests (2026-01-05 10:00), and dates relative to the
  execution day in Selenium tests, so results do not depend on the day the suite is run.
