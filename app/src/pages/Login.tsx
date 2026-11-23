import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, LogIn, Sparkles, User } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { LENS } from '../components/demo/lens';
import { useMotionOK } from '../components/motion';
import { useToast } from '../components/toast';
import { Alert, Field, ctaButton, inputClass } from '../components/ui';
import { isLocked } from '../lib/auth';
import { useAuth } from '../store/AuthContext';
import { DEMO_USER, db } from '../store/db';

/** Only allow redirects back into this app (prevents open-redirects via ?next=). */
function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/bookings';
}

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const ok = useMotionOK();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const lockState = username.trim() ? db.getLoginState(username.trim()) : null;
  const locked = lockState ? isLocked(lockState, now) : false;

  useEffect(() => {
    if (!locked) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [locked]);

  if (user) return <Navigate to={next} replace />;

  const attempt = (name: string, pw: string) => {
    const wasLocked = db.getLoginState(name.trim()).lockedUntil !== null && isLocked(db.getLoginState(name.trim()), Date.now());
    const res = login(name, pw);
    setNow(Date.now());
    if (res.outcome === 'SUCCESS') {
      toast.success(`Welcome back, ${db.findUser(name)?.fullName ?? name}`, 'You are signed in.', LENS.loginOk);
      navigate(next, { replace: true });
      return;
    }
    setError(res.message);
    setShake((s) => s + 1);
    if (res.outcome === 'LOCKED') toast.warning('Account locked', res.message ?? undefined, wasLocked ? LENS.stillLocked : LENS.locked);
    else toast.error('Login failed', res.message ?? undefined, LENS.loginFail(res.remainingAttempts));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter your username and password');
      toast.error('Missing details', 'Please enter your username and password');
      return;
    }
    attempt(username, password);
  };

  const useDemo = () => {
    setUsername(DEMO_USER.username);
    setPassword(DEMO_USER.password);
    attempt(DEMO_USER.username, DEMO_USER.password);
  };

  const left = lockState?.lockedUntil ? Math.max(0, lockState.lockedUntil - now) : 0;

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to book and manage your tickets.">
      <motion.form
        key={shake}
        onSubmit={submit}
        noValidate
        className="space-y-4"
        animate={ok && shake ? { x: [0, -10, 10, -6, 6, 0] } : undefined}
        transition={{ duration: 0.4 }}
      >
        <Field label="Username" htmlFor="login-username">
          <div className="relative">
            <User size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input id="login-username" value={username} onChange={(e) => setUsername(e.target.value)} className={`${inputClass} pl-10`} autoComplete="username" data-testid="login-username" />
          </div>
        </Field>
        <Field label="Password" htmlFor="login-password">
          <div className="relative">
            <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input id="login-password" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} pl-10 pr-11`} autoComplete="current-password" data-testid="login-password" />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-mist" aria-label={show ? 'Hide password' : 'Show password'}>
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>
        {error && <Alert testId="login-error">{error}</Alert>}
        {locked && (
          <div className="flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700" data-testid="lock-countdown">
            <Lock size={18} /> Locked - try again in <span className="font-mono tabular">{String(Math.floor(left / 60000)).padStart(2, '0')}:{String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}</span>
          </div>
        )}
        <button type="submit" className={`${ctaButton} w-full py-3.5 text-base`} data-testid="login-submit">
          <LogIn size={18} /> Login
        </button>
      </motion.form>

      <div className="my-6 flex items-center gap-3 text-xs font-semibold text-muted"><span className="h-px flex-1 bg-line" /> OR <span className="h-px flex-1 bg-line" /></div>

      <div className="rounded-2xl border border-dashed border-navy-200 bg-navy-50/60 p-4" data-testid="demo-hint">
        <p className="text-sm font-semibold">Demo account</p>
        <p className="mt-0.5 text-sm text-muted">
          Username <b className="font-mono text-ink">{DEMO_USER.username}</b> · password <b className="font-mono text-ink">{DEMO_USER.password}</b>
        </p>
        <button type="button" onClick={useDemo} className="btn-dark mt-3 w-full" data-testid="demo-login-btn">
          <Sparkles size={16} /> Use demo account
        </button>
      </div>

      <p className="mt-6 text-sm text-muted">
        New to RailReserve? <Link to={`/register?next=${encodeURIComponent(next)}`} className="link" data-testid="register-link">Create an account</Link>
      </p>
    </AuthLayout>
  );
}
