/**
 * Fare calculation.
 *  - Decision table for concessions: 02_Test_Case_Design/03_Decision_Table.md (Table 1)
 *  - BVA for concession ages, Tatkal clamp and minimum fare: 02_Boundary_Value_Analysis.md
 */
import { describe, expect, it } from 'vitest';
import type { Gender, Quota } from '@app/lib/constants';
import {
  baseFare,
  berthsNeeded,
  calculateFare,
  farePerPassenger,
  formatINR,
  getConcession,
  tatkalCharge,
} from '@app/lib/fare';

describe('Concession decision table (age band x gender x quota)', () => {
  it.each([
    { id: 'TC_DT_CON_01', rule: 'R1', age: 3, gender: 'M', quota: 'GN', expected: 'CHILD_FREE' },
    { id: 'TC_DT_CON_02', rule: 'R1', age: 3, gender: 'F', quota: 'TQ', expected: 'CHILD_FREE' },
    { id: 'TC_DT_CON_03', rule: 'R2', age: 8, gender: 'M', quota: 'GN', expected: 'CHILD_HALF' },
    { id: 'TC_DT_CON_04', rule: 'R3', age: 8, gender: 'F', quota: 'TQ', expected: 'NONE' },
    { id: 'TC_DT_CON_05', rule: 'R4', age: 30, gender: 'M', quota: 'GN', expected: 'NONE' },
    { id: 'TC_DT_CON_06', rule: 'R5', age: 58, gender: 'F', quota: 'GN', expected: 'SENIOR_FEMALE' },
    { id: 'TC_DT_CON_07', rule: 'R6', age: 58, gender: 'M', quota: 'GN', expected: 'NONE' },
    { id: 'TC_DT_CON_08', rule: 'R5', age: 65, gender: 'F', quota: 'GN', expected: 'SENIOR_FEMALE' },
    { id: 'TC_DT_CON_09', rule: 'R7', age: 65, gender: 'M', quota: 'GN', expected: 'SENIOR_MALE' },
    { id: 'TC_DT_CON_10', rule: 'R7', age: 65, gender: 'T', quota: 'GN', expected: 'SENIOR_MALE' },
    { id: 'TC_DT_CON_11', rule: 'R8', age: 65, gender: 'F', quota: 'TQ', expected: 'NONE' },
    { id: 'TC_DT_CON_12', rule: 'R8', age: 65, gender: 'M', quota: 'TQ', expected: 'NONE' },
    { id: 'TC_DT_CON_13', rule: 'R4', age: 30, gender: 'F', quota: 'TQ', expected: 'NONE' },
  ])('$id ($rule): age $age, $gender, $quota -> $expected', ({ age, gender, quota, expected }) => {
    expect(getConcession(age, gender as Gender, quota as Quota).type).toBe(expected);
  });
});

describe('Concession age boundaries (BVA)', () => {
  it.each([
    { id: 'TC_BVA_CON_01', age: 4, gender: 'M', expected: 'CHILD_FREE' },
    { id: 'TC_BVA_CON_02', age: 5, gender: 'M', expected: 'CHILD_HALF' },
    { id: 'TC_BVA_CON_03', age: 11, gender: 'M', expected: 'CHILD_HALF' },
    { id: 'TC_BVA_CON_04', age: 12, gender: 'M', expected: 'NONE' },
    { id: 'TC_BVA_CON_05', age: 57, gender: 'F', expected: 'NONE' },
    { id: 'TC_BVA_CON_06', age: 58, gender: 'F', expected: 'SENIOR_FEMALE' },
    { id: 'TC_BVA_CON_07', age: 59, gender: 'M', expected: 'NONE' },
    { id: 'TC_BVA_CON_08', age: 60, gender: 'M', expected: 'SENIOR_MALE' },
  ])('$id: age $age ($gender, General) -> $expected', ({ age, gender, expected }) => {
    expect(getConcession(age, gender as Gender, 'GN').type).toBe(expected);
  });
});

describe('Base fare', () => {
  it('TC_UT_FARE_01: distance x class rate, rounded (1384 km)', () => {
    expect(baseFare(1384, '1A')).toBe(4982); // 1384 x 3.6 = 4982.4
    expect(baseFare(1384, '2A')).toBe(3045); // 1384 x 2.2 = 3044.8
    expect(baseFare(1384, '3A')).toBe(2076); // 1384 x 1.5
    expect(baseFare(1384, 'SL')).toBe(830); // 1384 x 0.6 = 830.4
  });

  it.each([
    { id: 'TC_BVA_MINFARE_01', km: 199, expected: 120, note: '119.4 -> raised to minimum 120' },
    { id: 'TC_BVA_MINFARE_02', km: 200, expected: 120, note: 'exactly the minimum' },
    { id: 'TC_BVA_MINFARE_03', km: 201, expected: 121, note: '120.6 -> 121 above minimum' },
  ])('$id: SL $km km -> ₹$expected ($note)', ({ km, expected }) => {
    expect(baseFare(km, 'SL')).toBe(expected);
  });

  it.each([
    { id: 'TC_EP_DIST_01', km: 0 },
    { id: 'TC_EP_DIST_02', km: -10 },
    { id: 'TC_EP_DIST_03', km: Number.NaN },
  ])('$id: distance $km is rejected', ({ km }) => {
    expect(() => baseFare(km, 'SL')).toThrow('Distance must be greater than zero');
  });
});

