# Decision Table Testing

**Idea:** when the output depends on a **combination** of conditions, list every relevant
combination as a rule (column) and test each rule at least once. Columns marked "-" mean "don't care"
(the rule applies whatever the value), which collapses the full table into fewer rules.

Four decision tables were built for RailReserve:

| # | Table | Conditions | Rules | Automated in |
|---|---|---|---|---|
| 1 | Concession | age band × gender × quota | 8 | `fare.test.ts` |
| 2 | Cancellation refund | status × quota × time before departure | 9 | `refund.test.ts` |
| 3 | Seat allocation | free berths × free RAC × free WL | 4 | `reservation.test.ts` |
| 4 | Login outcome | locked? × lock expired? × password correct? × failures so far | 5 | `stateTransition.test.ts` |

---

## Table 1 - Passenger concession (REQ-10)

Implemented in `getConcession(age, gender, quota)` - [`app/src/lib/fare.ts`](../app/src/lib/fare.ts).

| Conditions / Actions | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 |
|---|---|---|---|---|---|---|---|---|
| **C1** Age band | < 5 | 5-11 | 5-11 | 12-57 | ≥ 58 | 58-59 | ≥ 60 | ≥ 58 (F) / ≥ 60 (M,T) |
| **C2** Gender | - | - | - | - | F | M / T | M / T | - |
| **C3** Quota | - | GN | TQ | - | GN | - | GN | TQ |
| **A1** Free, no berth | ✔ | | | | | | | |
| **A2** 50% (child) | | ✔ | | | | | | |
| **A3** 50% (senior female) | | | | | ✔ | | | |
| **A4** 40% (senior male / transgender) | | | | | | | ✔ | |
| **A5** No concession | | | ✔ | ✔ | | ✔ | | ✔ |

Test cases (one or more per rule):

| Test case | Rule | Age | Gender | Quota | Expected |
|---|---|---|---|---|---|
| TC_DT_CON_01 | R1 | 3 | M | GN | CHILD_FREE |
| TC_DT_CON_02 | R1 | 3 | F | TQ | CHILD_FREE (applies in Tatkal too) |
| TC_DT_CON_03 | R2 | 8 | M | GN | CHILD_HALF |
| TC_DT_CON_04 | R3 | 8 | F | TQ | NONE |
| TC_DT_CON_05 | R4 | 30 | M | GN | NONE |
| TC_DT_CON_13 | R4 | 30 | F | TQ | NONE |
| TC_DT_CON_06 | R5 | 58 | F | GN | SENIOR_FEMALE |
| TC_DT_CON_08 | R5 | 65 | F | GN | SENIOR_FEMALE |
| TC_DT_CON_07 | R6 | 58 | M | GN | NONE |
| TC_DT_CON_09 | R7 | 65 | M | GN | SENIOR_MALE |
| TC_DT_CON_10 | R7 | 65 | T | GN | SENIOR_MALE |
| TC_DT_CON_11 | R8 | 65 | F | TQ | NONE |
| TC_DT_CON_12 | R8 | 65 | M | TQ | NONE |

End-to-end check: TC_E2E_15 books a family (F 62, M 4, M 35) in 1A and verifies on the e-ticket
that R5, R1 and R4 were applied: ₹2,616 + ₹0 + ₹5,231 + ₹20 fee = **₹7,867**.

---

## Table 2 - Cancellation refund (REQ-14)

Implemented in `calculateRefund(input, hoursBeforeDeparture)` - [`app/src/lib/refund.ts`](../app/src/lib/refund.ts).
Fare used in the tests: ₹2000 (3A, 2 paying passengers → flat charge 2 × ₹180 = ₹360).

| Conditions / Actions | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 |
|---|---|---|---|---|---|---|---|---|---|
| **C1** Status | CNF | CNF | CNF | CNF | CNF | RAC / WL | RAC / WL | - | - |
| **C2** Quota | GN | GN | GN | GN | TQ | - | - | - | - |
| **C3** Hours before departure | > 48 | (12, 48] | (4, 12] | (0, 4] | > 0 | ≥ 0.5 | (0, 0.5) | ≤ 0 | - |
| **A1** Deduct flat charge | ✔ | | | | | | | | |
| **A2** Deduct max(25%, flat) | | ✔ | | | | | | | |
| **A3** Deduct max(50%, flat) | | | ✔ | | | | | | |
| **A4** No refund | | | | ✔ | ✔ | | ✔ | | |
| **A5** Deduct ₹60 clerkage / passenger | | | | | | ✔ | | | |
| **A6** Refuse cancellation | | | | | | | | ✔ | |
| **A7** Deduction capped at fare | | | | | | | | | ✔ |

