/**
 * Fare calculation.
 *
 * Per passenger:
 *   base        = max(round(distance x rate/km), class minimum fare)
 *   concession  = round(base x concession rate)          (see getConcession)
 *   tatkal      = clamp(round(base x 30%), class min, class max)   Tatkal quota only
 *   gst         = round((base - concession + tatkal) x 5%)          AC classes only
 *   total       = base - concession + tatkal + gst
 * Booking total = sum of passenger totals + convenience fee (once per booking).
 *
 * The concession rules are the decision table in
 * 02_Test_Case_Design/03_Decision_Table.md.
 */
import {
  CHILD_CONCESSION,
  CHILD_FREE_BELOW_AGE,
  CHILD_MAX_AGE,
  CLASS_INFO,
  CONVENIENCE_FEE,
  GST_RATE,
  SENIOR_FEMALE_AGE,
  SENIOR_FEMALE_CONCESSION,
  SENIOR_MALE_AGE,
  SENIOR_MALE_CONCESSION,
  TATKAL_RATE,
  type Gender,
  type Quota,
  type TravelClass,
} from './constants';

export type ConcessionType = 'NONE' | 'CHILD_FREE' | 'CHILD_HALF' | 'SENIOR_FEMALE' | 'SENIOR_MALE';

export interface Concession {
  type: ConcessionType;
  /** Fraction of the base fare waived (0 … 1). */
  rate: number;
  label: string;
}

export const CONCESSIONS: Record<ConcessionType, Concession> = {
  NONE: { type: 'NONE', rate: 0, label: 'No concession' },
  CHILD_FREE: { type: 'CHILD_FREE', rate: 1, label: 'Child below 5 - free, no berth' },
  CHILD_HALF: { type: 'CHILD_HALF', rate: CHILD_CONCESSION, label: 'Child 5-11 - 50%' },
  SENIOR_FEMALE: { type: 'SENIOR_FEMALE', rate: SENIOR_FEMALE_CONCESSION, label: 'Senior citizen (F 58+) - 50%' },
  SENIOR_MALE: { type: 'SENIOR_MALE', rate: SENIOR_MALE_CONCESSION, label: 'Senior citizen (M/T 60+) - 40%' },
};

/** Decision table: age band x gender x quota -> concession. */
export function getConcession(age: number, gender: Gender, quota: Quota): Concession {
  if (age < CHILD_FREE_BELOW_AGE) return CONCESSIONS.CHILD_FREE;
  if (quota === 'TQ') return CONCESSIONS.NONE;
  if (age <= CHILD_MAX_AGE) return CONCESSIONS.CHILD_HALF;
  if (gender === 'F' && age >= SENIOR_FEMALE_AGE) return CONCESSIONS.SENIOR_FEMALE;
  if (gender !== 'F' && age >= SENIOR_MALE_AGE) return CONCESSIONS.SENIOR_MALE;
  return CONCESSIONS.NONE;
}

export function baseFare(distanceKm: number, travelClass: TravelClass): number {
  if (!(distanceKm > 0)) throw new Error('Distance must be greater than zero');
  const info = CLASS_INFO[travelClass];
  return Math.max(Math.round(distanceKm * info.ratePerKm), info.minFare);
}

export function tatkalCharge(base: number, travelClass: TravelClass): number {
  const info = CLASS_INFO[travelClass];
  const raw = Math.round(base * TATKAL_RATE);
  return Math.min(Math.max(raw, info.tatkalMin), info.tatkalMax);
}

export interface FarePassenger {
  age: number;
  gender: Gender;
}

export interface FareLine {
  concession: Concession;
  baseFare: number;
  concessionAmount: number;
  tatkalCharge: number;
  gst: number;
  total: number;
  /** False for children below 5 (they share a berth). */
  needsBerth: boolean;
}

export interface FareBreakdown {
  lines: FareLine[];
  subtotal: number;
  convenienceFee: number;
  total: number;
}

export function farePerPassenger(
  base: number,
  travelClass: TravelClass,
  quota: Quota,
  passenger: FarePassenger,
): FareLine {
  const concession = getConcession(passenger.age, passenger.gender, quota);
  if (concession.type === 'CHILD_FREE') {
    return { concession, baseFare: 0, concessionAmount: 0, tatkalCharge: 0, gst: 0, total: 0, needsBerth: false };
  }
  const concessionAmount = Math.round(base * concession.rate);
  const tatkal = quota === 'TQ' ? tatkalCharge(base, travelClass) : 0;
  const taxable = base - concessionAmount + tatkal;
  const gst = CLASS_INFO[travelClass].ac ? Math.round(taxable * GST_RATE) : 0;
  return {
    concession,
    baseFare: base,
    concessionAmount,
    tatkalCharge: tatkal,
    gst,
    total: taxable + gst,
    needsBerth: true,
  };
}

export function calculateFare(
  distanceKm: number,
  travelClass: TravelClass,
  quota: Quota,
  passengers: FarePassenger[],
): FareBreakdown {
  if (passengers.length === 0) throw new Error('At least one passenger is required');
  const base = baseFare(distanceKm, travelClass);
  const lines = passengers.map((p) => farePerPassenger(base, travelClass, quota, p));
  const subtotal = lines.reduce((sum, l) => sum + l.total, 0);
  return { lines, subtotal, convenienceFee: CONVENIENCE_FEE, total: subtotal + CONVENIENCE_FEE };
}

/** Number of berths a group needs (children below 5 do not get one). */
export function berthsNeeded(passengers: FarePassenger[]): number {
  return passengers.filter((p) => p.age >= CHILD_FREE_BELOW_AGE).length;
}

export const formatINR = (amount: number) =>
  `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
