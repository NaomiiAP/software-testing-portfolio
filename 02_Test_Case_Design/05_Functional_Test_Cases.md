# Functional (System / E2E) Test Cases

Scenario-based test cases executed in a real Chrome browser by Selenium WebDriver
([`05_Test_Automation/selenium`](../05_Test_Automation/selenium)). Each case lists its
requirement, preconditions, steps, test data and expected result. Actual results are in
[03_Test_Execution/Test_Execution_Log.md](../03_Test_Execution/Test_Execution_Log.md) and
screenshots in [07_Screenshots/release_v2](../07_Screenshots/release_v2).

**Common preconditions (every case):** RailReserve v2.0 running at `http://127.0.0.1:5173`; fresh
browser storage (no bookings, only the demo account `demo / Demo@123`); window 1366 × 900.
Dates are relative to the day of execution (D = today).

| Priority | Meaning |
|---|---|
| P1 | core booking path - must pass for release |
| P2 | important validation / secondary flow |
| P3 | cosmetic / navigation |

---

## Module M1 - Train search

| ID | Title | Req | Pri | Steps | Test data | Expected result |
|---|---|---|---|---|---|---|
| TC_E2E_01 | Valid search lists trains | REQ-01, REQ-05 | P1 | 1. Open home. 2. Select From, To, date. 3. Click **Search Trains**. | MMCT → NDLS, D+10, GN | Results page lists exactly **12951 Mumbai Rajdhani**; 3A shows "AVAILABLE 40" and fare ₹2,180 |
| TC_E2E_02 | Same source and destination | REQ-02 | P2 | Select the same station in From and To, search | MMCT → MMCT | Error "Source and destination cannot be the same"; stays on home |
| TC_E2E_03 | Date lower boundary | REQ-03 | P2 | Search with yesterday, then with today | NDLS → LKO, D-1 / D | D-1: "Journey date cannot be in the past"; D: results page opens |
| TC_E2E_04 | Date upper boundary | REQ-03 | P2 | Check date picker min/max; search D+121, then D+120 | NDLS → LKO | min = D, max = D+120; D+121: "Bookings open only 120 days in advance"; D+120 accepted |
| TC_E2E_05 | Tatkal window | REQ-04 | P2 | Search with quota Tatkal for D+5, then D+1 | NDLS → LKO | D+5: "Tatkal tickets can be booked only one day before the journey date"; D+1 lists 12230 |
| TC_E2E_06 | Weekly train running day | REQ-05 | P2 | Search on next Monday, then next Sunday | ERS → PUNE | Monday: "No trains found…"; Sunday: 11098 Poorna Express |
| TC_E2E_07 | Timetable filter is stable | REQ-05 | P3 | Open **All Trains**; filter "12951"; reload | 12951 | 16 trains listed; filter leaves exactly 12951; after reload the same 16 trains |
| TC_E2E_08 | Departed train not bookable | REQ-05 | P1 | Search for today; for every train whose departure time has passed check the card | CSMT → PUNE, D | Card shows **Departed**; **Book Now** disabled (found DEF-V2-02) |

## Module M8 - Accounts and access control

| ID | Title | Req | Pri | Steps | Test data | Expected result |
|---|---|---|---|---|---|---|
| TC_E2E_09 | Booking requires login and returns | REQ-06 | P1 | Logged out: search, choose 2A, click **Book Now**; log in | 12951, D+10; demo / Demo@123 | Redirect to `/login?next=…`; after login the passenger page for 12951 2A opens; header shows "demo" |
| TC_E2E_10 | Lock-out after 3 failures | REQ-18 | P2 | Log in with a wrong password 3×, then with the right one | demo / wrong-1..3, Demo@123 | "2 attempt(s) left", "1 attempt(s) left", "Account locked…", correct password still refused |
| TC_E2E_11 | Registration | REQ-17 | P2 | Submit invalid data; submit with taken username; submit valid data; log in | see script | One error per invalid field; "Username is already taken"; "Account priya_n created"; login succeeds |
| TC_E2E_12 | Logout | REQ-06, REQ-19 | P3 | Log in, click **Logout**, open My Bookings | demo | Back on home, no user in header; My Bookings redirects to login |

## Module M2/M3 - Booking and fare

