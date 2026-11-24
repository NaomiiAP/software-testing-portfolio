# 07 - Screenshots

All screenshots were captured **automatically by the Selenium tests** (headless Chrome, 1366 × 900
unless stated), so every image is evidence of a specific test step.

| Folder | Contents |
|---|---|
| [`baseline_v1/`](baseline_v1) | Final screen of each probe on the **original** app - evidence for defects D01-D17 (`test_V1_Dxx_….png`) |
| [`defects_v2/`](defects_v2) | Evidence for the defects found in v2.0 before they were fixed (DEF-V2-02, DEF-V2-03) |
| [`release_v2/`](release_v2) | Steps of the final passing E2E run on v2.0 (`TC_E2E_xx__<step>.png`) |

## Highlights

| What | Screenshot |
|---|---|
| v1.0: invented booking for PNR 0000000000; "CNF" in RAC colour; horizontal scrollbar | [D06](baseline_v1/test_V1_D06_unknown_pnr_reports_not_found.png) |
| v1.0: Search Trains does nothing | [D01](baseline_v1/test_V1_D01_home_search_shows_results.png) |
| v2.0 bug: 06:40 train bookable at 19:00 | [DEF-V2-02](defects_v2/DEF-V2-02_departed_train_bookable.png) |
| v2.0 bug: 3 adults for 2 berths sent to payment | [DEF-V2-03](defects_v2/DEF-V2-03_sent_to_payment.png) |
| Search results with availability and fares | [TC_E2E_01 results](release_v2/TC_E2E_01__results.png) |
| Past date rejected (BVA) | [TC_E2E_03](release_v2/TC_E2E_03__yesterday_rejected.png) |
| Login lock-out after 3 failures | [TC_E2E_10](release_v2/TC_E2E_10__locked.png) |
| Registration validation errors (EP) | [TC_E2E_11](release_v2/TC_E2E_11__validation_errors.png) |
| Passenger validation errors | [TC_E2E_13](release_v2/TC_E2E_13__errors.png) |
| Family booking - live fare with concessions | [TC_E2E_15 passengers](release_v2/TC_E2E_15__passengers.png) |
| E-ticket: Confirmed, berths H1/1, No berth, H1/2 | [TC_E2E_15 ticket](release_v2/TC_E2E_15__ticket.png) |
| Card rejected by Luhn check | [TC_E2E_16](release_v2/TC_E2E_16__card_rejected.png) |
| REGRET after CNF → RAC → WL | [TC_E2E_17](release_v2/TC_E2E_17__regret.png) |
| PNR enquiry | [TC_E2E_19 found](release_v2/TC_E2E_19__found.png) · [not found](release_v2/TC_E2E_19__not_found.png) |
| Refund preview before cancelling | [TC_E2E_20 preview](release_v2/TC_E2E_20__refund_preview.png) |
| Cancelled, refund ₹9,982, RAC promoted | [TC_E2E_20 cancelled](release_v2/TC_E2E_20__cancelled.png) |
| 404 page | [TC_E2E_23](release_v2/TC_E2E_23__404.png) |
| Mobile menu at 390 px | [TC_E2E_26](release_v2/TC_E2E_26__mobile_menu.png) |
| Demo control room | [TC_E2E_27 panel](release_v2/TC_E2E_27__panel.png) |
| Toast with testing-lens chip | [TC_E2E_27 toasts](release_v2/TC_E2E_27__toasts.png) |
| Seeded CNF / RAC / WL bookings | [TC_E2E_28](release_v2/TC_E2E_28__seeded.png) |
