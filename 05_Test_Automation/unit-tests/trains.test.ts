/**
 * Timetable, search and supporting utilities (dates, PNR).
 * Includes regression tests for baseline defects D07, D09 and D10
 * (random / unstable train data in v1.0).
 */
import { describe, expect, it } from 'vitest';
import { STATIONS, getStation, stationLabel } from '@app/data/stations';
import {
  TRAINS,
  formatDuration,
  getJourney,
  getTrain,
  runningDaysLabel,
  searchTrains,
} from '@app/data/trains';
import {
  addDays,
  combineDateTime,
  daysBetween,
  formatJourneyDate,
  hoursBetween,
  isValidISODate,
  toISODate,
  weekdayOf,
} from '@app/lib/dates';
import { generatePNR } from '@app/lib/pnr';
import { validatePNR } from '@app/lib/validation';

const numbers = (from: string, to: string, date: string) => searchTrains(from, to, date).map((j) => j.train.number);

describe('Train search', () => {
  it('TC_UT_SRCH_01: Mumbai Central -> New Delhi finds the Rajdhani', () => {
    expect(numbers('MMCT', 'NDLS', '2026-01-20')).toEqual(['12951']);
  });

  it('TC_UT_SRCH_02: results are sorted by departure time', () => {
    expect(numbers('CSMT', 'PUNE', '2026-01-20')).toEqual(['12127', '12163']);
  });

  it('TC_UT_SRCH_03: direction matters - reverse route returns the opposite train', () => {
    expect(numbers('NDLS', 'MMCT', '2026-01-20')).toEqual(['12952']);
  });

  it('TC_UT_SRCH_04: weekly train appears only on its running day (Sunday)', () => {
    expect(numbers('ERS', 'PUNE', '2026-01-18')).toEqual(['11098']); // Sunday
    expect(numbers('ERS', 'PUNE', '2026-01-19')).toEqual([]); // Monday
  });

  it('TC_UT_SRCH_05: Howrah Rajdhani does not run on Sunday', () => {
    expect(numbers('HWH', 'NDLS', '2026-01-18')).toEqual([]);
    expect(numbers('HWH', 'NDLS', '2026-01-19')).toEqual(['12301']);
  });

  it('TC_UT_SRCH_06: boarding on day 2 of a journey checks the origin running day', () => {
    // 22691 leaves SBC Mon/Wed/Fri/Sat and reaches NGP the next day.
    expect(numbers('NGP', 'NDLS', '2026-01-20')).toEqual(['12723', '12621', '22691']); // origin Mon 19th
    expect(numbers('NGP', 'NDLS', '2026-01-19')).toEqual(['12723', '12621']); // origin Sun 18th
  });

  it('TC_UT_SRCH_07 (regression D10): the same search always returns the same trains', () => {
    expect(searchTrains('MAS', 'NDLS', '2026-02-02')).toEqual(searchTrains('MAS', 'NDLS', '2026-02-02'));
  });

  it('TC_UT_SRCH_08: stations with no connecting train return no results', () => {
    expect(numbers('MAO', 'HWH', '2026-01-20')).toEqual([]);
  });
});

describe('Journey details', () => {
  it('TC_UT_JRNY_01: distance, duration and next-day arrival', () => {
    const j = getJourney(getTrain('12951')!, 'MMCT', 'NDLS')!;
    expect(j.distanceKm).toBe(1384);
    expect(j.durationMinutes).toBe(932);
    expect(formatDuration(j.durationMinutes)).toBe('15h 32m');
    expect(j.arrivalDayOffset).toBe(1);
  });

  it('TC_UT_JRNY_02: intermediate segment uses the stop distances', () => {
    const j = getJourney(getTrain('12951')!, 'BRC', 'KOTA')!;
    expect(j.distanceKm).toBe(527);
    expect(j.arrivalDayOffset).toBe(1);
  });

  it('TC_UT_JRNY_03: reverse order or unknown station gives no journey', () => {
    expect(getJourney(getTrain('12951')!, 'NDLS', 'MMCT')).toBeNull();
    expect(getJourney(getTrain('12951')!, 'MMCT', 'XXXX')).toBeNull();
    expect(getJourney(getTrain('12951')!, 'MMCT', 'MMCT')).toBeNull();
    expect(getTrain('00000')).toBeUndefined();
  });

  it('TC_UT_JRNY_04: running-day labels', () => {
    expect(runningDaysLabel([0, 1, 2, 3, 4, 5, 6])).toBe('Daily');
    expect(runningDaysLabel([1, 3, 5, 6])).toBe('Mon, Wed, Fri, Sat');
    expect(formatDuration(65)).toBe('1h 05m');
  });
});

