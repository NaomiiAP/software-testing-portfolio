/**
 * Reservation engine: allocation (CNF -> RAC -> WL -> REGRET), cancellation
 * with FIFO promotion, and chart preparation.
 *
 * Everything here is a pure function over an array of bookings, so the store
 * (localStorage) and the UI stay thin and the rules are unit-testable.
 *
 * Simplifications (documented in the Test Plan, section 4.3):
 *  - All passengers on one PNR share one status.
 *  - Inventory is per train run + class, not per route segment.
 *  - Promotion is strict FIFO: the oldest waiting PNR is promoted only if
 *    every passenger on it fits; later PNRs wait behind it.
 */
import {
  ADVANCE_BOOKING_DAYS,
  CHART_PREPARATION_HOURS,
  CHILD_MAX_AGE,
  CLASS_INFO,
  CLERKAGE_PER_PASSENGER,
  MAX_PASSENGERS,
  MIN_PASSENGERS,
  type Gender,
  type Quota,
  type TravelClass,
} from './constants';
import { addDays, combineDateTime, hoursBetween, toISODate } from './dates';
import { calculateFare, type ConcessionType } from './fare';
import { calculateRefund, type RefundRule } from './refund';
import { nextStatus, type TicketEvent, type TicketStatus } from './ticketState';
import { validateJourneyDate, validateQuota } from './validation';
import { getJourney, getTrain, runsOnDate, type Inventory } from '../data/trains';

export interface PassengerRecord {
  name: string;
  age: number;
  gender: Gender;
  concession: ConcessionType;
  fare: number;
  /** Index in the CNF berth / RAC / WL list; null for children below 5 (no berth). */
  slot: number | null;
}

export interface BookingEvent {
  at: number;
  event: 'BOOKED' | TicketEvent;
  status: TicketStatus;
}

export interface Cancellation {
  at: number;
  refund: number;
  deduction: number;
  rule: RefundRule | 'WL_AUTO_CANCEL';
}

export interface Booking {
  pnr: string;
  username: string;
  trainNumber: string;
  trainName: string;
  from: string;
  to: string;
  /** Boarding date at `from` (YYYY-MM-DD). */
  date: string;
  /** Date the train left its origin - identifies the train run (inventory key). */
  runDate: string;
  departureTime: string;
  arrivalTime: string;
  arrivalDayOffset: number;
  departureAt: number;
  travelClass: TravelClass;
  quota: Quota;
  status: TicketStatus;
  passengers: PassengerRecord[];
  fare: { subtotal: number; convenienceFee: number; total: number };
  contact: { mobile: string; email: string };
  payment: { method: 'UPI' | 'CARD'; reference: string };
  bookedAt: number;
  chartPrepared: boolean;
  cancellation?: Cancellation;
  history: BookingEvent[];
}

export interface BookingDraft {
  username: string;
  trainNumber: string;
  from: string;
  to: string;
  date: string;
  travelClass: TravelClass;
  quota: Quota;
  passengers: { name: string; age: number; gender: Gender }[];
  contact: { mobile: string; email: string };
}

export class BookingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BookingError';
  }
}

export const BOOKING_MESSAGES = {
  trainNotFound: 'Train not found',
  routeNotServed: 'This train does not run between the selected stations',
  notRunning: 'This train does not run on the selected date',
  classNotAvailable: 'Selected class is not available on this train',
  passengerCount: `A booking must have between ${MIN_PASSENGERS} and ${MAX_PASSENGERS} passengers`,
  adultRequired: `At least one passenger must be older than ${CHILD_MAX_AGE} years`,
  departed: 'This train has already departed from the boarding station',
  regret: 'No seats available (REGRET) - please try another train or class',
  pnrNotFound: 'PNR not found',
  alreadyCancelled: 'This ticket is already cancelled',
} as const;

// ------------------------------------------------------------------ helpers
type RunKey = Pick<Booking, 'trainNumber' | 'runDate' | 'travelClass'>;

