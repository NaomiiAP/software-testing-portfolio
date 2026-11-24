/**
 * Tests added after mutation-testing run #1 (score 90.45%, 87 survived + 2 no-coverage).
 *
 * Every test below was written to kill specific surviving mutants - i.e. to close
 * a real gap in the suite - and names the mutant it targets. See
 * 06_Test_Reports/Test_Summary_Report.md, section "Mutation testing".
 */
import { describe, expect, it } from 'vitest';
import { isValidISODate, daysBetween } from '@app/lib/dates';
import { CONCESSIONS, formatINR } from '@app/lib/fare';
import { generatePNR } from '@app/lib/pnr';
import { CancellationNotAllowedError, REFUND_RULE_TEXT, calculateRefund } from '@app/lib/refund';
import {
  BookingError,
  availability,
  berthLabel,
  cancelBooking,
  createBooking,
  inventoryKeyFor,
  occupancy,
  prepareCharts,
  promoteWaiting,
  type Booking,
  type BookingDraft,
} from '@app/lib/reservation';
import { InvalidTransitionError, STATUS_LABEL, nextStatus } from '@app/lib/ticketState';
import {
  MESSAGES,
  validateAge,
  validateCardExpiry,
  validateCardNumber,
  validateEmail,
  validateMobile,
  validateUpiId,
} from '@app/lib/validation';

const NOW = new Date(2026, 0, 5, 10, 0).getTime();
const PAY = { method: 'UPI' as const, reference: 'UPI-TEST' };
const adult = (name: string, age = 40) => ({ name, age, gender: 'M' as const });
const draft = (over: Partial<BookingDraft> = {}): BookingDraft => ({
  username: 'demo', trainNumber: '12951', from: 'MMCT', to: 'NDLS', date: '2026-01-20',
  travelClass: '1A', quota: 'GN', passengers: [adult('Anil Kumar'), adult('Bina Kumar')],
  contact: { mobile: '9876543210', email: 'a@example.com' }, ...over,
});
function bookAll(drafts: BookingDraft[], now = NOW): Booking[] {
  let list: Booking[] = [];
  drafts.forEach((d, i) => { list = [...list, createBooking(list, d, PAY, `41000000${String(i + 10)}`, now + i * 60_000)]; });
  return list;
}
const labels = (b: Booking) => b.passengers.map((p) => berthLabel(b.status, b.travelClass, p.slot));

describe('Validation - inputs with surrounding spaces / extra characters', () => {
  it('TC_UT_MUT_01: age, mobile, email, UPI and expiry are trimmed (kills .trim() removal)', () => {
    expect(validateAge(' 35 ')).toBeNull();
    expect(validateMobile(' 9876543210 ')).toBeNull();
    expect(validateEmail(' asha@example.com ')).toBeNull();
    expect(validateUpiId(' asha@okbank ')).toBeNull();
    expect(validateCardExpiry(' 12/30 ', '2026-01-05')).toBeNull();
  });

  it('TC_UT_MUT_02: e-mail regex - multi-level domains valid, 1-letter TLD and trailing dot invalid', () => {
    expect(validateEmail('asha@mail.example.co.in')).toBeNull();
    expect(validateEmail('asha@example.c')).toBe(MESSAGES.email);
    expect(validateEmail('asha@example.com.')).toBe(MESSAGES.email);
    expect(validateEmail('asha@exa_mple.com')).toBe(MESSAGES.email);
  });

  it('TC_UT_MUT_03: UPI and expiry patterns are anchored at both ends (kills ^ / $ removal)', () => {
    expect(validateUpiId('#asha@okbank')).toBe(MESSAGES.upi);
    expect(validateCardExpiry('112/30', '2026-01-05')).toBe(MESSAGES.cardExpiry);
    expect(validateCardExpiry('12/301', '2026-01-05')).toBe(MESSAGES.cardExpiry);
  });

  it('TC_BVA_CARD_01: 17-digit and 12-digit numbers that pass Luhn are still rejected (length check)', () => {
    expect(validateCardNumber('04111111111111111')).toBe(MESSAGES.cardNumber);
    expect(validateCardNumber('000000000000')).toBe(MESSAGES.cardNumber);
  });

  it.each([
    { id: 'TC_BVA_EXP_01', expiry: '05/26', expected: MESSAGES.cardExpiry, note: 'same year, previous month' },
    { id: 'TC_BVA_EXP_02', expiry: '06/26', expected: null, note: 'same year, current month' },
    { id: 'TC_BVA_EXP_03', expiry: '07/26', expected: null, note: 'same year, next month' },
    { id: 'TC_BVA_EXP_04', expiry: '05/27', expected: null, note: 'next year, earlier month number' },
  ])('$id: expiry $expiry on 15 Jun 2026 ($note)', ({ expiry, expected }) => {
    expect(validateCardExpiry(expiry, '2026-06-15')).toBe(expected);
  });
});

