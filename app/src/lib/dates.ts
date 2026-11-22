/**
 * Date helpers. Journey dates travel through the app as ISO strings
 * ("YYYY-MM-DD", local calendar date) so they are easy to put in URLs and
 * compare without time-zone surprises.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar date of `d` as YYYY-MM-DD. */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parses YYYY-MM-DD into a day number; null for malformed or impossible dates (e.g. 2026-02-30). */
function dayNumber(iso: string): number | null {
  const m = ISO_DATE.exec(iso);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const utc = Date.UTC(y, mo - 1, d);
  // Impossible dates (e.g. 2026-02-30) roll over to another day; a round trip exposes them.
  const check = new Date(utc);
  const roundTrip = `${check.getUTCFullYear()}-${pad(check.getUTCMonth() + 1)}-${pad(check.getUTCDate())}`;
  return roundTrip === iso ? utc / MS_PER_DAY : null;
}

export function isValidISODate(iso: string): boolean {
  return dayNumber(iso) !== null;
}

/** Whole days from `fromIso` to `toIso` (negative when `toIso` is earlier). */
export function daysBetween(fromIso: string, toIso: string): number {
  const a = dayNumber(fromIso);
  const b = dayNumber(toIso);
  if (a === null || b === null) throw new Error(`Invalid date: ${a === null ? fromIso : toIso}`);
  return b - a;
}

export function addDays(iso: string, days: number): string {
  const n = dayNumber(iso);
  if (n === null) throw new Error(`Invalid date: ${iso}`);
  const d = new Date((n + days) * MS_PER_DAY);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOf(iso: string): number {
  const n = dayNumber(iso);
  if (n === null) throw new Error(`Invalid date: ${iso}`);
  return new Date(n * MS_PER_DAY).getUTCDay();
}

/** Local Date for a journey date + "HH:mm" time + day offset (overnight trains). */
export function combineDateTime(iso: string, hhmm: string, dayOffset = 0): Date {
  const [y, mo, d] = iso.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  return new Date(y, mo - 1, d + dayOffset, h, mi, 0, 0);
}

export function hoursBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / MS_PER_HOUR;
}

/** "Mon, 07 Dec 2026" style label for an ISO date. */
export function formatJourneyDate(iso: string): string {
  const [y, mo, d] = iso.split('-').map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
