/**
 * State Transition testing.
 *  - Ticket status machine (Table 1 in 02_Test_Case_Design/04_State_Transition.md)
 *  - Login lock-out machine (Table 2)
 * Coverage: every valid transition (0-switch), every invalid event, and
 * representative event sequences (1-switch paths).
 */
import { describe, expect, it } from 'vitest';
import { INITIAL_LOGIN_STATE, attemptLogin, isLocked, type LoginState } from '@app/lib/auth';
import {
  InvalidTransitionError,
  canTransition,
  nextStatus,
  type TicketEvent,
  type TicketStatus,
} from '@app/lib/ticketState';

describe('Ticket status - valid transitions', () => {
  it.each([
    { id: 'TC_ST_TKT_01', from: 'WL', event: 'PROMOTE', to: 'RAC' },
    { id: 'TC_ST_TKT_02', from: 'RAC', event: 'PROMOTE', to: 'CNF' },
    { id: 'TC_ST_TKT_03', from: 'WL', event: 'CANCEL', to: 'CAN' },
    { id: 'TC_ST_TKT_04', from: 'RAC', event: 'CANCEL', to: 'CAN' },
    { id: 'TC_ST_TKT_05', from: 'CNF', event: 'CANCEL', to: 'CAN' },
    { id: 'TC_ST_TKT_06', from: 'WL', event: 'CHART_PREPARED', to: 'CAN' },
    { id: 'TC_ST_TKT_07', from: 'RAC', event: 'CHART_PREPARED', to: 'RAC' },
    { id: 'TC_ST_TKT_08', from: 'CNF', event: 'CHART_PREPARED', to: 'CNF' },
  ] as const)('$id: $from --$event--> $to', ({ from, event, to }) => {
    expect(canTransition(from, event)).toBe(true);
    expect(nextStatus(from, event)).toBe(to);
  });
});

describe('Ticket status - invalid transitions are rejected', () => {
  it.each([
    { id: 'TC_ST_TKT_09', from: 'CNF', event: 'PROMOTE' },
    { id: 'TC_ST_TKT_10', from: 'CAN', event: 'PROMOTE' },
    { id: 'TC_ST_TKT_11', from: 'CAN', event: 'CANCEL' },
    { id: 'TC_ST_TKT_12', from: 'CAN', event: 'CHART_PREPARED' },
  ] as const)('$id: $from --$event--> error', ({ from, event }) => {
    expect(canTransition(from, event)).toBe(false);
    expect(() => nextStatus(from, event)).toThrow(InvalidTransitionError);
  });

  it('TC_ST_TKT_13: the error names the event and the current status', () => {
    expect(() => nextStatus('CAN', 'CANCEL')).toThrow('Invalid transition: CANCEL is not allowed for a Cancelled ticket');
  });
});

describe('Ticket status - event sequences', () => {
  const run = (start: TicketStatus, events: TicketEvent[]) => {
    const path: TicketStatus[] = [start];
    for (const e of events) path.push(nextStatus(path[path.length - 1], e));
    return path;
  };

  it('TC_ST_TKT_14: WL -> RAC -> CNF -> CAN (promoted twice then cancelled)', () => {
    expect(run('WL', ['PROMOTE', 'PROMOTE', 'CANCEL'])).toEqual(['WL', 'RAC', 'CNF', 'CAN']);
  });

  it('TC_ST_TKT_15: RAC frozen at chart, then cancelled', () => {
    expect(run('RAC', ['CHART_PREPARED', 'CANCEL'])).toEqual(['RAC', 'RAC', 'CAN']);
  });

  it('TC_ST_TKT_16: a cancelled ticket cannot be revived by a later promotion', () => {
    expect(() => run('WL', ['CANCEL', 'PROMOTE'])).toThrow(InvalidTransitionError);
  });
});

describe('Login lock-out state machine', () => {
  const NOW = 1_700_000_000_000;
  const LOCK_MS = 15 * 60_000;
  const S1: LoginState = { failedAttempts: 1, lockedUntil: null };
  const S2: LoginState = { failedAttempts: 2, lockedUntil: null };
  const LOCKED: LoginState = { failedAttempts: 3, lockedUntil: NOW + LOCK_MS };

  it('TC_ST_LOGIN_01: S0 + correct password -> logged in', () => {
    expect(attemptLogin(INITIAL_LOGIN_STATE, true, NOW)).toEqual({ state: INITIAL_LOGIN_STATE, outcome: 'SUCCESS', remainingAttempts: 3 });
  });

  it('TC_ST_LOGIN_02: S0 + wrong password -> S1 (2 attempts left)', () => {
    expect(attemptLogin(INITIAL_LOGIN_STATE, false, NOW)).toEqual({ state: S1, outcome: 'INVALID', remainingAttempts: 2 });
  });

  it('TC_ST_LOGIN_03: S1 + wrong password -> S2 (1 attempt left)', () => {
    expect(attemptLogin(S1, false, NOW)).toEqual({ state: S2, outcome: 'INVALID', remainingAttempts: 1 });
  });

  it('TC_ST_LOGIN_04: S2 + wrong password -> LOCKED for 15 minutes', () => {
    expect(attemptLogin(S2, false, NOW)).toEqual({ state: LOCKED, outcome: 'LOCKED', remainingAttempts: 0 });
  });

  it('TC_ST_LOGIN_05: S2 + correct password -> logged in and counter reset', () => {
    expect(attemptLogin(S2, true, NOW).state).toEqual(INITIAL_LOGIN_STATE);
  });

  it('TC_ST_LOGIN_06: LOCKED + correct password before expiry -> still LOCKED', () => {
    expect(attemptLogin(LOCKED, true, NOW + 60_000)).toEqual({ state: LOCKED, outcome: 'LOCKED', remainingAttempts: 0 });
  });

  it('TC_ST_LOGIN_07: LOCKED + wrong password before expiry -> still LOCKED (no extension)', () => {
    expect(attemptLogin(LOCKED, false, NOW + 60_000).state).toBe(LOCKED);
  });

  it('TC_ST_LOGIN_08 (BVA): 1 ms before expiry -> LOCKED', () => {
    expect(isLocked(LOCKED, NOW + LOCK_MS - 1)).toBe(true);
    expect(attemptLogin(LOCKED, true, NOW + LOCK_MS - 1).outcome).toBe('LOCKED');
  });

  it('TC_ST_LOGIN_09 (BVA): exactly at expiry -> login allowed', () => {
    expect(isLocked(LOCKED, NOW + LOCK_MS)).toBe(false);
    expect(attemptLogin(LOCKED, true, NOW + LOCK_MS).outcome).toBe('SUCCESS');
  });

  it('TC_ST_LOGIN_10: wrong password after expiry -> counter restarts at 1', () => {
    expect(attemptLogin(LOCKED, false, NOW + LOCK_MS)).toEqual({ state: S1, outcome: 'INVALID', remainingAttempts: 2 });
  });

  it('TC_ST_LOGIN_11: three consecutive failures from S0 end in LOCKED', () => {
    let state = INITIAL_LOGIN_STATE;
    const outcomes = [];
    for (let i = 0; i < 3; i++) {
      const r = attemptLogin(state, false, NOW);
      state = r.state;
      outcomes.push(r.outcome);
    }
    expect(outcomes).toEqual(['INVALID', 'INVALID', 'LOCKED']);
  });
});
