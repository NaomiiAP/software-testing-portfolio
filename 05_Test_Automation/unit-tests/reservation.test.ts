/**
 * Reservation engine: allocation, booking rules, cancellation + promotion, charts.
 *  - Allocation decision table: 02_Test_Case_Design/03_Decision_Table.md (Table 3)
 *  - Allocation BVA: 02_Boundary_Value_Analysis.md
 *  - Promotion / chart sequences: 04_State_Transition.md (integration of the state machine)
 *
 * Clock is injected: "now" is Monday 5 Jan 2026, 10:00 local time.
 */
import { describe, expect, it } from 'vitest';
import { combineDateTime } from '@app/lib/dates';
import {
  BOOKING_MESSAGES,
  allocateSlots,
  availability,
  berthLabel,
  cancelBooking,
  createBooking,
  decideStatus,
  hasDeparted,
  hoursToDeparture,
  inventoryKeyFor,
  maxBookingDate,
  occupancy,
  prepareCharts,
  promoteWaiting,
  type Booking,
  type BookingDraft,
} from '@app/lib/reservation';
import { MESSAGES } from '@app/lib/validation';

const NOW = new Date(2026, 0, 5, 10, 0).getTime();
const PAY = { method: 'UPI' as const, reference: 'UPI-TEST' };

/** 12951 Mumbai Rajdhani, 1A has 2 berths / 2 RAC / 2 WL per run. */
const draft = (over: Partial<BookingDraft> = {}): BookingDraft => ({
  username: 'demo',
  trainNumber: '12951',
  from: 'MMCT',
  to: 'NDLS',
  date: '2026-01-20',
  travelClass: '1A',
  quota: 'GN',
  passengers: [
    { name: 'Asha Rao', age: 62, gender: 'F' },
    { name: 'Kiran Rao', age: 35, gender: 'M' },
  ],
  contact: { mobile: '9876543210', email: 'asha@example.com' },
  ...over,
});

/** Books drafts one after another (1 minute apart) and returns the resulting list. */
function bookAll(drafts: BookingDraft[], now = NOW): Booking[] {
  let list: Booking[] = [];
  drafts.forEach((d, i) => {
    list = [...list, createBooking(list, d, PAY, `40000000${String(i + 10)}`, now + i * 60_000)];
  });
  return list;
}

describe('Allocation decision table (inventory 2 berths / 2 RAC / 2 WL)', () => {
  const inv = { berths: 2, rac: 2, wl: 2 };
  it.each([
    { id: 'TC_DT_ALLOC_01', seats: 2, occ: { cnf: 0, rac: 0, wl: 0 }, expected: 'CNF' },
    { id: 'TC_DT_ALLOC_02', seats: 1, occ: { cnf: 2, rac: 0, wl: 0 }, expected: 'RAC' },
    { id: 'TC_DT_ALLOC_03', seats: 2, occ: { cnf: 2, rac: 2, wl: 0 }, expected: 'WL' },
    { id: 'TC_DT_ALLOC_04', seats: 1, occ: { cnf: 2, rac: 2, wl: 2 }, expected: 'REGRET' },
    { id: 'TC_DT_ALLOC_05', seats: 3, occ: { cnf: 0, rac: 0, wl: 0 }, expected: 'REGRET' },
    { id: 'TC_DT_ALLOC_06', seats: 2, occ: { cnf: 1, rac: 0, wl: 0 }, expected: 'RAC' },
  ])('$id: need $seats with occupancy $occ.cnf/$occ.rac/$occ.wl -> $expected', ({ seats, occ, expected }) => {
    expect(decideStatus(seats, inv, occ)).toBe(expected);
  });
});

describe('Allocation boundaries (BVA, 40 berths, 38 booked -> 2 free)', () => {
  const inv = { berths: 40, rac: 8, wl: 20 };
  const occ = { cnf: 38, rac: 0, wl: 0 };
  it.each([
    { id: 'TC_BVA_ALLOC_01', seats: 1, expected: 'CNF' },
    { id: 'TC_BVA_ALLOC_02', seats: 2, expected: 'CNF' },
    { id: 'TC_BVA_ALLOC_03', seats: 3, expected: 'RAC' },
  ])('$id: $seats seat(s) requested -> $expected', ({ seats, expected }) => {
    expect(decideStatus(seats, inv, occ)).toBe(expected);
  });
});

