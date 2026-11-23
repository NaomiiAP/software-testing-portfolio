# Equivalence Partitioning (EP)

**Idea:** split each input's domain into classes (partitions) that the program should treat the
same way, then test **one representative value per class**. If one value of a class works or
fails, all values of that class are expected to behave the same way.

* Valid classes (V) must be accepted; invalid classes (I) must be rejected with the stated message.
* "today" is fixed at **2026-01-05** in the unit tests (the clock is injected), so the results are repeatable.
* Automated in [`validation.ep.test.ts`](../05_Test_Automation/unit-tests/validation.ep.test.ts)
  (plus a few in `fare.test.ts`, `trains.test.ts`, `mutationGaps.test.ts`). The same partitions are
  exercised through the browser in the Selenium suite (`TC_E2E_02`, `TC_E2E_11`, `TC_E2E_13`, `TC_E2E_16`, `TC_E2E_19`).

---

## 1. Passenger name - REQ-08

Rule: trimmed length 3-40, letters / spaces / dots only, must start with a letter.

| Class | Type | Representative | Expected | Test case |
|---|---|---|---|---|
| Letters and spaces | V | `Asha Rao` | accepted | TC_EP_NAME_01 |
| Letters with dot | V | `S. Kumar` | accepted | TC_EP_NAME_02 |
| Empty | I | `""` | "Passenger name is required" | TC_EP_NAME_03 |
| Whitespace only | I | `"   "` | "Passenger name is required" | TC_EP_NAME_04 |
| Shorter than 3 | I | `Al` | "Name must be 3-40 characters" | TC_EP_NAME_05 |
| Longer than 40 | I | 45 × `A` | "Name must be 3-40 characters" | TC_EP_NAME_06 |
| Contains digit | I | `Ravi2` | "Name may contain only letters, spaces and dots" | TC_EP_NAME_07 |
| Contains special character | I | `Ravi@Rao` | same | TC_EP_NAME_08 |
| Starts with non-letter | I | `.Ravi` | same | TC_EP_NAME_09 |

## 2. Passenger age - REQ-08

| Class | Type | Representative | Expected | Test case |
|---|---|---|---|---|
| Whole number 1-120 (text) | V | `"35"` | accepted | TC_EP_AGE_01 |
| Whole number 1-120 (number) | V | `35` | accepted | TC_EP_AGE_02 |
| With surrounding spaces | V | `" 35 "` | accepted | TC_UT_MUT_01 |
| Empty | I | `""` | "Age is required" | TC_EP_AGE_03 |
| Non-numeric | I | `abc` | "Age must be a whole number" | TC_EP_AGE_04 |
| Decimal | I | `12.5` | "Age must be a whole number" | TC_EP_AGE_05 |
| Negative | I | `-5` | "Age must be a whole number" | TC_EP_AGE_06 |
| Above range | I | `150` | "Age must be between 1 and 120" | TC_EP_AGE_07 |

## 3. Gender - REQ-08

| Class | Type | Representative | Expected | Test case |
|---|---|---|---|---|
| Male / Female / Transgender | V | `M`, `F`, `T` | accepted | TC_EP_GEN_01-03 |
| Not selected | I | `""` | "Please select a gender" | TC_EP_GEN_04 |
| Unknown code | I | `X` | "Please select a gender" | TC_EP_GEN_05 |
| Whole passenger form | V/I | all valid / all invalid | `{}` / one message per field | TC_EP_GEN_06 |

## 4. Source and destination stations - REQ-02

| Class | Type | Representative | Expected | Test case |
|---|---|---|---|---|
| Two different stations | V | `MMCT`, `NDLS` | accepted | TC_EP_STN_01, TC_E2E_01 |
| Source missing | I | `""`, `NDLS` | "Please select the source station" | TC_EP_STN_02 |
| Destination missing | I | `MMCT`, `""` | "Please select the destination station" | TC_EP_STN_03 |
| Same station | I | `MMCT`, `MMCT` | "Source and destination cannot be the same" | TC_EP_STN_04, TC_IT_01, TC_E2E_02 |

## 5. Journey date - REQ-03 (today = 2026-01-05)

| Class | Type | Representative | Expected | Test case |
|---|---|---|---|---|
| Inside the 120-day window | V | `2026-02-01` | accepted | TC_EP_DATE_01 |
| Empty | I | `""` | "Please select a journey date" | TC_EP_DATE_02 |
| Impossible calendar date | I | `2026-02-30` | "Journey date is not a valid date" | TC_EP_DATE_03 |
| Wrong format | I | `05/02/2026` | "Journey date is not a valid date" | TC_EP_DATE_04 |
| In the past | I | `2025-12-01` | "Journey date cannot be in the past" | TC_EP_DATE_05 |
| Beyond 120 days | I | `2026-12-01` | "Bookings open only 120 days in advance" | TC_EP_DATE_06 |

## 6. Quota vs. journey date - REQ-04 (today = 2026-01-05)

| Class | Type | Representative | Expected | Test case |
|---|---|---|---|---|
| General quota, any valid date | V | GN, `2026-02-01` | accepted | TC_EP_QUOTA_01 |
| Tatkal for tomorrow | V | TQ, `2026-01-06` | accepted | TC_EP_QUOTA_02, TC_E2E_05 |
| Tatkal for today | I | TQ, `2026-01-05` | "Tatkal tickets can be booked only one day before the journey date" | TC_EP_QUOTA_03 |
| Tatkal for a later date | I | TQ, `2026-01-10` | same | TC_EP_QUOTA_04, TC_E2E_05 |