| Test case | Rule | Input | Expected |
|---|---|---|---|
| TC_DT_REF_01 | R1 | CNF, GN, 72 h | FLAT - refund ₹1640, deduction ₹360 |
| TC_DT_REF_02 | R2 | CNF, GN, 24 h | PCT_25 - refund ₹1500 (25% = 500 > 360) |
| TC_DT_REF_09 | R2 | CNF, GN, 24 h, fare ₹1000 | PCT_25 - refund ₹640 (flat 360 > 25% = 250) |
| TC_DT_REF_03 | R3 | CNF, GN, 8 h | PCT_50 - refund ₹1000 |
| TC_DT_REF_04 | R4 | CNF, GN, 2 h | NO_REFUND_CHART - refund ₹0 |
| TC_DT_REF_05 | R5 | CNF, TQ, 72 h | NO_REFUND_TATKAL - refund ₹0 |
| TC_DT_REF_06 | R6 | RAC, GN, 24 h | CLERKAGE - refund ₹1880 |
| TC_DT_REF_07 | R6 | WL, TQ, 2 h | CLERKAGE - refund ₹1880 (Tatkal RAC/WL is refundable) |
| TC_DT_REF_08 | R7 | RAC, GN, 0.25 h | NO_REFUND_LATE - refund ₹0 |
| TC_DT_REF_10 | R8 | CNF, 0 h | error "already departed" |
| TC_DT_REF_11 | R8 | WL, -1 h | error |
| TC_UT_REF_01 | R9 | CNF, fare ₹100, 72 h | deduction ₹100 (not ₹360), refund ₹0 |

End-to-end check: TC_E2E_20 cancels a 1A ticket 20 days ahead (R1): total ₹10,482 → refundable
₹10,462 → deduction 2 × ₹240 → **refund ₹9,982**, shown both in the preview and after cancelling.

---

## Table 3 - Seat allocation for a booking (REQ-11)

Implemented in `decideStatus(seatsNeeded, inventory, occupancy)` - [`app/src/lib/reservation.ts`](../app/src/lib/reservation.ts).
Test inventory: 2 berths / 2 RAC / 2 WL (the real 1A inventory of train 12951).

| Conditions / Actions | R1 | R2 | R3 | R4 |
|---|---|---|---|---|
| **C1** seats ≤ free berths | Y | N | N | N |
| **C2** seats ≤ free RAC | - | Y | N | N |
| **C3** seats ≤ free WL | - | - | Y | N |
| **A** Status | CNF | RAC | WL | REGRET (booking refused) |

| Test case | Rule | Seats needed | Occupied CNF / RAC / WL | Expected |
|---|---|---|---|---|
| TC_DT_ALLOC_01 | R1 | 2 | 0 / 0 / 0 | CNF |
| TC_DT_ALLOC_02 | R2 | 1 | 2 / 0 / 0 | RAC |
| TC_DT_ALLOC_06 | R2 | 2 | 1 / 0 / 0 | RAC (only 1 berth left - whole PNR goes RAC) |
| TC_DT_ALLOC_03 | R3 | 2 | 2 / 2 / 0 | WL |
| TC_DT_ALLOC_04 | R4 | 1 | 2 / 2 / 2 | REGRET |
| TC_DT_ALLOC_05 | R4 | 3 | 0 / 0 / 0 | REGRET (group larger than every pool) |

End-to-end: TC_E2E_17 walks R1 → R2 → R3 → R4 in the browser; TC_E2E_18 checks that R4 is
reported on the passenger page (this is where defect **DEF-V2-03** was found).

---

## Table 4 - Login outcome (REQ-18)

Implemented in `attemptLogin(state, credentialsValid, now)` - [`app/src/lib/auth.ts`](../app/src/lib/auth.ts).

| Conditions / Actions | R1 | R2 | R3 | R4 | R5 |
|---|---|---|---|---|---|
| **C1** Lock active (now < lockedUntil) | N | N | N | Y | N (expired) |
| **C2** Password correct | Y | N | N | - | N |
| **C3** Failures so far | - | 0 or 1 | 2 | - | (reset to 0) |
| **A** Outcome | SUCCESS, counter reset | INVALID, counter + 1 | LOCKED for 15 min | LOCKED (unchanged) | INVALID, counter = 1 |

| Test case | Rule |
|---|---|
| TC_ST_LOGIN_01, TC_ST_LOGIN_05, TC_ST_LOGIN_09 | R1 |
| TC_ST_LOGIN_02, TC_ST_LOGIN_03 | R2 |
| TC_ST_LOGIN_04 | R3 |
| TC_ST_LOGIN_06, TC_ST_LOGIN_07, TC_ST_LOGIN_08 | R4 |
| TC_ST_LOGIN_10 | R5 |

End-to-end: TC_IT_12 (component) and TC_E2E_10 (browser) show the messages "2 attempt(s) left",
"1 attempt(s) left" and "Account locked…", and that the correct password is refused while locked.