const sameRun = (b: Booking, k: RunKey) =>
  b.trainNumber === k.trainNumber && b.runDate === k.runDate && b.travelClass === k.travelClass;

/** Passengers that occupy a berth / RAC / WL slot (children below 5 do not). */
export const seatsOf = (b: Pick<Booking, 'passengers'>) => b.passengers.filter((p) => p.slot !== null).length;

export interface Occupancy {
  cnf: number;
  rac: number;
  wl: number;
}

export function occupancy(bookings: Booking[], key: RunKey): Occupancy {
  const occ: Occupancy = { cnf: 0, rac: 0, wl: 0 };
  for (const b of bookings) {
    if (!sameRun(b, key)) continue;
    if (b.status === 'CNF') occ.cnf += seatsOf(b);
    else if (b.status === 'RAC') occ.rac += seatsOf(b);
    else if (b.status === 'WL') occ.wl += seatsOf(b);
  }
  return occ;
}

export type AllocationStatus = 'CNF' | 'RAC' | 'WL' | 'REGRET';

/** Booking-level allocation: the whole PNR gets the first status that can hold every passenger. */
export function decideStatus(seatsNeeded: number, inv: Inventory, occ: Occupancy): AllocationStatus {
  if (seatsNeeded <= inv.berths - occ.cnf) return 'CNF';
  if (seatsNeeded <= inv.rac - occ.rac) return 'RAC';
  if (seatsNeeded <= inv.wl - occ.wl) return 'WL';
  return 'REGRET';
}

export interface AvailabilityInfo {
  kind: AllocationStatus;
  /** Free confirmed berths (kind CNF) or the next RAC / WL position. */
  count: number;
  label: string;
}

export function availability(inv: Inventory, occ: Occupancy): AvailabilityInfo {
  const free = inv.berths - occ.cnf;
  if (free > 0) return { kind: 'CNF', count: free, label: `AVAILABLE ${free}` };
  if (occ.rac < inv.rac) return { kind: 'RAC', count: occ.rac + 1, label: `RAC ${occ.rac + 1}` };
  if (occ.wl < inv.wl) return { kind: 'WL', count: occ.wl + 1, label: `WL ${occ.wl + 1}` };
  return { kind: 'REGRET', count: 0, label: 'REGRET' };
}

/** Smallest `count` indices not in `used`. */
export function allocateSlots(used: Set<number>, count: number): number[] {
  const slots: number[] = [];
  for (let i = 0; slots.length < count; i++) if (!used.has(i)) slots.push(i);
  return slots;
}

function usedSlots(bookings: Booking[], key: RunKey, status: TicketStatus): Set<number> {
  const used = new Set<number>();
  for (const b of bookings) {
    if (b.status !== status || !sameRun(b, key)) continue;
    for (const p of b.passengers) if (p.slot !== null) used.add(p.slot);
  }
  return used;
}

/** Ticket label for a passenger, e.g. "B1/23", "RAC 2", "WL 4", "No berth". */
export function berthLabel(status: TicketStatus, travelClass: TravelClass, slot: number | null): string {
  if (slot === null) return 'No berth';
  if (status === 'RAC') return `RAC ${slot + 1}`;
  if (status === 'WL') return `WL ${slot + 1}`;
  if (status === 'CAN') return '-';
  const info = CLASS_INFO[travelClass];
  const coach = Math.floor(slot / info.berthsPerCoach) + 1;
  const berth = (slot % info.berthsPerCoach) + 1;
  return `${info.coachPrefix}${coach}/${berth}`;
}

function inventoryFor(key: RunKey): Inventory {
  const inv = getTrain(key.trainNumber)?.classes[key.travelClass];
  if (!inv) throw new BookingError(BOOKING_MESSAGES.classNotAvailable);
  return inv;
}

/** Gives `b` the lowest free slots of the `status` pool (b itself must not already be in that pool). */
function withSlots(b: Booking, status: TicketStatus, bookings: Booking[]): Booking {
  const used = usedSlots(bookings, b, status);
  const slots = allocateSlots(used, seatsOf(b));
  let k = 0;
  return {
    ...b,
    status,
    passengers: b.passengers.map((p) => (p.slot === null ? p : { ...p, slot: slots[k++] })),
  };
}

