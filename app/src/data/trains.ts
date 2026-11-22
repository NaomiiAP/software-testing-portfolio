/**
 * Fixed sample timetable. Unlike v1.0 (random trains on every render, defect
 * D09/D10) the schedule is deterministic, so the same search always returns
 * the same trains - a precondition for repeatable testing.
 *
 * Timings and distances are approximate and for demonstration only.
 */
import type { TravelClass } from '../lib/constants';
import { addDays, weekdayOf } from '../lib/dates';

export interface Stop {
  code: string;
  /** Departure time (arrival time at the terminus), HH:mm. */
  time: string;
  /** Day offset from the train's origin date. */
  day: number;
  /** Distance from origin in km. */
  km: number;
}

export interface Inventory {
  /** Confirmed berths per journey date. */
  berths: number;
  /** Reservation-Against-Cancellation slots. */
  rac: number;
  /** Waiting-list slots. */
  wl: number;
}

export interface TrainDef {
  number: string;
  name: string;
  /** Weekdays the train leaves its origin: 0 = Sun … 6 = Sat. */
  runsOn: number[];
  stops: Stop[];
  classes: Partial<Record<TravelClass, Inventory>>;
}

const DAILY = [0, 1, 2, 3, 4, 5, 6];
const INV = {
  SL: { berths: 60, rac: 12, wl: 30 },
  '3A': { berths: 40, rac: 8, wl: 20 },
  '2A': { berths: 24, rac: 6, wl: 12 },
  '1A': { berths: 8, rac: 2, wl: 4 },
} satisfies Record<TravelClass, Inventory>;

export const TRAINS: TrainDef[] = [
  {
    number: '12951', name: 'Mumbai Rajdhani Express', runsOn: DAILY,
    stops: [
      { code: 'MMCT', time: '17:00', day: 0, km: 0 },
      { code: 'BRC', time: '21:06', day: 0, km: 392 },
      { code: 'KOTA', time: '02:15', day: 1, km: 919 },
      { code: 'NDLS', time: '08:32', day: 1, km: 1384 },
    ],
    // 1A is deliberately tiny so CNF -> RAC -> WL -> REGRET can be demonstrated.
    classes: { '3A': INV['3A'], '2A': INV['2A'], '1A': { berths: 2, rac: 2, wl: 2 } },
  },
  {
    number: '12952', name: 'New Delhi Rajdhani Express', runsOn: DAILY,
    stops: [
      { code: 'NDLS', time: '16:55', day: 0, km: 0 },
      { code: 'KOTA', time: '21:50', day: 0, km: 465 },
      { code: 'BRC', time: '03:30', day: 1, km: 992 },
      { code: 'MMCT', time: '08:35', day: 1, km: 1384 },
    ],
    classes: { '3A': INV['3A'], '2A': INV['2A'], '1A': INV['1A'] },
  },
  {
    number: '12301', name: 'Howrah Rajdhani Express', runsOn: [1, 2, 3, 4, 5, 6],
    stops: [
      { code: 'HWH', time: '16:50', day: 0, km: 0 },
      { code: 'CNB', time: '04:40', day: 1, km: 1006 },
      { code: 'NDLS', time: '10:00', day: 1, km: 1451 },
    ],
    classes: { '3A': INV['3A'], '2A': INV['2A'], '1A': INV['1A'] },
  },
  {
    number: '12627', name: 'Karnataka Express', runsOn: DAILY,
    stops: [
      { code: 'SBC', time: '19:20', day: 0, km: 0 },
      { code: 'BPL', time: '22:50', day: 1, km: 1660 },
      { code: 'NDLS', time: '10:30', day: 2, km: 2365 },
    ],
    classes: { SL: INV.SL, '3A': INV['3A'], '2A': INV['2A'] },
  },
  {
    number: '12621', name: 'Tamil Nadu Express', runsOn: DAILY,
    stops: [
      { code: 'MAS', time: '22:00', day: 0, km: 0 },
      { code: 'NGP', time: '15:20', day: 1, km: 1092 },
      { code: 'BPL', time: '21:00', day: 1, km: 1482 },
      { code: 'NDLS', time: '07:05', day: 2, km: 2182 },
    ],
    classes: { SL: INV.SL, '3A': INV['3A'], '2A': INV['2A'], '1A': INV['1A'] },
  },
  {
    number: '12163', name: 'Chennai Express', runsOn: DAILY,
    stops: [
      { code: 'CSMT', time: '20:30', day: 0, km: 0 },
      { code: 'PUNE', time: '23:45', day: 0, km: 192 },
      { code: 'MAS', time: '21:30', day: 1, km: 1281 },
    ],
    classes: { SL: INV.SL, '3A': INV['3A'], '2A': INV['2A'] },
  },
  {
    number: '12127', name: 'Mumbai Pune Intercity Express', runsOn: DAILY,
    stops: [
      { code: 'CSMT', time: '06:40', day: 0, km: 0 },
      { code: 'PUNE', time: '09:57', day: 0, km: 192 },
    ],
    classes: { SL: INV.SL },
  },
  {
    number: '12933', name: 'Karnavati Express', runsOn: DAILY,
    stops: [
      { code: 'MMCT', time: '13:40', day: 0, km: 0 },
      { code: 'BRC', time: '18:45', day: 0, km: 392 },
      { code: 'ADI', time: '20:15', day: 0, km: 491 },
    ],
    classes: { SL: INV.SL, '3A': INV['3A'] },
  },
  {
    number: '12957', name: 'Swarna Jayanti Rajdhani', runsOn: DAILY,
    stops: [
      { code: 'ADI', time: '17:40', day: 0, km: 0 },
      { code: 'JP', time: '03:30', day: 1, km: 626 },
      { code: 'NDLS', time: '07:35', day: 1, km: 934 },
    ],
    classes: { '3A': INV['3A'], '2A': INV['2A'], '1A': INV['1A'] },
  },
  {
    number: '12958', name: 'Swarna Jayanti Rajdhani', runsOn: DAILY,
    stops: [
      { code: 'NDLS', time: '19:55', day: 0, km: 0 },
      { code: 'JP', time: '00:40', day: 1, km: 308 },
      { code: 'ADI', time: '09:40', day: 1, km: 934 },
    ],
    classes: { '3A': INV['3A'], '2A': INV['2A'], '1A': INV['1A'] },
  },
  {
    number: '12229', name: 'Lucknow Mail', runsOn: DAILY,
    stops: [
      { code: 'LKO', time: '22:00', day: 0, km: 0 },
      { code: 'NDLS', time: '07:00', day: 1, km: 492 },
    ],
    classes: { SL: INV.SL, '3A': INV['3A'], '2A': INV['2A'], '1A': INV['1A'] },
  },
  {
    number: '12230', name: 'Lucknow Mail', runsOn: DAILY,
    stops: [
      { code: 'NDLS', time: '22:00', day: 0, km: 0 },
      { code: 'LKO', time: '06:55', day: 1, km: 492 },
    ],
    classes: { SL: INV.SL, '3A': INV['3A'], '2A': INV['2A'], '1A': INV['1A'] },
  },
  {
    number: '12723', name: 'Telangana Express', runsOn: DAILY,
    stops: [
      { code: 'SC', time: '06:00', day: 0, km: 0 },
      { code: 'NGP', time: '15:00', day: 0, km: 581 },
      { code: 'BPL', time: '21:00', day: 0, km: 971 },
      { code: 'NDLS', time: '08:05', day: 1, km: 1677 },
    ],
    classes: { SL: INV.SL, '3A': INV['3A'], '2A': INV['2A'] },
  },
  {
    number: '12841', name: 'Coromandel Express', runsOn: DAILY,
    stops: [
      { code: 'HWH', time: '15:20', day: 0, km: 0 },
      { code: 'MAS', time: '16:50', day: 1, km: 1662 },
    ],
    classes: { SL: INV.SL, '3A': INV['3A'], '2A': INV['2A'] },
  },
  {
    number: '22691', name: 'Bengaluru Rajdhani Express', runsOn: [1, 3, 5, 6],
    stops: [
      { code: 'SBC', time: '20:00', day: 0, km: 0 },
      { code: 'SC', time: '07:50', day: 1, km: 610 },
      { code: 'NGP', time: '17:45', day: 1, km: 1190 },
      { code: 'BPL', time: '23:50', day: 1, km: 1580 },
      { code: 'NDLS', time: '05:30', day: 2, km: 2365 },
    ],
    classes: { '3A': INV['3A'], '2A': INV['2A'], '1A': INV['1A'] },
  },
  {
    number: '11098', name: 'Poorna Express', runsOn: [0],
    stops: [
      { code: 'ERS', time: '05:15', day: 0, km: 0 },
      { code: 'MAO', time: '19:00', day: 0, km: 712 },
      { code: 'PUNE', time: '07:40', day: 1, km: 1290 },
    ],
    classes: { SL: INV.SL, '3A': INV['3A'] },
  },
];