describe('Dates', () => {
  it('TC_UT_MUT_04: ISO date pattern is anchored (extra characters rejected)', () => {
    expect(isValidISODate('x2026-01-05')).toBe(false);
    expect(isValidISODate('2026-01-05x')).toBe(false);
    expect(isValidISODate('2026-12-32')).toBe(false);
    expect(isValidISODate('2026-00-10')).toBe(false);
  });

  it('TC_UT_MUT_05: the error names the offending argument', () => {
    expect(() => daysBetween('bad1', '2026-01-01')).toThrow('Invalid date: bad1');
    expect(() => daysBetween('2026-01-01', 'bad2')).toThrow('Invalid date: bad2');
  });
});

describe('User-facing texts and error types', () => {
  it('TC_UT_MUT_06: concession labels shown on tickets', () => {
    expect(Object.fromEntries(Object.values(CONCESSIONS).map((c) => [c.type, c.label]))).toEqual({
      NONE: 'No concession',
      CHILD_FREE: 'Child below 5 - free, no berth',
      CHILD_HALF: 'Child 5-11 - 50%',
      SENIOR_FEMALE: 'Senior citizen (F 58+) - 50%',
      SENIOR_MALE: 'Senior citizen (M/T 60+) - 40%',
    });
  });

  it('TC_UT_MUT_07: refund policy texts', () => {
    expect(REFUND_RULE_TEXT).toEqual({
      FLAT: 'More than 48 hours before departure - flat cancellation charge',
      PCT_25: '12 to 48 hours before departure - 25% of fare deducted',
      PCT_50: '4 to 12 hours before departure - 50% of fare deducted',
      NO_REFUND_CHART: 'Chart prepared (4 hours or less before departure) - no refund',
      NO_REFUND_TATKAL: 'Confirmed Tatkal tickets are non-refundable',
      CLERKAGE: 'RAC / Waitlisted ticket - clerkage charge deducted',
      NO_REFUND_LATE: 'RAC / Waitlisted ticket cancelled within 30 minutes of departure - no refund',
    });
  });

  it('TC_UT_MUT_08: status labels and error class names', () => {
    expect(STATUS_LABEL).toEqual({ CNF: 'Confirmed', RAC: 'RAC', WL: 'Waitlisted', CAN: 'Cancelled' });
    const errors: Error[] = [];
    for (const fn of [
      () => nextStatus('CAN', 'PROMOTE'),
      () => calculateRefund({ status: 'CNF', travelClass: 'SL', quota: 'GN', fare: 100, payingPassengers: 1 }, 0),
      () => createBooking([], draft({ trainNumber: '0' }), PAY, '4000000001', NOW),
      () => generatePNR(0),
    ]) {
      try { fn(); } catch (e) { errors.push(e as Error); }
    }
    expect(errors.map((e) => e.name)).toEqual(['InvalidTransitionError', 'CancellationNotAllowedError', 'BookingError', 'RangeError']);
    expect(errors[0]).toBeInstanceOf(InvalidTransitionError);
    expect(errors[1]).toBeInstanceOf(CancellationNotAllowedError);
    expect(errors[2]).toBeInstanceOf(BookingError);
    expect(errors[3].message).toBe('PNR sequence must be an integer from 1 to 999,999,999');
  });

  it('TC_UT_MUT_09: rupee amounts are rounded to whole rupees', () => {
    expect(formatINR(1234.5)).toBe('₹1,235');
  });
});