/** True once the train's departure time from the boarding station (on `date`) has been reached. */
export function hasDeparted(date: string, departureTime: string, now: number): boolean {
  return combineDateTime(date, departureTime).getTime() <= now;
}

export function hoursToDeparture(b: Pick<Booking, 'departureAt'>, now: number): number {
  return hoursBetween(new Date(now), new Date(b.departureAt));
}

export function inventoryKeyFor(trainNumber: string, from: string, date: string) {
  const train = getTrain(trainNumber);
  const fromStop = train?.stops.find((s) => s.code === from);
  return fromStop ? addDays(date, -fromStop.day) : date;
}

// ------------------------------------------------------------------ booking
export function createBooking(
  bookings: Booking[],
  draft: BookingDraft,
  payment: Booking['payment'],
  pnr: string,
  now: number,
): Booking {
  const train = getTrain(draft.trainNumber);
  if (!train) throw new BookingError(BOOKING_MESSAGES.trainNotFound);
  const journey = getJourney(train, draft.from, draft.to);
  if (!journey) throw new BookingError(BOOKING_MESSAGES.routeNotServed);

  const today = toISODate(new Date(now));
  const dateError = validateJourneyDate(draft.date, today) ?? validateQuota(draft.quota, draft.date, today);
  if (dateError) throw new BookingError(dateError);
  if (!runsOnDate(journey, draft.date)) throw new BookingError(BOOKING_MESSAGES.notRunning);

  const inv = train.classes[draft.travelClass];
  if (!inv) throw new BookingError(BOOKING_MESSAGES.classNotAvailable);

  const n = draft.passengers.length;
  if (n < MIN_PASSENGERS || n > MAX_PASSENGERS) throw new BookingError(BOOKING_MESSAGES.passengerCount);
  if (!draft.passengers.some((p) => p.age > CHILD_MAX_AGE)) throw new BookingError(BOOKING_MESSAGES.adultRequired);

  const departureAt = combineDateTime(draft.date, journey.from.time).getTime();
  if (hasDeparted(draft.date, journey.from.time, now)) throw new BookingError(BOOKING_MESSAGES.departed);

  const fare = calculateFare(journey.distanceKm, draft.travelClass, draft.quota, draft.passengers);
  const runDate = addDays(draft.date, -journey.from.day);
  const key: RunKey = { trainNumber: train.number, runDate, travelClass: draft.travelClass };
  const seats = fare.lines.filter((l) => l.needsBerth).length;
  const status = decideStatus(seats, inv, occupancy(bookings, key));
  if (status === 'REGRET') throw new BookingError(BOOKING_MESSAGES.regret);

  const draftBooking: Booking = {
    pnr,
    username: draft.username,
    trainNumber: train.number,
    trainName: train.name,
    from: draft.from,
    to: draft.to,
    date: draft.date,
    runDate,
    departureTime: journey.from.time,
    arrivalTime: journey.to.time,
    arrivalDayOffset: journey.arrivalDayOffset,
    departureAt,
    travelClass: draft.travelClass,
    quota: draft.quota,
    status,
    passengers: draft.passengers.map((p, i) => ({
      name: p.name.trim(),
      age: p.age,
      gender: p.gender,
      concession: fare.lines[i].concession.type,
      fare: fare.lines[i].total,
      slot: fare.lines[i].needsBerth ? 0 : null,
    })),
    fare: { subtotal: fare.subtotal, convenienceFee: fare.convenienceFee, total: fare.total },
    contact: draft.contact,
    payment,
    bookedAt: now,
    chartPrepared: false,
    history: [{ at: now, event: 'BOOKED', status }],
  };
  return withSlots(draftBooking, status, bookings);
}

