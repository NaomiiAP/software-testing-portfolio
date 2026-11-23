# Boundary Value Analysis (BVA)

**Idea:** defects cluster at the edges of input ranges (`<` written instead of `<=`, off-by-one
errors). For every range `[min, max]` we test **min-1, min, min+1, max-1, max, max+1**
(robust BVA, 6 values). For single thresholds we test the value just below, at and just above.

Automated in [`validation.bva.test.ts`](../05_Test_Automation/unit-tests/validation.bva.test.ts),
[`fare.test.ts`](../05_Test_Automation/unit-tests/fare.test.ts),
[`refund.test.ts`](../05_Test_Automation/unit-tests/refund.test.ts),
[`reservation.test.ts`](../05_Test_Automation/unit-tests/reservation.test.ts),
[`stateTransition.test.ts`](../05_Test_Automation/unit-tests/stateTransition.test.ts),
[`trains.test.ts`](../05_Test_Automation/unit-tests/trains.test.ts) and
[`mutationGaps.test.ts`](../05_Test_Automation/unit-tests/mutationGaps.test.ts); key boundaries
are repeated in the browser (`TC_E2E_03`, `TC_E2E_04`, `TC_E2E_14`).

```
          min-1   min   min+1  ...  max-1   max   max+1
 Age:       0      1      2    ...   119    120    121
            ✗      ✓      ✓           ✓      ✓      ✗
```

## 1. Ranges (robust BVA)

### 1.1 Passenger age 1-120 (REQ-08)

| Test case | Value | Expected |
|---|---|---|
| TC_BVA_AGE_01 | 0 | ✗ "Age must be between 1 and 120" |
| TC_BVA_AGE_02 | 1 | ✓ |
| TC_BVA_AGE_03 | 2 | ✓ |
| TC_BVA_AGE_04 | 119 | ✓ |
| TC_BVA_AGE_05 | 120 | ✓ |
| TC_BVA_AGE_06 | 121 | ✗ "Age must be between 1 and 120" |

### 1.2 Journey date: today … today + 120 days (REQ-03)

| Test case | Offset from today | Expected |
|---|---|---|
| TC_BVA_DATE_01 | -1 | ✗ "Journey date cannot be in the past" (also TC_E2E_03 in the browser) |
| TC_BVA_DATE_02 | 0 | ✓ (also TC_E2E_03) |
| TC_BVA_DATE_03 | +1 | ✓ |
| TC_BVA_DATE_04 | +119 | ✓ |
| TC_BVA_DATE_05 | +120 | ✓ (also TC_E2E_04) |
| TC_BVA_DATE_06 | +121 | ✗ "Bookings open only 120 days in advance" (also TC_E2E_04) |

### 1.3 Passengers per booking 1-6 (REQ-07)

| Test case | Count | Expected |
|---|---|---|
| TC_BVA_PAX_01 | 0 | ✗ |
| TC_BVA_PAX_02 | 1 | ✓ |
| TC_BVA_PAX_03 | 2 | ✓ |
| TC_BVA_PAX_04 | 5 | ✓ |
| TC_BVA_PAX_05 | 6 | ✓ (also TC_BVA_BOOK_01 - a real 6-passenger booking, and TC_E2E_14 in the UI) |
| TC_BVA_PAX_06 | 7 | ✗ (UI: the "Add passenger" button is disabled at 6, TC_E2E_14) |

### 1.4 Name length 3-40 (REQ-08)

| Test case | Length | Expected |
|---|---|---|
| TC_BVA_NAME_01 … 06 | 2 / 3 / 4 / 39 / 40 / 41 | ✗ / ✓ / ✓ / ✓ / ✓ / ✗ |

### 1.5 Password length 8-20 and username length 4-15 (REQ-17)

| Test case | Length | Expected |
|---|---|---|
| TC_BVA_PWD_01 … 06 | 7 / 8 / 9 / 19 / 20 / 21 | ✗ / ✓ / ✓ / ✓ / ✓ / ✗ |
| TC_BVA_USER_01 … 04 | 3 / 4 / 15 / 16 | ✗ / ✓ / ✓ / ✗ |

### 1.6 PNR sequence number 1 … 999,999,999 (REQ-12)

| Test case | Sequence | Expected |
|---|---|---|
| TC_BVA_PNR_01 | 0 | ✗ RangeError |
| TC_BVA_PNR_02 | 1 | ✓ `4007919017` |
| TC_BVA_PNR_03 | 999,999,999 | ✓ 10-digit PNR |
| TC_BVA_PNR_04 | 1,000,000,000 | ✗ RangeError |

## 2. Thresholds inside the business rules

### 2.1 Concession ages (REQ-10) - General quota

| Test case | Age, gender | Expected concession | Boundary |
|---|---|---|---|
| TC_BVA_CON_01 | 4, M | Child free (no berth) | last free age |
| TC_BVA_CON_02 | 5, M | Child 50% | first paying child age |
| TC_BVA_CON_03 | 11, M | Child 50% | last child age |
| TC_BVA_CON_04 | 12, M | none | first adult age |
| TC_BVA_CON_05 | 57, F | none | below female senior age |
| TC_BVA_CON_06 | 58, F | Senior F 50% | female senior age |
| TC_BVA_CON_07 | 59, M | none | below male senior age |
| TC_BVA_CON_08 | 60, M | Senior M 40% | male senior age |