describe('Availability details', () => {
  const inv = { berths: 2, rac: 2, wl: 3 };
  it('TC_UT_MUT_10: kind and count are reported, not only the label', () => {
    expect(availability(inv, { cnf: 0, rac: 0, wl: 0 })).toEqual({ kind: 'CNF', count: 2, label: 'AVAILABLE 2' });
    expect(availability(inv, { cnf: 2, rac: 1, wl: 0 })).toEqual({ kind: 'RAC', count: 2, label: 'RAC 2' });
    expect(availability(inv, { cnf: 2, rac: 2, wl: 1 })).toEqual({ kind: 'WL', count: 2, label: 'WL 2' });
    expect(availability(inv, { cnf: 2, rac: 2, wl: 3 })).toEqual({ kind: 'REGRET', count: 0, label: 'REGRET' });
  });
});

describe('Occupancy isolation', () => {
  it('TC_UT_MUT_11: other trains, other classes and cancelled tickets do not count', () => {
    const list = bookAll([
      draft(),
      draft({ travelClass: '2A' }),
      draft({ trainNumber: '12952', from: 'NDLS', to: 'MMCT' }),
      draft({ passengers: [adult('Chetan Rao'), { name: 'Baby Rao', age: 2, gender: 'F' }] }),
    ]);
    expect(list.map((b) => b.status)).toEqual(['CNF', 'CNF', 'CNF', 'RAC']);
    const key = { trainNumber: '12951', runDate: '2026-01-20', travelClass: '1A' as const };
    expect(occupancy(list, key)).toEqual({ cnf: 2, rac: 1, wl: 0 }); // the child below 5 takes no RAC slot
    const afterCancel = cancelBooking(list, list[3].pnr, NOW).bookings;
    expect(occupancy(afterCancel, key)).toEqual({ cnf: 2, rac: 0, wl: 0 });
  });

  it('TC_UT_MUT_12: berth numbering restarts for a different train run', () => {
    const list = bookAll([draft(), draft({ date: '2026-01-21' })]);
    expect(labels(list[1])).toEqual(['H1/1', 'H1/2']);
  });
});

describe('Booking boundaries', () => {
  it('TC_BVA_BOOK_01: exactly 6 passengers can be booked together', () => {
    const six = Array.from({ length: 6 }, (_, i) => adult(`Passenger ${'ABCDEF'[i]}`));
    expect(createBooking([], draft({ travelClass: '3A', passengers: six }), PAY, '4000000001', NOW).passengers).toHaveLength(6);
  });

  it.each([
    { id: 'TC_BVA_BOOK_02', oldest: 11, ok: false },
    { id: 'TC_BVA_BOOK_03', oldest: 12, ok: true },
  ])('$id: oldest passenger aged $oldest -> accepted=$ok (must be older than 11)', ({ oldest, ok }) => {
    const d = draft({ passengers: [{ name: 'Older Child', age: oldest, gender: 'F' }, { name: 'Baby Rao', age: 3, gender: 'M' }] });
    const attempt = () => createBooking([], d, PAY, '4000000001', NOW);
    if (ok) expect(attempt()).toBeTruthy();
    else expect(attempt).toThrow('At least one passenger must be older than 11 years');
  });

  it('TC_BVA_BOOK_04: booking exactly at the departure minute is refused, one minute earlier is accepted', () => {
    const d = draft({ trainNumber: '12127', from: 'CSMT', to: 'PUNE', travelClass: 'SL', date: '2026-01-20' });
    const departure = new Date(2026, 0, 20, 6, 40).getTime();
    expect(() => createBooking([], d, PAY, '4000000001', departure)).toThrow('already departed');
    expect(createBooking([], d, PAY, '4000000001', departure - 60_000).status).toBe('CNF');
  });

  it('TC_UT_MUT_13: passenger names are stored trimmed', () => {
    const [b] = bookAll([draft({ passengers: [adult('  Anil Kumar  ')] })]);
    expect(b.passengers[0].name).toBe('Anil Kumar');
  });

  it('TC_UT_MUT_14: unknown train in helper functions fails safely', () => {
    expect(inventoryKeyFor('99999', 'MMCT', '2026-01-20')).toBe('2026-01-20');
    expect(() => promoteWaiting([], { trainNumber: '99999', runDate: '2026-01-20', travelClass: '1A' }, NOW))
      .toThrow('Selected class is not available on this train');
  });
});