describe('Availability label and slot numbering', () => {
  const inv = { berths: 2, rac: 2, wl: 2 };
  it.each([
    { id: 'TC_UT_AVL_01', occ: { cnf: 0, rac: 0, wl: 0 }, label: 'AVAILABLE 2' },
    { id: 'TC_UT_AVL_02', occ: { cnf: 2, rac: 0, wl: 0 }, label: 'RAC 1' },
    { id: 'TC_UT_AVL_03', occ: { cnf: 2, rac: 2, wl: 0 }, label: 'WL 1' },
    { id: 'TC_UT_AVL_04', occ: { cnf: 2, rac: 2, wl: 1 }, label: 'WL 2' },
    { id: 'TC_UT_AVL_05', occ: { cnf: 2, rac: 2, wl: 2 }, label: 'REGRET' },
  ])('$id: -> "$label"', ({ occ, label }) => {
    expect(availability(inv, occ).label).toBe(label);
  });

  it('TC_UT_SLOT_01: smallest free slots are allocated first', () => {
    expect(allocateSlots(new Set([0, 1, 3]), 3)).toEqual([2, 4, 5]);
  });

  it.each([
    { id: 'TC_BVA_BERTH_01', slot: 0, label: 'B1/1' },
    { id: 'TC_BVA_BERTH_02', slot: 63, label: 'B1/64' },
    { id: 'TC_BVA_BERTH_03', slot: 64, label: 'B2/1' },
  ])('$id: 3A slot $slot -> $label (64 berths per coach)', ({ slot, label }) => {
    expect(berthLabel('CNF', '3A', slot)).toBe(label);
  });

  it('TC_UT_SLOT_02: RAC / WL / no-berth / cancelled labels', () => {
    expect(berthLabel('RAC', '1A', 0)).toBe('RAC 1');
    expect(berthLabel('WL', '1A', 4)).toBe('WL 5');
    expect(berthLabel('CNF', '1A', null)).toBe('No berth');
    expect(berthLabel('CAN', '1A', 3)).toBe('-');
  });
});

describe('createBooking', () => {
  it('TC_UT_BOOK_01: first booking is confirmed with berths, fare and departure time', () => {
    const [b] = bookAll([draft()]);
    expect(b.status).toBe('CNF');
    expect(b.passengers.map((p) => berthLabel(b.status, b.travelClass, p.slot))).toEqual(['H1/1', 'H1/2']);
    expect(b.passengers.map((p) => p.concession)).toEqual(['SENIOR_FEMALE', 'NONE']);
    expect(b.fare).toEqual({ subtotal: 7847, convenienceFee: 20, total: 7867 });
    expect(b.departureAt).toBe(new Date(2026, 0, 20, 17, 0).getTime());
    expect(b.history).toEqual([{ at: NOW, event: 'BOOKED', status: 'CNF' }]);
  });

  it('TC_UT_BOOK_02: CNF -> RAC -> WL as the train fills, then REGRET', () => {
    const list = bookAll([draft(), draft(), draft()]);
    expect(list.map((b) => b.status)).toEqual(['CNF', 'RAC', 'WL']);
    expect(list[1].passengers.map((p) => berthLabel('RAC', '1A', p.slot))).toEqual(['RAC 1', 'RAC 2']);
    expect(() => createBooking(list, draft(), PAY, '4999999999', NOW)).toThrow(BOOKING_MESSAGES.regret);
  });

  it('TC_UT_BOOK_03: child below 5 does not consume a berth', () => {
    const list = bookAll([draft({ passengers: [{ name: 'Kiran Rao', age: 35, gender: 'M' }] })]);
    const b = createBooking(list, draft({
      passengers: [{ name: 'Asha Rao', age: 30, gender: 'F' }, { name: 'Baby Rao', age: 3, gender: 'F' }],
    }), PAY, '4000000099', NOW);
    expect(b.status).toBe('CNF');
    expect(b.passengers.map((p) => berthLabel(b.status, '1A', p.slot))).toEqual(['H1/2', 'No berth']);
  });

  it('TC_UT_BOOK_04: boarding mid-route shares inventory with the same train run', () => {
    expect(inventoryKeyFor('12951', 'KOTA', '2026-01-21')).toBe('2026-01-20');
    const list = bookAll([draft(), draft({ from: 'KOTA', date: '2026-01-21' })]);
    expect(list[1].runDate).toBe('2026-01-20');
    expect(list[1].status).toBe('RAC');
  });

  it.each([
    { id: 'TC_UT_BOOK_05', over: { trainNumber: '99999' }, error: BOOKING_MESSAGES.trainNotFound },
    { id: 'TC_UT_BOOK_06', over: { from: 'NDLS', to: 'MMCT' }, error: BOOKING_MESSAGES.routeNotServed },
    { id: 'TC_UT_BOOK_07', over: { travelClass: 'SL' as const }, error: BOOKING_MESSAGES.classNotAvailable },
    { id: 'TC_UT_BOOK_08', over: { date: '2026-01-04' }, error: MESSAGES.datePast },
    { id: 'TC_UT_BOOK_09', over: { date: '2026-06-01' }, error: MESSAGES.dateTooFar },
    { id: 'TC_UT_BOOK_10', over: { quota: 'TQ' as const }, error: MESSAGES.tatkalWindow },
    { id: 'TC_UT_BOOK_11', over: { trainNumber: '11098', from: 'ERS', to: 'MAO', travelClass: 'SL' as const }, error: BOOKING_MESSAGES.notRunning },
    { id: 'TC_UT_BOOK_12', over: { passengers: [] }, error: BOOKING_MESSAGES.passengerCount },
    {
      id: 'TC_UT_BOOK_13',
      over: { passengers: Array.from({ length: 7 }, () => ({ name: 'Asha Rao', age: 30, gender: 'F' as const })) },
      error: BOOKING_MESSAGES.passengerCount,
    },
    {
      id: 'TC_UT_BOOK_14',
      over: { passengers: [{ name: 'Child One', age: 8, gender: 'M' as const }, { name: 'Baby Two', age: 3, gender: 'F' as const }] },
      error: BOOKING_MESSAGES.adultRequired,
    },
    { id: 'TC_UT_BOOK_15', over: { trainNumber: '12127', from: 'CSMT', to: 'PUNE', travelClass: 'SL' as const, date: '2026-01-05' }, error: BOOKING_MESSAGES.departed },
  ])('$id: rejected - $error', ({ over, error }) => {
    expect(() => createBooking([], draft(over), PAY, '4000000001', NOW)).toThrow(error);
  });

  it('TC_UT_BOOK_16: Tatkal for tomorrow and the weekly train on its running day are accepted', () => {
    expect(createBooking([], draft({ quota: 'TQ', date: '2026-01-06' }), PAY, '4000000002', NOW).quota).toBe('TQ');
    const sunday = draft({ trainNumber: '11098', from: 'ERS', to: 'MAO', travelClass: 'SL', date: '2026-01-11' });
    expect(createBooking([], sunday, PAY, '4000000003', NOW).status).toBe('CNF');
  });

  it('TC_UT_BOOK_17: occupancy counts only seats of active bookings of the same run', () => {
    const list = bookAll([draft(), draft(), draft({ date: '2026-01-21' })]);
    expect(occupancy(list, { trainNumber: '12951', runDate: '2026-01-20', travelClass: '1A' })).toEqual({ cnf: 2, rac: 2, wl: 0 });
  });
});

