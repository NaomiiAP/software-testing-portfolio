# Exploratory Testing Notes

Exploratory testing = learning the product, designing tests and running them at the same time,
guided by a **charter**. Findings were turned into automated tests so they can be re-run.

---

## Session 1 - Original application (v1.0)

| | |
|---|---|
| **Charter** | Explore the original irctc-clone as a first-time passenger trying to search, book and check a PNR, to find out what works and whether it can be tested repeatably. |
| **Build** | irctc-clone commit `e108a38`, `npx vite --port 5174` |
| **Areas** | Home search, /book page, train list, PNR status, header/footer navigation, README claims |

**Observations**

1. Home search and the "Get Tickets" page accept input but nothing happens on submit.
2. PNR status returns a booking for *any* 10-digit number; repeating the query changes the train number and status colour.
3. The train list shows different trains every time; typing in its filter changes the list on every keystroke.
4. Header "My Bookings" and several footer links give an empty page.
5. README promises login, payment, booking history, cancellation, Tatkal, concessions - none exist.
6. A horizontal scrollbar is visible on most pages.

**Questions raised**

* How can expected results be written for random data? → They can't. **Decision:** build a
  deterministic v2.0 and record the v1.0 behaviour as defects.

**Outcome:** each observation was encoded as an automated Selenium probe
(`05_Test_Automation/selenium/baseline_v1`), giving 17 reproducible failures → defects D01-D17,
plus D18-D19 from static testing.

---

## Session 2 - Improved application (v2.0), booking edge cases

| | |
|---|---|
| **Charter** | Explore the booking flow at the edges of time and capacity: same-day journeys, nearly-full trains, groups, children, cancellations. |
| **Build** | `app/` v2.0, `npm run dev` (port 5173) |

**Observations and follow-up**

| # | Observation | Follow-up |
|---|---|---|
| 1 | Searching for *today* in the evening still offers the 06:40 Intercity with "Book Now" | Wrote TC_E2E_08 → failed → **DEF-V2-02** |
| 2 | 12951 1A has only 2 berths / 2 RAC / 2 WL; a 3-adult group can still proceed to payment | Wrote TC_E2E_18 → failed → **DEF-V2-03** |
| 3 | A 4-year-old on the ticket gets "No berth" and ₹0; the refund deduction counts only paying passengers | Confirmed correct; locked in with TC_UT_MUT_18 / TC_UT_MUT_20 |
| 4 | After cancelling a CNF ticket the RAC ticket of the same train becomes Confirmed with the freed berth | Confirmed correct; TC_E2E_20, TC_UT_MUT_15 |
| 5 | Login `?next=` parameter accepts any value | Hardened (`safeNext`), TC_IT_14 |
| 6 | "All Trains" is highlighted while viewing a route search | **DEF-V2-04** (found while reviewing E2E screenshots) |
| 7 | Reloading the payment page after paying shows "no booking in progress" (no double booking) | Confirmed correct |

---

## Session 3 - Reviewing the tests themselves

| | |
|---|---|
| **Charter** | Look for tests that pass for the wrong reason. |

| # | Observation | Follow-up |
|---|---|---|
| 1 | Probe V1-D16 passed although the D06 screenshot clearly shows a horizontal scrollbar | `window.innerWidth` includes the scrollbar; changed to `clientWidth` in V1-D16 **and** TC_E2E_26. v1.0 overflow of 1-3 px confirmed. |
| 2 | TC_IT_18 failed on the fixed header | The assertion searched for the substring `text-yellow-300`, which also matches `hover:text-yellow-300`. Fixed the assertion to compare whole class names. |
| 3 | 87 mutants survived the first Stryker run although line coverage was 100% | Weak assertions and missing boundary cases → 30 new targeted tests (see Test Summary Report, section 6). |