describe('Tatkal premium clamp, SL min ₹100 / max ₹200 (BVA)', () => {
  it.each([
    { id: 'TC_BVA_TQ_01', base: 330, expected: 100, note: '30% = 99 -> raised to min' },
    { id: 'TC_BVA_TQ_02', base: 334, expected: 100, note: '30% = 100.2 -> 100 (at min)' },
    { id: 'TC_BVA_TQ_03', base: 337, expected: 101, note: '30% = 101.1 -> 101 (just above min)' },
    { id: 'TC_BVA_TQ_04', base: 663, expected: 199, note: '30% = 198.9 -> 199 (just below max)' },
    { id: 'TC_BVA_TQ_05', base: 667, expected: 200, note: '30% = 200.1 -> 200 (at max)' },
    { id: 'TC_BVA_TQ_06', base: 670, expected: 200, note: '30% = 201 -> capped at max' },
  ])('$id: base ₹$base -> ₹$expected ($note)', ({ base, expected }) => {
    expect(tatkalCharge(base, 'SL')).toBe(expected);
  });
});

describe('Per-passenger fare', () => {
  it('TC_UT_FARE_02: 1A General adult = base + 5% GST', () => {
    const line = farePerPassenger(4982, '1A', 'GN', { age: 30, gender: 'M' });
    expect(line).toMatchObject({ baseFare: 4982, concessionAmount: 0, tatkalCharge: 0, gst: 249, total: 5231, needsBerth: true });
  });

  it('TC_UT_FARE_03: Sleeper is non-AC so no GST is charged', () => {
    expect(farePerPassenger(830, 'SL', 'GN', { age: 30, gender: 'M' })).toMatchObject({ gst: 0, total: 830 });
  });

  it('TC_UT_FARE_04: Sleeper Tatkal adds the capped premium', () => {
    expect(farePerPassenger(830, 'SL', 'TQ', { age: 30, gender: 'M' })).toMatchObject({ tatkalCharge: 200, total: 1030 });
  });

  it('TC_UT_FARE_05: 3A Tatkal = base + premium(capped 400) + GST on both', () => {
    expect(farePerPassenger(2076, '3A', 'TQ', { age: 30, gender: 'F' })).toMatchObject({ tatkalCharge: 400, gst: 124, total: 2600 });
  });

  it('TC_UT_FARE_06: senior male 40% concession, GST on the reduced fare', () => {
    expect(farePerPassenger(2076, '3A', 'GN', { age: 65, gender: 'M' })).toMatchObject({ concessionAmount: 830, gst: 62, total: 1308 });
  });

  it('TC_UT_FARE_07: child 5-11 pays half', () => {
    expect(farePerPassenger(830, 'SL', 'GN', { age: 8, gender: 'F' })).toMatchObject({ concessionAmount: 415, total: 415 });
  });

  it('TC_UT_FARE_08: child below 5 travels free without a berth', () => {
    expect(farePerPassenger(4982, '1A', 'TQ', { age: 3, gender: 'M' })).toMatchObject({ total: 0, needsBerth: false, tatkalCharge: 0 });
  });
});

describe('Booking fare', () => {
  it('TC_UT_FARE_09: family booking total = passenger totals + ₹20 convenience fee', () => {
    const fare = calculateFare(1384, '1A', 'GN', [
      { age: 62, gender: 'F' },
      { age: 4, gender: 'M' },
      { age: 35, gender: 'M' },
    ]);
    expect(fare.lines.map((l) => l.total)).toEqual([2616, 0, 5231]);
    expect(fare.subtotal).toBe(7847);
    expect(fare.convenienceFee).toBe(20);
    expect(fare.total).toBe(7867);
  });

  it('TC_UT_FARE_10: a booking with no passengers is rejected', () => {
    expect(() => calculateFare(100, 'SL', 'GN', [])).toThrow('At least one passenger is required');
  });

  it('TC_UT_FARE_11: children below 5 do not need a berth', () => {
    expect(berthsNeeded([{ age: 4, gender: 'M' }, { age: 5, gender: 'F' }, { age: 30, gender: 'M' }])).toBe(2);
  });

  it('TC_UT_FARE_12: amounts are shown in Indian rupee format', () => {
    expect(formatINR(7867)).toBe('₹7,867');
    expect(formatINR(123456)).toBe('₹1,23,456');
  });
});