### 2.2 "Older than 11" rule for a booking (REQ-07)

| Test case | Oldest passenger | Expected |
|---|---|---|
| TC_BVA_BOOK_02 | 11 | ✗ "At least one passenger must be older than 11 years" |
| TC_BVA_BOOK_03 | 12 | ✓ |

### 2.3 Minimum fare - Sleeper ₹0.60/km, minimum ₹120 (REQ-10)

| Test case | Distance | Raw fare | Expected base fare |
|---|---|---|---|
| TC_BVA_MINFARE_01 | 199 km | 119.4 | ₹120 (raised to minimum) |
| TC_BVA_MINFARE_02 | 200 km | 120.0 | ₹120 |
| TC_BVA_MINFARE_03 | 201 km | 120.6 | ₹121 |

### 2.4 Tatkal premium clamp - Sleeper 30%, min ₹100, max ₹200 (REQ-10)

| Test case | Base fare | 30% | Expected premium |
|---|---|---|---|
| TC_BVA_TQ_01 | 330 | 99.0 | ₹100 (min) |
| TC_BVA_TQ_02 | 334 | 100.2 | ₹100 |
| TC_BVA_TQ_03 | 337 | 101.1 | ₹101 |
| TC_BVA_TQ_04 | 663 | 198.9 | ₹199 |
| TC_BVA_TQ_05 | 667 | 200.1 | ₹200 |
| TC_BVA_TQ_06 | 670 | 201.0 | ₹200 (max) |

### 2.5 Refund time windows - confirmed 3A ticket, fare ₹2000, 2 passengers (REQ-14)

| Test case | Hours before departure | Expected rule |
|---|---|---|
| TC_BVA_REF_01 | 48.01 | Flat charge |
| TC_BVA_REF_02 | 48 | 25% (">48 h" is exclusive) |
| TC_BVA_REF_03 | 12.01 | 25% |
| TC_BVA_REF_04 | 12 | 50% |
| TC_BVA_REF_05 | 4.01 | 50% |
| TC_BVA_REF_06 | 4 | No refund (chart prepared) |
| TC_BVA_REF_07 | 0.01 | No refund |
| TC_BVA_REF_08 | 0 | ✗ cannot cancel - train departed |
| TC_BVA_REF_09 | 0.5 (RAC) | Clerkage only |
| TC_BVA_REF_10 | 0.49 (RAC) | No refund |

### 2.6 Chart preparation (4 h) and departure time (REQ-05, REQ-16)

| Test case | Situation | Expected |
|---|---|---|
| TC_BVA_CHART_01 | 4 h + 1 ms before departure / exactly 4 h | chart not prepared / prepared |
| TC_BVA_DEP_01 | 06:39 for a 06:40 train | not departed |
| TC_BVA_DEP_02 | 06:40 | departed |
| TC_BVA_DEP_03 | 06:41 | departed |
| TC_BVA_DEP_04 | 23:59 the evening before | not departed |
| TC_BVA_BOOK_04 | booking at 06:40 / 06:39 for the 06:40 train | ✗ refused / ✓ accepted |

### 2.7 Seat allocation - 40 berths, 38 booked (REQ-11)

| Test case | Seats requested | Free berths | Expected |
|---|---|---|---|
| TC_BVA_ALLOC_01 | 1 | 2 | CNF |
| TC_BVA_ALLOC_02 | 2 | 2 | CNF |
| TC_BVA_ALLOC_03 | 3 | 2 | RAC |

### 2.8 Coach / berth numbering - 3A, 64 berths per coach (REQ-11)

| Test case | Slot index | Expected label |
|---|---|---|
| TC_BVA_BERTH_01 | 0 | B1/1 |
| TC_BVA_BERTH_02 | 63 | B1/64 (last berth of coach 1) |
| TC_BVA_BERTH_03 | 64 | B2/1 (first berth of coach 2) |

### 2.9 Card expiry within the current year (REQ-12) - today 2026-06-15

| Test case | Expiry | Expected |
|---|---|---|
| TC_BVA_EXP_01 | 05/26 | ✗ previous month |
| TC_BVA_EXP_02 | 06/26 | ✓ current month |
| TC_BVA_EXP_03 | 07/26 | ✓ |
| TC_BVA_EXP_04 | 05/27 | ✓ next year |
| TC_BVA_CARD_01 | 17-digit / 12-digit numbers that pass Luhn | ✗ length enforced |

### 2.10 Login lock-out expiry (REQ-18)

| Test case | Time | Expected |
|---|---|---|
| TC_ST_LOGIN_08 | lock time + 15 min - 1 ms | still LOCKED |
| TC_ST_LOGIN_09 | lock time + 15 min exactly | login allowed |

---

**Why it mattered:** mutation testing (section 6 of the summary report) showed that before
TC_BVA_BOOK_02/03, TC_BVA_BOOK_04 and TC_BVA_CHART_01 existed, changing `>` to `>=` in those rules
went **undetected**. Boundary tests are what kill those mutants.
