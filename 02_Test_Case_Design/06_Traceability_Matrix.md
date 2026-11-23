# Requirements Traceability Matrix (RTM)

Links every requirement in the [Test Plan](../01_Test_Plan/Test_Plan.md#5-requirements-under-test)
to the test cases that verify it, at each test level, and to the defects found against it.
`…_01-06` means the IDs 01 to 06 of that group. All listed tests passed in the final run (see
[Test Execution Log](../03_Test_Execution/Test_Execution_Log.md)).

## 1. Requirement → test cases → defects

| Req | Requirement (short) | Unit (EP / BVA / DT / ST / UT) | Integration | System (Selenium) | Defects |
|---|---|---|---|---|---|
| REQ-01 | Search by stations, date, quota | TC_UT_SRCH_01 | TC_IT_02 | TC_E2E_01, TC_E2E_23 | D01, D04 |
| REQ-02 | Stations required and different | TC_EP_STN_01-04 | TC_IT_01, TC_IT_04, TC_IT_07 | TC_E2E_02 | D02 |
| REQ-03 | Date today … +120 days | TC_EP_DATE_01-06, TC_BVA_DATE_01-06, TC_UT_DATE_01-04, TC_UT_MUT_04-05, TC_UT_RES_02 | TC_IT_03 | TC_E2E_03, TC_E2E_04 | D03 |
| REQ-04 | Tatkal only for tomorrow | TC_EP_QUOTA_01-04, TC_UT_BOOK_10, TC_UT_BOOK_16 | - | TC_E2E_05 | - |
| REQ-05 | Correct, sorted, stable results; departed trains not bookable | TC_UT_SRCH_01-08, TC_UT_JRNY_01-04, TC_UT_DATA_01-03, TC_BVA_DEP_01-04, TC_UT_BOOK_11, TC_UT_BOOK_15, TC_BVA_BOOK_04 | TC_IT_05, TC_IT_06, TC_IT_17 | TC_E2E_06, TC_E2E_07, TC_E2E_08 | D09, D10, DEF-V2-02 |
| REQ-06 | Login required to book, return after login | - | TC_IT_08, TC_IT_13, TC_IT_14, TC_IT_15 | TC_E2E_09, TC_E2E_12 | - |
| REQ-07 | 1-6 passengers, one older than 11 | TC_EP_CNT_01-04, TC_BVA_PAX_01-06, TC_UT_BOOK_12-14, TC_BVA_BOOK_01-03 | - | TC_E2E_14 | D05 |
| REQ-08 | Name / age / gender rules | TC_EP_NAME_01-09, TC_EP_AGE_01-07, TC_EP_GEN_01-06, TC_BVA_AGE_01-06, TC_BVA_NAME_01-06, TC_UT_MUT_01, TC_UT_MUT_13 | - | TC_E2E_13 | - |
| REQ-09 | Mobile and e-mail | TC_EP_MOB_01-05, TC_EP_MAIL_01-06, TC_UT_MUT_01-02 | - | TC_E2E_13 | - |
| REQ-10 | Fare, concessions, Tatkal, GST, fee | TC_DT_CON_01-13, TC_BVA_CON_01-08, TC_BVA_MINFARE_01-03, TC_BVA_TQ_01-06, TC_UT_FARE_01-12, TC_EP_DIST_01-03, TC_UT_MUT_06, TC_UT_MUT_09 | TC_IT_05 | TC_E2E_01, TC_E2E_15 | - |
| REQ-11 | CNF / RAC / WL / REGRET, berths | TC_DT_ALLOC_01-06, TC_BVA_ALLOC_01-03, TC_BVA_BERTH_01-03, TC_UT_AVL_01-05, TC_UT_SLOT_01-02, TC_UT_BOOK_01-04, TC_UT_BOOK_17, TC_UT_MUT_10-12 | TC_IT_05 | TC_E2E_15, TC_E2E_17, TC_E2E_18 | D11, DEF-V2-03 |
| REQ-12 | Payment validation, PNR issued | TC_EP_UPI_01-04, TC_EP_CARD_01-05, TC_EP_EXP_01-06, TC_EP_CVV_01-04, TC_BVA_EXP_01-04, TC_BVA_CARD_01, TC_UT_MUT_03, TC_UT_PNR_01-02, TC_BVA_PNR_01-04, TC_EP_PNRSEQ_01, TC_UT_STORE_06 | - | TC_E2E_15, TC_E2E_16 | - |
| REQ-13 | PNR enquiry | TC_EP_PNR_01-06, TC_UT_STORE_08 | TC_IT_09, TC_IT_10, TC_IT_11 | TC_E2E_19 | D06, D07, D08 |
| REQ-14 | Cancellation refund rules | TC_DT_REF_01-11, TC_BVA_REF_01-10, TC_UT_REF_01, TC_UT_CAN_01-05, TC_UT_MUT_07, TC_UT_MUT_18 | - | TC_E2E_20, TC_E2E_21 | - |
| REQ-15 | FIFO promotion RAC→CNF, WL→RAC | TC_ST_TKT_01-16, TC_UT_CAN_01-03, TC_UT_CAN_06, TC_UT_MUT_14-17 | - | TC_E2E_20 | - |
| REQ-16 | Chart preparation | TC_UT_CHART_01-03, TC_BVA_CHART_01, TC_UT_MUT_19-20, TC_ST_TKT_06-08 | - | - (needs a 4-hour wait; covered at unit level with an injected clock) | - |
| REQ-17 | Registration rules | TC_EP_USER_01-05, TC_EP_PWD_01-06, TC_BVA_PWD_01-06, TC_BVA_USER_01-04, TC_UT_STORE_01-02 | - | TC_E2E_11 | D14 |
| REQ-18 | Login lock-out | TC_ST_LOGIN_01-11, TC_UT_STORE_03-05 | TC_IT_12 | TC_E2E_10 | D14 |
| REQ-19 | My Bookings, e-ticket, PDF | TC_UT_STORE_07 | TC_IT_15 | TC_E2E_12, TC_E2E_22, TC_E2E_24 | D12 |
| REQ-20 | Valid links, 404, title | - | TC_IT_16, TC_IT_18 | TC_E2E_23, TC_E2E_25 | D13, D15, D17, DEF-V2-04 |
| REQ-21 | No horizontal scroll, mobile menu | - | - | TC_E2E_26 | D16 |
| REQ-22 | Toasts for every action, demo control room | - | - | TC_E2E_27, TC_E2E_28 | - |

**Coverage of requirements:** 22 / 22 requirements have at least one passing test case; 21 / 22
are verified at system level in the browser. REQ-16 (chart preparation) is time-triggered, so it is
verified with an injected clock at unit level.

## 2. Defect → regression test (fix verification)

| Defect | Summary | Verified fixed by |
|---|---|---|
| D01 | Home "Search Trains" does nothing | TC_IT_02, TC_E2E_01 |
| D02 | Same source/destination accepted | TC_EP_STN_04, TC_IT_01, TC_E2E_02 |
| D03 | Past / too-far dates selectable | TC_BVA_DATE_01-06, TC_IT_03, TC_E2E_03, TC_E2E_04 |
| D04 | "Get Tickets" on /book does nothing | TC_E2E_23 (/book leads to the working search), TC_E2E_01 |
| D05 | Adult counter has no upper limit | TC_BVA_PAX_06, TC_E2E_14 |
| D06 | Unknown PNR shows a fake booking | TC_IT_10, TC_E2E_19 |
| D07 | Same PNR returns different trains | TC_IT_11, TC_E2E_19 |
| D08 | "CNF" passenger shown with RAC/WL colour | TC_E2E_19 (badge `data-status` = CNF, berths H1/1, H1/2) |
| D09 | Train filter loses the listed train | TC_IT_06, TC_E2E_07 |
| D10 | Schedule changes on reload | TC_UT_SRCH_07, TC_E2E_07 |
| D11 | No way to book from the results | TC_IT_05, TC_E2E_15 |
| D12 | My Bookings is a blank page | TC_IT_15, TC_E2E_24 |
| D13 | Unknown route shows a blank page | TC_IT_16, TC_E2E_23 |
| D14 | No login / registration | TC_E2E_09, TC_E2E_10, TC_E2E_11 |
| D15 | Title "Vite + React + TS" | TC_E2E_25 |
| D16 | Horizontal overflow (1-3 px) | TC_E2E_26 |
| D17 | Footer policy links open blank pages | TC_E2E_23 |
| D18 | TypeScript / ESLint errors | `npm run typecheck`, `npm run lint` (clean); `npm run build` now type-checks first |
| D19 | Dead UI controls (Subscribe, service links) | Footer redesigned; covered by TC_E2E_23 / TC_E2E_26 |
| DEF-V2-01 | Plain-text passwords in localStorage | Deferred - needs a backend (out of scope) |
| DEF-V2-02 | Departed trains bookable | TC_BVA_DEP_01-04, TC_IT_17, TC_E2E_08 |
| DEF-V2-03 | Oversized group sent to payment | TC_E2E_18 |
| DEF-V2-04 | "All Trains" highlighted on search results | TC_IT_18 |