describe('Promotion details', () => {
  const one = (name: string) => draft({ passengers: [adult(name)] });

  it('TC_UT_MUT_15: a promoted ticket gets the freed berth, not its old RAC number', () => {
    const [a, b, c, d] = bookAll([one('Amit Shah'), one('Bina Das'), one('Chetan Rao'), one('Divya Nair')]);
    expect([a, b, c, d].map(labels)).toEqual([['H1/1'], ['H1/2'], ['RAC 1'], ['RAC 2']]);
    const out = cancelBooking([a, b, c, d], b.pnr, NOW);
    expect(labels(out.bookings.find((x) => x.pnr === c.pnr)!)).toEqual(['H1/2']);
    expect(out.promoted).toEqual([c.pnr]);
  });

  it('TC_UT_MUT_16: FIFO uses booking time, not list position', () => {
    const [a, b, c] = bookAll([one('Amit Shah'), one('Bina Das'), one('Chetan Rao')]);
    const d = createBooking([a, b, c], one('Divya Nair'), PAY, '4100000099', NOW + 10 * 60_000);
    // List deliberately out of order: the later RAC booking (d) comes first.
    const out = cancelBooking([d, b, a, c], a.pnr, NOW + 20 * 60_000);
    expect(out.promoted).toEqual([c.pnr]);
  });

  it('TC_UT_MUT_17: WL is not promoted when RAC is still full', () => {
    const [a, b, c, d] = bookAll([one('Amit Shah'), one('Bina Das'), draft(), draft()]);
    expect([c.status, d.status]).toEqual(['RAC', 'WL']);
    const out = cancelBooking([a, b, c, d], a.pnr, NOW);
    expect(out.promoted).toEqual([]);
    expect(out.bookings.find((x) => x.pnr === d.pnr)!.status).toBe('WL');
  });

  it('TC_UT_MUT_18: children below 5 are not charged the per-passenger cancellation fee', () => {
    const [b] = bookAll([draft({ passengers: [{ name: 'Asha Rao', age: 62, gender: 'F' }, adult('Ravi Rao', 4), adult('Kiran Rao', 35)] })]);
    expect(cancelBooking([b], b.pnr, NOW).cancelled.cancellation).toMatchObject({ deduction: 480, refund: 7367 });
  });
});

describe('Chart preparation details', () => {
  const noon = new Date(2026, 0, 20, 12, 0).getTime();
  const fourHoursBefore = new Date(2026, 0, 20, 13, 0).getTime();

  it('TC_BVA_CHART_01: exactly 4 h before departure the chart is prepared', () => {
    const list = bookAll([draft()], noon);
    expect(prepareCharts(list, fourHoursBefore - 1)[0].chartPrepared).toBe(false);
    expect(prepareCharts(list, fourHoursBefore)[0].chartPrepared).toBe(true);
  });

  it('TC_UT_MUT_19: chart keeps confirmed berths and does not add a refund to CNF tickets', () => {
    const one = (name: string) => draft({ passengers: [adult(name)] });
    const [a, b] = bookAll([one('Amit Shah'), one('Bina Das')], noon);
    const list = cancelBooking([a, b], a.pnr, noon).bookings; // H1/1 is now free, b keeps H1/2
    const charted = prepareCharts(list, fourHoursBefore).find((x) => x.pnr === b.pnr)!;
    expect(labels(charted)).toEqual(['H1/2']);
    expect(charted.cancellation).toBeUndefined();
  });

  it('TC_UT_MUT_20: WL auto-cancel deducts clerkage only for paying passengers', () => {
    const family = draft({ passengers: [adult('Kiran Rao', 35), adult('Ravi Rao', 4)] });
    const list = bookAll([draft(), draft(), family], noon);
    expect(list[2].status).toBe('WL');
    const wl = prepareCharts(list, fourHoursBefore)[2];
    expect(wl.cancellation).toMatchObject({ deduction: 60, rule: 'WL_AUTO_CANCEL' });
  });
});
