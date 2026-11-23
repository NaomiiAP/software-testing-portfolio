# Static Testing

Static testing checks the product **without running it**: the compiler, the linter and a code
review. It was done on both builds.

## 1. Tool results

| Check | Command | v1.0 (original) | v2.0 (release) |
|---|---|---|---|
| Type check | `tsc --noEmit -p tsconfig.app.json` | **2 errors** (TS6133 unused `React` in `App.tsx`, unused `ArrowRightLeft` in `Home.tsx`) | 0 errors |
| Lint | `eslint .` | **1 error** (`ArrowRightLeft` defined but never used) | 0 errors, 0 warnings |
| Build | `npm run build` | succeeds, but **without** type checking (`vite build` only) - errors above went unnoticed | `tsc` + `vite build`; fails if types are wrong |
| Bundle size | `vite build` | - | main chunk 380 kB after lazy-loading the PDF library (was 770 kB) |

Logged as defect **D18**.

## 2. Code review findings (v1.0)

| Finding | File | Effect | Logged as |
|---|---|---|---|
| `handleSearch` only calls `preventDefault()` - "Handle search logic" placeholder | `components/Home.tsx` | Search does nothing | D01 |
| "Get Tickets" button has no handler and no form | `components/TrainSearch.tsx` | Button does nothing | D04 |
| `adults + 1` with no maximum, default 3 adults | `components/TrainSearch.tsx` | Unlimited passengers | D05 |
| `getPNRStatus()` invents a booking with `Math.random()` | `data/mockData.ts` | Fake / inconsistent PNR data | D06, D07 |
| Badge colour taken from overall status, text hard-coded `CNF` | `components/PNRStatus.tsx` | Contradictory status | D08 |
| `generateTrains()` called in the render body | `components/TrainList.tsx` | New random trains on every keystroke | D09, D10 |
| `Modal.tsx` never imported | `components/Modal.tsx` | Dead code, no booking flow | D11, D19 |
| Links to `/bookings`, `/about`, `/privacy`, `/terms`, `/refund` with no routes | `Header.tsx`, `Footer.tsx`, `App.tsx` | Blank pages | D12, D13, D17 |
| Subscribe button and "Our Services" items without actions | `components/Footer.tsx` | Dead UI | D19 |
| `useEffect` interval depends on `currentIndex` but calls `nextSlide` declared later (stale-closure risk) | `components/ImageSlider.tsx` | Works today, fragile | not logged (kept unchanged; decorative) |
| `stations.ts` (state → station lists) never used | `data/stations.ts` | Dead data | replaced in v2.0 |

## 3. Code review findings (v2.0)

| Finding | Effect | Action |
|---|---|---|
| Passwords stored in plain text in `localStorage` | Security weakness | **DEF-V2-01**, deferred (needs backend) |
| Departure check only at payment (`createBooking`) | Departed trains bookable | Confirmed by TC_E2E_08 → **DEF-V2-02**, fixed |
| Capacity check only at payment | User sent to payment for impossible booking | Confirmed by TC_E2E_18 → **DEF-V2-03**, fixed |
| `?next=` redirect after login could point to another site (`//evil.example`) | Open-redirect risk | Prevented in `Login.tsx` (`safeNext`), test TC_IT_14 |
| Redundant conditions in `dates.ts` and `reservation.ts` | Untestable code paths | Found by mutation testing, simplified (commit "Mutation testing with StrykerJS…") |

## 4. Review checklist used

* Does every button / link have a working target?
* Is all business logic outside React components (pure functions → unit-testable)?
* Is randomness or the system clock used directly in logic? (must be injected for repeatable tests)
* Are validation messages defined once and reused?
* Are external inputs (URL parameters, storage contents) validated or safely defaulted?
* Do comments, README and behaviour agree?