## 7. Passengers per booking - REQ-07

| Class | Type | Representative | Expected | Test case |
|---|---|---|---|---|
| 1-6 | V | 3 | accepted | TC_EP_CNT_01 |
| Below range | I | -2 | "A booking must have between 1 and 6 passengers" | TC_EP_CNT_02 |
| Above range | I | 10 | same | TC_EP_CNT_03 |
| Fractional | I | 2.5 | same | TC_EP_CNT_04 |
| No passenger older than 11 | I | ages 8 and 3 | "At least one passenger must be older than 11 years" | TC_UT_BOOK_14 |

## 8. PNR number - REQ-13

| Class | Type | Representative | Expected | Test case |
|---|---|---|---|---|
| Exactly 10 digits | V | `4007919017` | accepted | TC_EP_PNR_01 |
| 10 digits with spaces around | V | `" 4007919017 "` | accepted (trimmed) | TC_EP_PNR_02 |
| Empty | I | `""` | "Please enter a PNR number" | TC_EP_PNR_03 |
| Contains a letter | I | `40079A9017` | "PNR must contain only digits" | TC_EP_PNR_04 |
| Too short | I | `12345` | "PNR must be exactly 10 digits" | TC_EP_PNR_05, TC_IT_09, TC_E2E_19 |
| Too long | I | `12345678901` | same | TC_EP_PNR_06 |
| Well-formed but never booked | I (business) | `0000000000` | "PNR not found" | TC_IT_10, TC_E2E_19 |

## 9. Contact and account fields - REQ-09, REQ-17

| Input | Class | Type | Representative | Test case |
|---|---|---|---|---|
| Mobile | 10 digits starting 6-9 | V | `9876543210` | TC_EP_MOB_01 |
| | starts with 0-5 | I | `5876543210` | TC_EP_MOB_02 |
| | too short / too long | I | `98765` / `98765432101` | TC_EP_MOB_03 / 04 |
| | contains letters | I | `98765abc10` | TC_EP_MOB_05 |
| E-mail | valid | V | `asha.rao@example.com` | TC_EP_MAIL_01 |
| | no `@` / no domain / no local part | I | `asharao.example.com` / `asha@` / `@example.com` | TC_EP_MAIL_02-04 |
| | no top-level domain / contains space | I | `asha@example` / `asha rao@example.com` | TC_EP_MAIL_05-06 |
| Username | 4-15, starts with letter, `[A-Za-z0-9_]` | V | `naomi_01` | TC_EP_USER_01 |
| | too short / too long | I | `abc` / 20 chars | TC_EP_USER_02 / 05 |
| | starts with digit / contains space | I | `1abc` / `ab cd` | TC_EP_USER_03 / 04 |
| | already taken | I | `demo` | TC_UT_STORE_02, TC_E2E_11 |
| Password | 8-20 with upper, lower, digit, special | V | `Demo@123` | TC_EP_PWD_01 |
| | missing upper / lower / digit / special | I | `demo@123` / `DEMO@123` / `Demo@abc` / `Demo1234` | TC_EP_PWD_02-05 |
| | too short | I | `De@1` | TC_EP_PWD_06 |

## 10. Payment - REQ-12 (today = 2026-01-05)

| Input | Class | Type | Representative | Test case |
|---|---|---|---|---|
| UPI ID | `name@bank` | V | `asha@okbank` | TC_EP_UPI_01 |
| | no handle / no name / digit in handle | I | `asha` / `@okbank` / `asha@ok1bank` | TC_EP_UPI_02-04 |
| Card number | 16 digits, Luhn valid (Visa / Mastercard test numbers) | V | `4111 1111 1111 1111`, `5555555555554444` | TC_EP_CARD_01-02 |
| | 16 digits, Luhn invalid | I | `4111111111111112` | TC_EP_CARD_03, TC_E2E_16 |
| | 15 digits / contains a letter | I | `411111111111111` / `…111A` | TC_EP_CARD_04-05 |
| Expiry (MM/YY) | future month / current month | V | `12/30` / `01/26` | TC_EP_EXP_01-02 |
| | past month / month 13 / month 00 / wrong format | I | `12/25` / `13/27` / `00/27` / `1227` | TC_EP_EXP_03-06 |
| CVV | 3 digits | V | `123` | TC_EP_CVV_01 |
| | 2 digits / 4 digits / letter | I | `12` / `1234` / `12a` | TC_EP_CVV_02-04 |

## 11. Distance for fare calculation - REQ-10

| Class | Type | Representative | Expected | Test case |
|---|---|---|---|---|
| Positive distance | V | 1384 km | fare computed | TC_UT_FARE_01 |
| Zero / negative / not a number | I | 0, -10, NaN | error "Distance must be greater than zero" | TC_EP_DIST_01-03 |

---

**Summary:** 17 inputs, about 100 partitions, each covered by at least one test case. Valid
and invalid classes are tested separately, one invalid class per test, so a failure points to
exactly one rule.