| ID | Title | Req | Pri | Steps | Test data | Expected result |
|---|---|---|---|---|---|---|
| TC_E2E_13 | Passenger and contact validation | REQ-08, REQ-09 | P2 | Leave name empty, age 0, no gender, mobile 12345; continue | 12951 3A | "Passenger name is required", "Age must be between 1 and 120", "Please select a gender", mobile error; stays on the page |
| TC_E2E_14 | Maximum 6 passengers | REQ-07 | P2 | Click **Add passenger** 5 times | - | "6 of 6 passengers", 6 rows, Add button disabled |
| TC_E2E_15 | Family booking with concessions | REQ-10, REQ-11, REQ-12 | P1 | Book 1A for 3 passengers, pay by UPI | F 62, M 4, M 35; UPI asha.rao@okbank | Fare ₹7,867 on passenger and payment pages; ticket **Confirmed**, 10-digit PNR, berths H1/1, No berth, H1/2; "Senior citizen (F 58+) - 50%" |
| TC_E2E_16 | Payment validation | REQ-12 | P2 | Pay with invalid UPI, then card failing Luhn, then valid card | `vikram`, 4111…1112, 4111…1111 12/30 123 | UPI error; card error; valid card → Confirmed, reference CARD-XXXX-1111 |
| TC_E2E_17 | CNF → RAC → WL → REGRET | REQ-11 | P1 | Book 2 passengers in 12951 1A three times, then look at availability | D+12 | Availability AVAILABLE 2 → RAC 1 → WL 1; statuses Confirmed, RAC, Waitlisted; then REGRET and Book disabled |
| TC_E2E_18 | Group that fits no pool | REQ-11 | P1 | Fill 3 adults for 12951 1A, continue | D+14 | Stays on passenger page with "No seats available (REGRET)…" - no payment step (found DEF-V2-03) |

## Module M6/M7 - PNR, cancellation, refund

| ID | Title | Req | Pri | Steps | Test data | Expected result |
|---|---|---|---|---|---|---|
| TC_E2E_19 | PNR enquiry | REQ-13 | P1 | Query 12345; 0000000000; then book and query the real PNR 3× | - | "PNR must be exactly 10 digits"; "PNR not found"; real PNR always shows 12951, Confirmed, H1/1, H1/2 |
| TC_E2E_20 | Cancel, refund, promotion | REQ-14, REQ-15 | P1 | Book CNF and RAC tickets; cancel the CNF one | 1A, 2 adults each, D+20 | Total ₹10,482; preview and result refund **₹9,982**; status Cancelled; RAC PNR promoted, shown Confirmed in My Bookings |
| TC_E2E_21 | Keep ticket | REQ-14 | P3 | Start cancelling, choose **Keep ticket** | - | Status remains Confirmed; Cancel button still present |
| TC_E2E_22 | Download e-ticket | REQ-19 | P2 | Click **Download e-ticket (PDF)** | - | File `RailReserve-<PNR>.pdf` downloaded, starts with `%PDF` |

## Module M9 - Navigation and UI

| ID | Title | Req | Pri | Steps | Test data | Expected result |
|---|---|---|---|---|---|---|
| TC_E2E_23 | 404 and footer pages | REQ-20 | P3 | Open `/no-such-page`; click footer About, Refund policy | - | "Page not found"; About mentions irctc-clone; refund rules listed |
| TC_E2E_24 | My Bookings | REQ-19 | P2 | Log in, open My Bookings, book, open again | D+30 | Empty state first; then exactly the new PNR, Confirmed |
| TC_E2E_25 | Title and branding | REQ-20 | P3 | Open home | - | Title "RailReserve \| Railway Reservation System"; brand in header |
| TC_E2E_26 | No horizontal scroll, mobile menu | REQ-21 | P3 | At 1366 px and 390 px open `/` and `/trains`; open the mobile menu | - | `scrollWidth` ≤ `clientWidth` everywhere; mobile menu shows PNR Status |

## Module M10 - Demo control room and notifications

| ID | Title | Req | Pri | Steps | Test data | Expected result |
|---|---|---|---|---|---|---|
| TC_E2E_27 | Demo scenario with toast and testing lens | REQ-22 | P2 | Click **Demo**, run "Unknown PNR 0000000000" | - | PNR page opens with "PNR not found"; a toast titled "PNR not found" shows the lens chip naming TC_IT_10 |
| TC_E2E_28 | Demo seeds the promotion scenario | REQ-22, REQ-11 | P2 | Click **Demo**, run "Cancel → waitlist promotion" | - | Signed in as demo; My Bookings lists exactly 3 PNRs: Confirmed, RAC, Waitlisted |

---

## Baseline probe on the original application (v1.0)

The same requirements were checked against the original irctc-clone with
[`baseline_v1/test_v1_defect_probe.py`](../05_Test_Automation/selenium/baseline_v1/test_v1_defect_probe.py)
(17 probes, `V1-D01` … `V1-D17`). All 17 failed, and each failure is logged in the
[Defect Report](../04_Defect_Reports/Defect_Report.md). The v2.0 test that verifies each fix is
listed in the [traceability matrix](06_Traceability_Matrix.md).