const BY_NUMBER = new Map(TRAINS.map((t) => [t.number, t]));

export function getTrain(number: string): TrainDef | undefined {
  return BY_NUMBER.get(number);
}

export interface Journey {
  train: TrainDef;
  from: Stop;
  to: Stop;
  distanceKm: number;
  durationMinutes: number;
  /** Days between boarding and arrival (0 = same day). */
  arrivalDayOffset: number;
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Journey between two stations on a train, or null if it does not serve them in that order. */
export function getJourney(train: TrainDef, from: string, to: string): Journey | null {
  const i = train.stops.findIndex((s) => s.code === from);
  const j = train.stops.findIndex((s) => s.code === to);
  if (i < 0 || j < 0 || i >= j) return null;
  const a = train.stops[i];
  const b = train.stops[j];
  return {
    train,
    from: a,
    to: b,
    distanceKm: b.km - a.km,
    durationMinutes: (b.day * 1440 + toMinutes(b.time)) - (a.day * 1440 + toMinutes(a.time)),
    arrivalDayOffset: b.day - a.day,
  };
}

/** Does the train call at `journey.from` on `date` (the passenger's boarding date)? */
export function runsOnDate(journey: Journey, date: string): boolean {
  const originDate = addDays(date, -journey.from.day);
  return journey.train.runsOn.includes(weekdayOf(originDate));
}

/** Trains from -> to running on `date`, sorted by departure time. */
export function searchTrains(from: string, to: string, date: string): Journey[] {
  return TRAINS.map((t) => getJourney(t, from, to))
    .filter((j): j is Journey => j !== null && runsOnDate(j, date))
    .sort((x, y) => toMinutes(x.from.time) - toMinutes(y.from.time));
}

export function formatDuration(minutes: number): string {
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function runningDaysLabel(runsOn: number[]): string {
  return runsOn.length === 7 ? 'Daily' : runsOn.map((d) => DAY_NAMES[d]).join(', ');
}
