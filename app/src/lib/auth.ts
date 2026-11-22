/**
 * Login lock-out state machine (see 02_Test_Case_Design/04_State_Transition.md).
 *
 *   S0 --fail--> S1 --fail--> S2 --fail--> LOCKED (15 min)
 *   S0/S1/S2 --success--> LOGGED_IN (counter reset)
 *   LOCKED --any attempt before expiry--> LOCKED
 *   LOCKED --attempt after expiry--> treated as an attempt from S0
 */
import { LOCKOUT_MINUTES, MAX_LOGIN_ATTEMPTS } from './constants';

export interface LoginState {
  failedAttempts: number;
  /** Epoch ms until which the account is locked; null when not locked. */
  lockedUntil: number | null;
}

export type LoginOutcome = 'SUCCESS' | 'INVALID' | 'LOCKED';

export interface LoginAttemptResult {
  state: LoginState;
  outcome: LoginOutcome;
  /** Attempts left before lock-out (0 when locked). */
  remainingAttempts: number;
}

export const INITIAL_LOGIN_STATE: LoginState = { failedAttempts: 0, lockedUntil: null };

export function isLocked(state: LoginState, now: number): boolean {
  return state.lockedUntil !== null && now < state.lockedUntil;
}

export function attemptLogin(state: LoginState, credentialsValid: boolean, now: number): LoginAttemptResult {
  if (isLocked(state, now)) {
    return { state, outcome: 'LOCKED', remainingAttempts: 0 };
  }
  // Lock expired (or never set): start from a clean counter if it had been locked.
  const current = state.lockedUntil !== null ? INITIAL_LOGIN_STATE : state;

  if (credentialsValid) {
    return { state: INITIAL_LOGIN_STATE, outcome: 'SUCCESS', remainingAttempts: MAX_LOGIN_ATTEMPTS };
  }

  const failedAttempts = current.failedAttempts + 1;
  if (failedAttempts >= MAX_LOGIN_ATTEMPTS) {
    return {
      state: { failedAttempts, lockedUntil: now + LOCKOUT_MINUTES * 60_000 },
      outcome: 'LOCKED',
      remainingAttempts: 0,
    };
  }
  return {
    state: { failedAttempts, lockedUntil: null },
    outcome: 'INVALID',
    remainingAttempts: MAX_LOGIN_ATTEMPTS - failedAttempts,
  };
}
