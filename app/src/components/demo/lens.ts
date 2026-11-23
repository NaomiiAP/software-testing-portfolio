/**
 * "Testing lens": maps what the user just saw to the test-design technique and
 * the test-case ids that verify it (see 02_Test_Case_Design). Shown as a chip in
 * toasts while presenting the application.
 */
import type { ConcessionType } from '../../lib/fare';
import type { RefundRule } from '../../lib/refund';
import { BOOKING_MESSAGES, type AllocationStatus } from '../../lib/reservation';
import { MESSAGES } from '../../lib/validation';

const BY_MESSAGE: Record<string, string> = {
  [MESSAGES.fromRequired]: 'EP · invalid: source missing · TC_EP_STN_02',
  [MESSAGES.toRequired]: 'EP · invalid: destination missing · TC_EP_STN_03',
  [MESSAGES.sameStations]: 'EP · invalid: same station · TC_EP_STN_04',
  [MESSAGES.dateRequired]: 'EP · invalid: empty date · TC_EP_DATE_02',
  [MESSAGES.dateInvalid]: 'EP · invalid: impossible date · TC_EP_DATE_03',
  [MESSAGES.datePast]: 'BVA · today − 1 (min − 1) · TC_BVA_DATE_01',
  [MESSAGES.dateTooFar]: 'BVA · today + 121 (max + 1) · TC_BVA_DATE_06',
  [MESSAGES.tatkalWindow]: 'Decision rule · Tatkal only for tomorrow · TC_EP_QUOTA_03/04',
  [MESSAGES.pnrRequired]: 'EP · empty PNR · TC_EP_PNR_03',
  [MESSAGES.pnrDigits]: 'EP · non-digit PNR · TC_EP_PNR_04',
  [MESSAGES.pnrLength]: 'EP · wrong length · TC_EP_PNR_05/06',
  [BOOKING_MESSAGES.pnrNotFound]: 'EP · well-formed but never booked · TC_IT_10',
  [MESSAGES.upi]: 'EP · invalid UPI ID · TC_EP_UPI_02-04',
  [MESSAGES.cardNumber]: 'EP · card length / Luhn checksum · TC_EP_CARD_03-05',
  [MESSAGES.cardExpiry]: 'EP + BVA · card expiry · TC_EP_EXP_03-06',
  [MESSAGES.cvv]: 'EP · CVV · TC_EP_CVV_02-04',
  [BOOKING_MESSAGES.regret]: 'Decision table · allocation R4 → REGRET · TC_DT_ALLOC_04/05',
  [BOOKING_MESSAGES.adultRequired]: 'EP · nobody older than 11 · TC_UT_BOOK_14',
  [BOOKING_MESSAGES.departed]: 'BVA · departure minute reached · TC_BVA_DEP_02',
};

export const lensForMessage = (message: string): string | undefined => BY_MESSAGE[message];

export const LENS = {
  validSearch: 'EP · valid partition · TC_EP_STN_01 · TC_E2E_01',
  passengerErrors: 'EP + BVA · name / age / gender · TC_EP_NAME_* · TC_BVA_AGE_*',
  maxPassengers: 'BVA · 6 passengers = max · TC_BVA_PAX_05/06',
  pnrFound: 'EP · valid PNR · TC_EP_PNR_01 · TC_E2E_19',
  loginOk: 'State transition · S0 → LOGGED_IN · TC_ST_LOGIN_01',
  loginFail: (remaining: number) =>
    remaining === 2 ? 'State transition · S0 → S1 · TC_ST_LOGIN_02' : 'State transition · S1 → S2 · TC_ST_LOGIN_03',
  locked: 'State transition · S2 → LOCKED · TC_ST_LOGIN_04',
  stillLocked: 'State transition · LOCKED → LOCKED · TC_ST_LOGIN_06/07',
  promotion: 'State transition · RAC → CNF (T2), WL → RAC (T1) · TC_UT_CAN_01',
  register: 'EP · registration fields · TC_EP_USER_* · TC_EP_PWD_*',
};

export const ALLOCATION_LENS: Record<Exclude<AllocationStatus, 'REGRET'>, string> = {
  CNF: 'Decision table · allocation R1 → CNF · TC_DT_ALLOC_01',
  RAC: 'Decision table · allocation R2 → RAC · TC_DT_ALLOC_02',
  WL: 'Decision table · allocation R3 → WL · TC_DT_ALLOC_03',
};

export const REFUND_LENS: Record<RefundRule | 'WL_AUTO_CANCEL', string> = {
  FLAT: 'Decision table · refund R1 (> 48 h, flat) · TC_DT_REF_01',
  PCT_25: 'Decision table · refund R2 (12–48 h, 25%) · TC_DT_REF_02',
  PCT_50: 'Decision table · refund R3 (4–12 h, 50%) · TC_DT_REF_03',
  NO_REFUND_CHART: 'Decision table · refund R4 (≤ 4 h) · TC_DT_REF_04',
  NO_REFUND_TATKAL: 'Decision table · refund R5 (Tatkal CNF) · TC_DT_REF_05',
  CLERKAGE: 'Decision table · refund R6 (RAC/WL clerkage) · TC_DT_REF_06',
  NO_REFUND_LATE: 'Decision table · refund R7 (< 30 min) · TC_DT_REF_08',
  WL_AUTO_CANCEL: 'State transition · WL --CHART_PREPARED--> CAN · TC_UT_CHART_02',
};

/** Concession decision-table rule behind each concession (Table 1). */
export const CONCESSION_RULE: Record<ConcessionType, string> = {
  CHILD_FREE: 'DT R1',
  CHILD_HALF: 'DT R2',
  SENIOR_FEMALE: 'DT R5',
  SENIOR_MALE: 'DT R7',
  NONE: 'DT R3/R4/R6/R8',
};
