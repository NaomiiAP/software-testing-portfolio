/**
 * Browser persistence (localStorage). RailReserve has no backend: users,
 * bookings and the PNR sequence live in the browser so the app can be tested
 * offline and every Selenium test starts from a clean profile.
 *
 * Known limitation (logged as defect DEF-V2-01): passwords are stored in plain
 * text because there is no server to hash them on.
 */
import { INITIAL_LOGIN_STATE, type LoginState } from '../lib/auth';
import { generatePNR } from '../lib/pnr';
import { prepareCharts, type Booking } from '../lib/reservation';

export interface User {
  username: string;
  password: string;
  fullName: string;
  email: string;
  mobile: string;
}

export const DEMO_USER: User = {
  username: 'demo',
  password: 'Demo@123',
  fullName: 'Demo Passenger',
  email: 'demo@railreserve.test',
  mobile: '9876543210',
};

const KEYS = {
  users: 'rr.users',
  bookings: 'rr.bookings',
  pnrSeq: 'rr.pnrSeq',
  session: 'rr.session',
  loginState: 'rr.loginState',
  draft: 'rr.draft',
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked - the app keeps working for this session */
  }
}

export const db = {
  // ---- users
  getUsers(): User[] {
    const users = read<User[]>(KEYS.users, []);
    return users.some((u) => u.username === DEMO_USER.username) ? users : [DEMO_USER, ...users];
  },
  findUser(username: string): User | undefined {
    const wanted = username.trim().toLowerCase();
    return this.getUsers().find((u) => u.username.toLowerCase() === wanted);
  },
  addUser(user: User) {
    if (this.findUser(user.username)) throw new Error('Username is already taken');
    write(KEYS.users, [...this.getUsers(), user]);
  },

  // ---- session
  getSession(): string | null {
    return read<string | null>(KEYS.session, null);
  },
  setSession(username: string | null) {
    if (username === null) localStorage.removeItem(KEYS.session);
    else write(KEYS.session, username);
  },

  // ---- login lock-out state, per username
  getLoginState(username: string): LoginState {
    return read<Record<string, LoginState>>(KEYS.loginState, {})[username.toLowerCase()] ?? INITIAL_LOGIN_STATE;
  },
  setLoginState(username: string, state: LoginState) {
    const all = read<Record<string, LoginState>>(KEYS.loginState, {});
    write(KEYS.loginState, { ...all, [username.toLowerCase()]: state });
  },

  // ---- bookings (charts are prepared lazily whenever bookings are read)
  getBookings(now = Date.now()): Booking[] {
    const stored = read<Booking[]>(KEYS.bookings, []);
    const charted = prepareCharts(stored, now);
    if (charted.some((b, i) => b !== stored[i])) write(KEYS.bookings, charted);
    return charted;
  },
  saveBookings(bookings: Booking[]) {
    write(KEYS.bookings, bookings);
  },
  findBooking(pnr: string): Booking | undefined {
    return this.getBookings().find((b) => b.pnr === pnr);
  },
  /** Next PNR; the sequence is only consumed when `commit()` is called (i.e. the booking succeeded). */
  reservePNR(): { pnr: string; commit: () => void } {
    const seq = read<number>(KEYS.pnrSeq, 0) + 1;
    return { pnr: generatePNR(seq), commit: () => write(KEYS.pnrSeq, seq) };
  },

  // ---- booking draft between the passenger page and the payment page
  getDraft<T>(): T | null {
    try {
      const raw = sessionStorage.getItem(KEYS.draft);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  setDraft(draft: unknown) {
    try {
      if (draft === null) sessionStorage.removeItem(KEYS.draft);
      else sessionStorage.setItem(KEYS.draft, JSON.stringify(draft));
    } catch {
      /* ignore */
    }
  },
};
