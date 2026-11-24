// @vitest-environment jsdom
/**
 * Browser persistence layer (localStorage / sessionStorage).
 */
import { describe, expect, it } from 'vitest';
import { generatePNR } from '@app/lib/pnr';
import { DEMO_USER, db } from '@app/store/db';

const user = { username: 'priya_n', password: 'Priya@2026', fullName: 'Priya Nair', email: 'p@example.com', mobile: '9123456780' };

describe('Users and session', () => {
  it('TC_UT_STORE_01: the demo account always exists, even on a fresh browser', () => {
    expect(db.getUsers()).toEqual([DEMO_USER]);
    expect(db.findUser('DEMO')).toEqual(DEMO_USER); // case-insensitive lookup
  });

  it('TC_UT_STORE_02: registered users persist; duplicate usernames are refused', () => {
    db.addUser(user);
    expect(db.findUser('priya_n')).toEqual(user);
    expect(() => db.addUser({ ...user, email: 'other@example.com' })).toThrow('Username is already taken');
    expect(() => db.addUser({ ...user, username: 'Demo' })).toThrow('Username is already taken');
  });

  it('TC_UT_STORE_03: session is stored and cleared', () => {
    expect(db.getSession()).toBeNull();
    db.setSession('demo');
    expect(db.getSession()).toBe('demo');
    db.setSession(null);
    expect(db.getSession()).toBeNull();
  });

  it('TC_UT_STORE_04: login lock-out state is kept per username (case-insensitive)', () => {
    db.setLoginState('Demo', { failedAttempts: 2, lockedUntil: null });
    expect(db.getLoginState('demo')).toEqual({ failedAttempts: 2, lockedUntil: null });
    expect(db.getLoginState('someone')).toEqual({ failedAttempts: 0, lockedUntil: null });
  });
});

describe('Robustness', () => {
  it('TC_UT_STORE_05: corrupted storage falls back to defaults instead of crashing', () => {
    localStorage.setItem('rr.users', '{not json');
    localStorage.setItem('rr.bookings', 'garbage');
    expect(db.getUsers()).toEqual([DEMO_USER]);
    expect(db.getBookings()).toEqual([]);
  });

  it('TC_UT_STORE_06: PNR sequence advances only when the booking is committed', () => {
    const first = db.reservePNR();
    expect(first.pnr).toBe(generatePNR(1));
    expect(db.reservePNR().pnr).toBe(generatePNR(1)); // not committed yet -> same number offered again
    first.commit();
    expect(db.reservePNR().pnr).toBe(generatePNR(2));
  });

  it('TC_UT_STORE_07: booking draft round-trips through sessionStorage and can be cleared', () => {
    expect(db.getDraft()).toBeNull();
    db.setDraft({ total: 100 });
    expect(db.getDraft()).toEqual({ total: 100 });
    db.setDraft(null);
    expect(db.getDraft()).toBeNull();
    sessionStorage.setItem('rr.draft', '{bad');
    expect(db.getDraft()).toBeNull();
  });

  it('TC_UT_STORE_08: findBooking returns undefined for unknown PNRs', () => {
    expect(db.findBooking('4007919017')).toBeUndefined();
  });
});
