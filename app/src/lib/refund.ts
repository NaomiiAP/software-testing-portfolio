/**
 * Cancellation refund rules (hours measured before scheduled departure from
 * the boarding station). The convenience fee is never refunded, so `fare`
 * here is the booking total minus the convenience fee.
 *
 * Confirmed (CNF) tickets
 *   Tatkal quota             -> no refund
 *   more than 48 h           -> deduct flat class charge per passenger
 *   more than 12 h, <= 48 h  -> deduct max(25% of fare, flat charge)
 *   more than 4 h,  <= 12 h  -> deduct max(50% of fare, flat charge)
 *   4 h or less (chart done) -> no refund
 * RAC / Waitlisted (WL) tickets
 *   at least 30 min          -> deduct clerkage (₹60) per passenger
 *   less than 30 min         -> no refund
 * Any ticket after departure -> cannot be cancelled online
 */
import {
  CLASS_INFO,
  CLERKAGE_PER_PASSENGER,
  RAC_WL_CANCEL_MIN_HOURS,
  REFUND_25_ABOVE_HOURS,
  REFUND_50_ABOVE_HOURS,
  REFUND_FLAT_ABOVE_HOURS,
  type Quota,
  type TravelClass,
} from './constants';

export type RefundRule =
  | 'FLAT'
  | 'PCT_25'
  | 'PCT_50'
  | 'NO_REFUND_CHART'
  | 'NO_REFUND_TATKAL'
  | 'CLERKAGE'
  | 'NO_REFUND_LATE';

export const REFUND_RULE_TEXT: Record<RefundRule, string> = {
  FLAT: 'More than 48 hours before departure - flat cancellation charge',
  PCT_25: '12 to 48 hours before departure - 25% of fare deducted',
  PCT_50: '4 to 12 hours before departure - 50% of fare deducted',
  NO_REFUND_CHART: 'Chart prepared (4 hours or less before departure) - no refund',
  NO_REFUND_TATKAL: 'Confirmed Tatkal tickets are non-refundable',
  CLERKAGE: 'RAC / Waitlisted ticket - clerkage charge deducted',
  NO_REFUND_LATE: 'RAC / Waitlisted ticket cancelled within 30 minutes of departure - no refund',
};

export interface RefundInput {
  status: 'CNF' | 'RAC' | 'WL';
  travelClass: TravelClass;
  quota: Quota;
  /** Refundable amount = booking total - convenience fee. */
  fare: number;
  /** Passengers who paid (children below 5 travel free and are excluded). */
  payingPassengers: number;
}

export interface RefundResult {
  refund: number;
  deduction: number;
  rule: RefundRule;
}

export class CancellationNotAllowedError extends Error {
  constructor() {
    super('The train has already departed - this ticket can no longer be cancelled');
    this.name = 'CancellationNotAllowedError';
  }
}

function result(fare: number, deduction: number, rule: RefundRule): RefundResult {
  const capped = Math.min(fare, Math.max(0, deduction));
  return { refund: fare - capped, deduction: capped, rule };
}

export function calculateRefund(input: RefundInput, hoursBeforeDeparture: number): RefundResult {
  if (hoursBeforeDeparture <= 0) throw new CancellationNotAllowedError();
  const { fare, payingPassengers } = input;

  if (input.status !== 'CNF') {
    if (hoursBeforeDeparture >= RAC_WL_CANCEL_MIN_HOURS) {
      return result(fare, CLERKAGE_PER_PASSENGER * payingPassengers, 'CLERKAGE');
    }
    return result(fare, fare, 'NO_REFUND_LATE');
  }

  if (input.quota === 'TQ') return result(fare, fare, 'NO_REFUND_TATKAL');

  const flat = CLASS_INFO[input.travelClass].cancellationCharge * payingPassengers;
  if (hoursBeforeDeparture > REFUND_FLAT_ABOVE_HOURS) return result(fare, flat, 'FLAT');
  if (hoursBeforeDeparture > REFUND_25_ABOVE_HOURS) {
    return result(fare, Math.max(Math.round(fare * 0.25), flat), 'PCT_25');
  }
  if (hoursBeforeDeparture > REFUND_50_ABOVE_HOURS) {
    return result(fare, Math.max(Math.round(fare * 0.5), flat), 'PCT_50');
  }
  return result(fare, fare, 'NO_REFUND_CHART');
}
