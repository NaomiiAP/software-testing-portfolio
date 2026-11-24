/**
 * Cancellation refund rules.
 *  - Decision table: 02_Test_Case_Design/03_Decision_Table.md (Table 2)
 *  - BVA on the 48 h / 12 h / 4 h / 30 min / departure boundaries
 */
import { describe, expect, it } from 'vitest';
import { CancellationNotAllowedError, calculateRefund, type RefundInput } from '@app/lib/refund';

// 3A ticket, 2 paying passengers, refundable fare ₹2000 -> flat charge = 2 x ₹180 = ₹360
const CNF: RefundInput = { status: 'CNF', travelClass: '3A', quota: 'GN', fare: 2000, payingPassengers: 2 };

describe('Refund decision table (status x quota x time before departure)', () => {
  it.each([
    { id: 'TC_DT_REF_01', input: CNF, hours: 72, rule: 'FLAT', refund: 1640, deduction: 360 },
    { id: 'TC_DT_REF_02', input: CNF, hours: 24, rule: 'PCT_25', refund: 1500, deduction: 500 },
    { id: 'TC_DT_REF_03', input: CNF, hours: 8, rule: 'PCT_50', refund: 1000, deduction: 1000 },
    { id: 'TC_DT_REF_04', input: CNF, hours: 2, rule: 'NO_REFUND_CHART', refund: 0, deduction: 2000 },
    { id: 'TC_DT_REF_05', input: { ...CNF, quota: 'TQ' }, hours: 72, rule: 'NO_REFUND_TATKAL', refund: 0, deduction: 2000 },
    { id: 'TC_DT_REF_06', input: { ...CNF, status: 'RAC' }, hours: 24, rule: 'CLERKAGE', refund: 1880, deduction: 120 },
    { id: 'TC_DT_REF_07', input: { ...CNF, status: 'WL', quota: 'TQ' }, hours: 2, rule: 'CLERKAGE', refund: 1880, deduction: 120 },
    { id: 'TC_DT_REF_08', input: { ...CNF, status: 'RAC' }, hours: 0.25, rule: 'NO_REFUND_LATE', refund: 0, deduction: 2000 },
    { id: 'TC_DT_REF_09', input: { ...CNF, fare: 1000 }, hours: 24, rule: 'PCT_25', refund: 640, deduction: 360 },
  ] as const)('$id: $input.status/$input.quota, $hours h -> $rule, refund ₹$refund', ({ input, hours, rule, refund, deduction }) => {
    expect(calculateRefund(input as RefundInput, hours)).toEqual({ rule, refund, deduction });
  });

  it.each([
    { id: 'TC_DT_REF_10', status: 'CNF', hours: 0 },
    { id: 'TC_DT_REF_11', status: 'WL', hours: -1 },
  ] as const)('$id: $status ticket after departure ($hours h) cannot be cancelled', ({ status, hours }) => {
    expect(() => calculateRefund({ ...CNF, status }, hours)).toThrow(CancellationNotAllowedError);
  });

  it('TC_UT_REF_01: deduction never exceeds the fare (flat charge larger than a tiny fare)', () => {
    expect(calculateRefund({ ...CNF, fare: 100 }, 72)).toEqual({ rule: 'FLAT', refund: 0, deduction: 100 });
  });
});

describe('Refund time boundaries (BVA)', () => {
  it.each([
    { id: 'TC_BVA_REF_01', hours: 48.01, rule: 'FLAT' },
    { id: 'TC_BVA_REF_02', hours: 48, rule: 'PCT_25' },
    { id: 'TC_BVA_REF_03', hours: 12.01, rule: 'PCT_25' },
    { id: 'TC_BVA_REF_04', hours: 12, rule: 'PCT_50' },
    { id: 'TC_BVA_REF_05', hours: 4.01, rule: 'PCT_50' },
    { id: 'TC_BVA_REF_06', hours: 4, rule: 'NO_REFUND_CHART' },
    { id: 'TC_BVA_REF_07', hours: 0.01, rule: 'NO_REFUND_CHART' },
  ])('$id: confirmed ticket cancelled $hours h before departure -> $rule', ({ hours, rule }) => {
    expect(calculateRefund(CNF, hours).rule).toBe(rule);
  });

  it('TC_BVA_REF_08: exactly at departure (0 h) cancellation is refused', () => {
    expect(() => calculateRefund(CNF, 0)).toThrow('already departed');
  });

  it.each([
    { id: 'TC_BVA_REF_09', hours: 0.5, rule: 'CLERKAGE' },
    { id: 'TC_BVA_REF_10', hours: 0.49, rule: 'NO_REFUND_LATE' },
  ])('$id: RAC ticket cancelled $hours h before departure -> $rule', ({ hours, rule }) => {
    expect(calculateRefund({ ...CNF, status: 'RAC' }, hours).rule).toBe(rule);
  });
});