describe('Timetable data integrity (static checks)', () => {
  const codes = new Set(STATIONS.map((s) => s.code));

  it.each(TRAINS.map((t) => ({ id: 'TC_UT_DATA_01', number: t.number, train: t })))(
    '$id: train $number has valid stops, increasing distance and time, and at least one class',
    ({ train }) => {
      expect(train.stops.length).toBeGreaterThanOrEqual(2);
      expect(train.stops.every((s) => codes.has(s.code))).toBe(true);
      expect(train.stops[0].km).toBe(0);
      for (let i = 1; i < train.stops.length; i++) {
        const a = train.stops[i - 1];
        const b = train.stops[i];
        expect(b.km).toBeGreaterThan(a.km);
        const t = (s: typeof a) => s.day * 1440 + Number(s.time.slice(0, 2)) * 60 + Number(s.time.slice(3));
        expect(t(b)).toBeGreaterThan(t(a));
      }
      expect(Object.keys(train.classes).length).toBeGreaterThan(0);
      expect(train.runsOn.length).toBeGreaterThan(0);
    },
  );

  it('TC_UT_DATA_02: train numbers and station codes are unique', () => {
    expect(new Set(TRAINS.map((t) => t.number)).size).toBe(TRAINS.length);
    expect(codes.size).toBe(STATIONS.length);
  });

  it('TC_UT_DATA_03: station lookup and labels', () => {
    expect(getStation('NDLS')?.name).toBe('New Delhi');
    expect(stationLabel('MMCT')).toBe('Mumbai Central (MMCT)');
    expect(stationLabel('ZZZ')).toBe('ZZZ');
  });
});

describe('Date utilities', () => {
  it('TC_UT_DATE_01: ISO formatting and validity (leap years, impossible dates)', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(isValidISODate('2028-02-29')).toBe(true);
    expect(isValidISODate('2026-02-29')).toBe(false);
    expect(isValidISODate('2026-13-01')).toBe(false);
    expect(isValidISODate('2026-1-5')).toBe(false);
  });

  it('TC_UT_DATE_02: day arithmetic across month and year ends', () => {
    expect(daysBetween('2026-01-05', '2026-05-05')).toBe(120);
    expect(daysBetween('2026-05-05', '2026-01-05')).toBe(-120);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(weekdayOf('2026-01-05')).toBe(1);
  });

  it('TC_UT_DATE_03: invalid dates raise errors in arithmetic helpers', () => {
    expect(() => daysBetween('2026-02-30', '2026-03-01')).toThrow('Invalid date');
    expect(() => daysBetween('2026-03-01', 'bad')).toThrow('Invalid date: bad');
    expect(() => addDays('bad', 1)).toThrow('Invalid date');
    expect(() => weekdayOf('bad')).toThrow('Invalid date');
  });

  it('TC_UT_DATE_04: combining date + time with day offset, hours between', () => {
    const dep = combineDateTime('2026-01-20', '17:00');
    const arr = combineDateTime('2026-01-20', '08:32', 1);
    expect(arr.getDate()).toBe(21);
    expect(hoursBetween(dep, arr)).toBeCloseTo(15.533, 2);
    expect(formatJourneyDate('2026-01-05')).toMatch(/Mon.*05.*Jan.*2026/);
  });
});

describe('PNR generation', () => {
  it('TC_UT_PNR_01: known values for the first sequence numbers', () => {
    expect(generatePNR(1)).toBe('4007919017');
    expect(generatePNR(2)).toBe('4015838034');
  });

  it('TC_UT_PNR_02: 10 000 consecutive PNRs are unique, 10 digits and pass PNR validation', () => {
    const pnrs = Array.from({ length: 10_000 }, (_, i) => generatePNR(i + 1));
    expect(new Set(pnrs).size).toBe(10_000);
    expect(pnrs.every((p) => validatePNR(p) === null)).toBe(true);
  });

  it.each([
    { id: 'TC_BVA_PNR_01', seq: 0, valid: false },
    { id: 'TC_BVA_PNR_02', seq: 1, valid: true },
    { id: 'TC_BVA_PNR_03', seq: 999_999_999, valid: true },
    { id: 'TC_BVA_PNR_04', seq: 1_000_000_000, valid: false },
    { id: 'TC_EP_PNRSEQ_01', seq: 1.5, valid: false },
  ])('$id: sequence $seq valid=$valid', ({ seq, valid }) => {
    if (valid) expect(generatePNR(seq)).toMatch(/^4\d{9}$/);
    else expect(() => generatePNR(seq)).toThrow(RangeError);
  });
});
