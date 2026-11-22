import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { attemptLogin, type LoginAttemptResult } from '../lib/auth';
import { LOCKOUT_MINUTES } from '../lib/constants';
import { db, type User } from './db';

export interface LoginResponse extends LoginAttemptResult {
  message: string | null;
}

interface AuthValue {
  user: User | null;
  login: (username: string, password: string) => LoginResponse;
  logout: () => void;
  register: (user: User) => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const session = db.getSession();
    return session ? db.findUser(session) ?? null : null;
  });

  const login = useCallback((username: string, password: string): LoginResponse => {
    const key = username.trim();
    const account = db.findUser(key);
    const valid = account !== undefined && account.password === password;
    const result = attemptLogin(db.getLoginState(key), valid, Date.now());
    db.setLoginState(key, result.state);

    if (result.outcome === 'SUCCESS' && account) {
      db.setSession(account.username);
      setUser(account);
      return { ...result, message: null };
    }
    const minutesLeft = result.state.lockedUntil
      ? Math.ceil((result.state.lockedUntil - Date.now()) / 60_000)
      : LOCKOUT_MINUTES;
    const message =
      result.outcome === 'LOCKED'
        ? `Account locked after too many failed attempts. Try again in ${minutesLeft} minute(s).`
        : `Invalid username or password. ${result.remainingAttempts} attempt(s) left.`;
    return { ...result, message };
  }, []);

  const logout = useCallback(() => {
    db.setSession(null);
    setUser(null);
  }, []);

  const register = useCallback((newUser: User) => {
    db.addUser(newUser);
  }, []);

  const value = useMemo(() => ({ user, login, logout, register }), [user, login, logout, register]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