describe('cancelBooking and FIFO promotion', () => {
  it('TC_UT_CAN_01: cancelling CNF refunds and promotes RAC -> CNF and WL -> RAC', () => {
    const [b1, b2, b3] = bookAll([draft(), draft(), draft()]);
    const out = cancelBooking([b1, b2, b3], b1.pnr, NOW);
    const byPnr = Object.fromEntries(out.bookings.map((b) => [b.pnr, b]));

    expect(out.cancelled.status).toBe('CAN');
    expect(out.cancelled.cancellation).toEqual({ at: NOW, refund: 7367, deduction: 480, rule: 'FLAT' });
    expect(out.promoted).toEqual([b2.pnr, b3.pnr]);
    expect(byPnr[b2.pnr].status).toBe('CNF');
    expect(byPnr[b2.pnr].passengers.map((p) => berthLabel('CNF', '1A', p.slot))).toEqual(['H1/1', 'H1/2']);
    expect(byPnr[b3.pnr].status).toBe('RAC');
    expect(byPnr[b2.pnr].history.map((h) => h.event)).toEqual(['BOOKED', 'PROMOTE']);
  });

  it('TC_UT_CAN_02: cancelling RAC deducts clerkage and promotes WL -> RAC', () => {
    const [b1, b2, b3] = bookAll([draft(), draft(), draft()]);
    const out = cancelBooking([b1, b2, b3], b2.pnr, NOW);
    expect(out.cancelled.cancellation).toMatchObject({ refund: 7727, deduction: 120, rule: 'CLERKAGE' });
    expect(out.promoted).toEqual([b3.pnr]);
  });

  it('TC_UT_CAN_03: strict FIFO - a 2-seat RAC PNR is not promoted into 1 free berth', () => {
    const one = (name: string) => draft({ passengers: [{ name, age: 40, gender: 'M' }] });
    const [a, b, c] = bookAll([one('Amit Shah'), one('Bina Das'), draft()]);
    expect(c.status).toBe('RAC');
    const out = cancelBooking([a, b, c], a.pnr, NOW);
    expect(out.promoted).toEqual([]);
    expect(out.bookings.find((x) => x.pnr === c.pnr)!.status).toBe('RAC');
  });

  it('TC_UT_CAN_04: unknown PNR and already-cancelled tickets are rejected', () => {
    const [b1] = bookAll([draft()]);
    expect(() => cancelBooking([b1], '4111111111', NOW)).toThrow(BOOKING_MESSAGES.pnrNotFound);
    const { bookings } = cancelBooking([b1], b1.pnr, NOW);
    expect(() => cancelBooking(bookings, b1.pnr, NOW)).toThrow(BOOKING_MESSAGES.alreadyCancelled);
  });

  it('TC_UT_CAN_05: cancelling after departure is refused', () => {
    const [b1] = bookAll([draft()]);
    const afterDeparture = combineDateTime('2026-01-20', '17:30').getTime();
    expect(() => cancelBooking([b1], b1.pnr, afterDeparture)).toThrow('already departed');
  });

  it('TC_UT_CAN_06: promoteWaiting with no free capacity changes nothing', () => {
    const list = bookAll([draft(), draft()]);
    const out = promoteWaiting(list, list[0], NOW);
    expect(out.promoted).toEqual([]);
    expect(out.bookings).toBe(list);
  });
});