// ------------------------------------------------------------------ promotion
function applyEvent(b: Booking, event: TicketEvent, at: number, bookings: Booking[]): Booking {
  const status = nextStatus(b.status, event);
  // Only a promotion moves the ticket into another berth pool; cancel / chart keep the slots.
  const updated = event === 'PROMOTE' ? withSlots(b, status, bookings) : { ...b, status };
  return { ...updated, history: [...b.history, { at, event, status }] };
}

/**
 * Fills free capacity on one train run, oldest PNR first:
 * free CNF berths -> RAC PNRs promoted to CNF, then free RAC slots -> WL PNRs promoted to RAC.
 */
export function promoteWaiting(bookings: Booking[], key: RunKey, now: number): { bookings: Booking[]; promoted: string[] } {
  const inv = inventoryFor(key);
  let list = bookings;
  const promoted: string[] = [];

  const promoteLevel = (from: 'RAC' | 'WL', capacity: (o: Occupancy) => number) => {
    const queue = list
      .filter((b) => sameRun(b, key) && b.status === from && !b.chartPrepared)
      .sort((a, b) => a.bookedAt - b.bookedAt);
    for (const b of queue) {
      if (seatsOf(b) > capacity(occupancy(list, key))) break; // strict FIFO
      const next = applyEvent(b, 'PROMOTE', now, list);
      list = list.map((x) => (x.pnr === b.pnr ? next : x));
      promoted.push(b.pnr);
    }
  };

  promoteLevel('RAC', (o) => inv.berths - o.cnf);
  promoteLevel('WL', (o) => inv.rac - o.rac);
  return { bookings: list, promoted };
}

// ------------------------------------------------------------------ cancellation
export interface CancelResult {
  bookings: Booking[];
  cancelled: Booking;
  promoted: string[];
}

export function cancelBooking(bookings: Booking[], pnr: string, now: number): CancelResult {
  const target = bookings.find((b) => b.pnr === pnr);
  if (!target) throw new BookingError(BOOKING_MESSAGES.pnrNotFound);
  if (target.status === 'CAN') throw new BookingError(BOOKING_MESSAGES.alreadyCancelled);

  const refund = calculateRefund(
    {
      status: target.status,
      travelClass: target.travelClass,
      quota: target.quota,
      fare: target.fare.total - target.fare.convenienceFee,
      payingPassengers: target.passengers.filter((p) => p.concession !== 'CHILD_FREE').length,
    },
    hoursToDeparture(target, now),
  );

  const cancelled: Booking = {
    ...applyEvent(target, 'CANCEL', now, bookings),
    cancellation: { at: now, ...refund },
  };
  const afterCancel = bookings.map((b) => (b.pnr === pnr ? cancelled : b));
  const { bookings: finalList, promoted } = promoteWaiting(afterCancel, target, now);
  return { bookings: finalList, cancelled, promoted };
}

// ------------------------------------------------------------------ chart
/**
 * Prepares the reservation chart for every train run departing within
 * CHART_PREPARATION_HOURS: waitlisted PNRs are cancelled automatically and
 * refunded minus clerkage; CNF / RAC PNRs are frozen.
 */
export function prepareCharts(bookings: Booking[], now: number): Booking[] {
  return bookings.map((b) => {
    if (b.chartPrepared || b.status === 'CAN' || hoursToDeparture(b, now) > CHART_PREPARATION_HOURS) return b;
    const next = { ...applyEvent(b, 'CHART_PREPARED', now, bookings), chartPrepared: true };
    if (b.status !== 'WL') return next;
    const fare = b.fare.total - b.fare.convenienceFee;
    const paying = b.passengers.filter((p) => p.concession !== 'CHILD_FREE').length;
    const deduction = Math.min(fare, CLERKAGE_PER_PASSENGER * paying);
    return { ...next, cancellation: { at: now, refund: fare - deduction, deduction, rule: 'WL_AUTO_CANCEL' as const } };
  });
}

/** Max journey date offered by the date picker. */
export const maxBookingDate = (today: string) => addDays(today, ADVANCE_BOOKING_DAYS);
