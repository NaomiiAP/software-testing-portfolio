/**
 * Demo-only helpers: pre-filled passenger lists for guided scenarios and
 * seeding of bookings through the real reservation engine.
 */
import { addDays, toISODate } from '../../lib/dates';
import { createBooking, type Booking, type BookingDraft } from '../../lib/reservation';
import type { PassengerForm } from '../../lib/validation';
import { db } from '../../store/db';

const PREFILL_KEY = 'rr.demo.prefill';

export function setPrefill(passengers: PassengerForm[]) {
  try {
    sessionStorage.setItem(PREFILL_KEY, JSON.stringify(passengers));
  } catch {
    /* ignore */
  }
}

/** Read without side effects (safe inside a React state initialiser). */
export function readPrefill(): PassengerForm[] | null {
  try {
    const raw = sessionStorage.getItem(PREFILL_KEY);
    return raw ? (JSON.parse(raw) as PassengerForm[]) : null;
  } catch {
    return null;
  }
}

export function clearPrefill() {
  try {
    sessionStorage.removeItem(PREFILL_KEY);
  } catch {
    /* ignore */
  }
}

export const dayFromToday = (offset: number) => addDays(toISODate(new Date()), offset);

/**
 * Books `count` tickets for the demo user on one train run using the real
 * createBooking(), after removing earlier bookings of that run so the scenario
 * always starts from the same state. Returns the created bookings.
 */
export function seedRun(draft: Omit<BookingDraft, 'username' | 'contact'>, count: number): Booking[] {
  const keep = db.getBookings().filter((b) => !(b.trainNumber === draft.trainNumber && b.date === draft.date && b.travelClass === draft.travelClass));
  let list = keep;
  const created: Booking[] = [];
  for (let i = 0; i < count; i++) {
    const { pnr, commit } = db.reservePNR();
    const booking = createBooking(
      list,
      { ...draft, username: 'demo', contact: { mobile: '9876543210', email: 'demo@railreserve.test' } },
      { method: 'UPI', reference: `UPI-DEMO${i + 1}` },
      pnr,
      Date.now() + i,
    );
    commit();
    list = [...list, booking];
    created.push(booking);
  }
  db.saveBookings(list);
  return created;
}