describe('Chart preparation (4 h before departure)', () => {
  // Booked on the journey day at 12:00 for the 17:00 departure.
  const noon = new Date(2026, 0, 20, 12, 0).getTime();
  const at1330 = new Date(2026, 0, 20, 13, 30).getTime(); // 3.5 h before departure

  it('TC_UT_CHART_01: more than 4 h before departure nothing changes', () => {
    const list = bookAll([draft({ date: '2026-01-20' })], noon);
    expect(prepareCharts(list, noon)).toEqual(list); // 5 h before
    expect(prepareCharts(list, noon)[0]).toBe(list[0]);
  });

  it('TC_UT_CHART_02: CNF and RAC are frozen, WL is auto-cancelled with clerkage refund', () => {
    const list = bookAll([draft(), draft(), draft()].map((d) => ({ ...d, date: '2026-01-20' })), noon);
    const charted = prepareCharts(list, at1330);
    expect(charted.map((b) => [b.status, b.chartPrepared])).toEqual([['CNF', true], ['RAC', true], ['CAN', true]]);
    expect(charted[2].cancellation).toEqual({ at: at1330, refund: 7727, deduction: 120, rule: 'WL_AUTO_CANCEL' });
    expect(charted[2].history.at(-1)).toEqual({ at: at1330, event: 'CHART_PREPARED', status: 'CAN' });
  });

  it('TC_UT_CHART_03: chart preparation is idempotent and skips cancelled tickets', () => {
    const list = bookAll([draft({ date: '2026-01-20' })], noon);
    const once = prepareCharts(list, at1330);
    expect(prepareCharts(once, at1330 + 60_000)).toEqual(once);
    const cancelled = cancelBooking(list, list[0].pnr, noon).bookings;
    expect(prepareCharts(cancelled, at1330)[0]).toBe(cancelled[0]);
  });
});

describe('Departed trains (regression DEF-V2-02)', () => {
  it.each([
    { id: 'TC_BVA_DEP_01', now: new Date(2026, 0, 20, 6, 39), departed: false, note: '1 minute before departure' },
    { id: 'TC_BVA_DEP_02', now: new Date(2026, 0, 20, 6, 40), departed: true, note: 'at the departure minute' },
    { id: 'TC_BVA_DEP_03', now: new Date(2026, 0, 20, 6, 41), departed: true, note: '1 minute after departure' },
    { id: 'TC_BVA_DEP_04', now: new Date(2026, 0, 19, 23, 59), departed: false, note: 'evening before the journey day' },
  ])('$id: 06:40 train, $note -> departed=$departed', ({ now, departed }) => {
    expect(hasDeparted('2026-01-20', '06:40', now.getTime())).toBe(departed);
  });
});

describe('Helpers', () => {
  it('TC_UT_RES_01: hours to departure', () => {
    const [b] = bookAll([draft()]);
    expect(hoursToDeparture(b, NOW)).toBe(367); // 5 Jan 10:00 -> 20 Jan 17:00
  });

  it('TC_UT_RES_02: max booking date is today + 120 days', () => {
    expect(maxBookingDate('2026-01-05')).toBe('2026-05-05');
  });
});
