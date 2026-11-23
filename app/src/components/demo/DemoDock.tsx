/**
 * Demo control room - one-click scenarios for presenting the testing
 * techniques live. Each scenario prepares real application state (logs in,
 * pre-fills passengers, books seats through the real reservation engine) and
 * navigates to the screen where the behaviour can be observed.
 */
import { AnimatePresence, motion } from 'framer-motion';
import { FlaskConical, LogIn, Play, RotateCcw, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { INITIAL_LOGIN_STATE } from '../../lib/auth';
import type { PassengerForm } from '../../lib/validation';
import { useAuth } from '../../store/AuthContext';
import { DEMO_USER, db } from '../../store/db';
import { useMotionOK } from '../motion';
import { useToast } from '../toast';
import { dayFromToday, seedRun, setPrefill } from './demoStore';

type Technique = 'EP' | 'BVA' | 'DT' | 'ST';

interface Scenario {
  id: string;
  technique: Technique;
  title: string;
  observe: string;
  ids: string;
  run: () => void;
}

const TECH: Record<Technique, { name: string; tone: string }> = {
  EP: { name: 'Equivalence partitioning', tone: 'bg-navy-100 text-navy-700' },
  BVA: { name: 'Boundary value analysis', tone: 'bg-saffron-100 text-saffron-700' },
  DT: { name: 'Decision tables', tone: 'bg-mint-100 text-mint-700' },
  ST: { name: 'State transition', tone: 'bg-rose-100 text-rose-700' },
};

const P = (name: string, age: string, gender: PassengerForm['gender']): PassengerForm => ({ name, age, gender });
const bookUrl = (train: string, from: string, to: string, date: string, cls: string, quota = 'GN') =>
  `/book/${train}?${new URLSearchParams({ from, to, date, class: cls, quota }).toString()}`;

export default function DemoDock() {
  const ok = useMotionOK();
  const [open, setOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const { user, login, logout } = useAuth();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const ensureDemoLogin = () => {
    if (user?.username === DEMO_USER.username) return;
    if (user) logout();
    db.setLoginState(DEMO_USER.username, INITIAL_LOGIN_STATE);
    login(DEMO_USER.username, DEMO_USER.password);
  };

  const start = (s: Scenario) => {
    s.run();
    setOpen(false);
    toast.info(`Scenario: ${s.title}`, s.observe, `${TECH[s.technique].name} · ${s.ids}`);
  };

  const scenarios: Scenario[] = [
    {
      id: 'ep-same-station', technique: 'EP', title: 'Same source & destination', ids: 'TC_EP_STN_04 · TC_E2E_02',
      observe: 'The invalid partition "source = destination" is rejected with a clear message.',
      run: () => navigate(`/trains?from=MMCT&to=MMCT&date=${dayFromToday(1)}&quota=GN`),
    },
    {
      id: 'ep-unknown-pnr', technique: 'EP', title: 'Unknown PNR 0000000000', ids: 'TC_IT_10 · TC_E2E_19',
      observe: 'A well-formed PNR that was never booked returns "PNR not found" (v1.0 invented a booking - D06).',
      run: () => navigate('/pnr-status?pnr=0000000000'),
    },
    {
      id: 'ep-bad-pnr', technique: 'EP', title: 'Malformed PNR 40079A9017', ids: 'TC_EP_PNR_04',
      observe: 'A PNR containing a letter belongs to the "non-digit" invalid partition.',
      run: () => navigate('/pnr-status?pnr=40079A9017'),
    },
    {
      id: 'bva-yesterday', technique: 'BVA', title: 'Journey date = yesterday (min − 1)', ids: 'TC_BVA_DATE_01 · TC_E2E_03',
      observe: 'One day below the lower boundary is rejected.',
      run: () => navigate(`/trains?from=NDLS&to=LKO&date=${dayFromToday(-1)}&quota=GN`),
    },
    {
      id: 'bva-120', technique: 'BVA', title: 'Journey date = today + 120 (max)', ids: 'TC_BVA_DATE_05 · TC_E2E_04',
      observe: 'Exactly on the upper boundary is accepted - trains are listed.',
      run: () => navigate(`/trains?from=NDLS&to=LKO&date=${dayFromToday(120)}&quota=GN`),
    },
    {
      id: 'bva-121', technique: 'BVA', title: 'Journey date = today + 121 (max + 1)', ids: 'TC_BVA_DATE_06 · TC_E2E_04',
      observe: 'One day above the upper boundary is rejected.',
      run: () => navigate(`/trains?from=NDLS&to=LKO&date=${dayFromToday(121)}&quota=GN`),
    },
    {
      id: 'bva-six', technique: 'BVA', title: 'Six passengers (max)', ids: 'TC_BVA_PAX_05/06 · TC_E2E_14',
      observe: '"6 of 6 passengers" - the Add passenger button is disabled, a 7th cannot be added.',
      run: () => {
        ensureDemoLogin();
        setPrefill(['Asha Rao', 'Kiran Rao', 'Meera Iyer', 'Arjun Iyer', 'Priya Nair', 'Vikram Singh'].map((n, i) => P(n, String(25 + i * 7), i % 2 ? 'M' : 'F')));
        navigate(bookUrl('12951', 'MMCT', 'NDLS', dayFromToday(10), '3A'));
      },
    },
    {
      id: 'bva-ages', technique: 'BVA', title: 'Ages 0 and 121', ids: 'TC_BVA_AGE_01/06 · TC_E2E_13',
      observe: 'Click "Continue to payment": both values just outside 1-120 are rejected.',
      run: () => {
        ensureDemoLogin();
        setPrefill([P('Asha Rao', '0', 'F'), P('Ravi Kumar', '121', 'M')]);
        navigate(bookUrl('12951', 'MMCT', 'NDLS', dayFromToday(10), '3A'));
      },
    },
    {
      id: 'dt-family', technique: 'DT', title: 'Concessions: senior, infant, adult', ids: 'TC_DT_CON_06/01/05 · TC_E2E_15',
      observe: 'Rules R5 (F 58+ → 50%), R1 (below 5 → free) and R4 (none): total ₹7,867.',
      run: () => {
        ensureDemoLogin();
        setPrefill([P('Asha Rao', '62', 'F'), P('Ravi Rao', '4', 'M'), P('Kiran Rao', '35', 'M')]);
        navigate(bookUrl('12951', 'MMCT', 'NDLS', dayFromToday(10), '1A'));
      },
    },
    {
      id: 'dt-tatkal', technique: 'DT', title: 'Tatkal removes concessions', ids: 'TC_DT_CON_11 · TC_UT_FARE_04/05',
      observe: 'Same 62-year-old in Tatkal: rule R8 - no concession, Tatkal premium added.',
      run: () => {
        ensureDemoLogin();
        setPrefill([P('Asha Rao', '62', 'F'), P('Kiran Rao', '35', 'M')]);
        navigate(bookUrl('12951', 'MMCT', 'NDLS', dayFromToday(1), '1A', 'TQ'));
      },
    },
    {
      id: 'dt-allocation', technique: 'DT', title: 'Train filling up: CNF → RAC → WL', ids: 'TC_DT_ALLOC_01-04 · TC_E2E_17',
      observe: '2 berths and 2 RAC seats are taken - 1A now shows "WL 1". Book 2 → Waitlisted; one more → REGRET.',
      run: () => {
        ensureDemoLogin();
        const date = dayFromToday(15);
        seedRun({ trainNumber: '12951', from: 'MMCT', to: 'NDLS', date, travelClass: '1A', quota: 'GN', passengers: [{ name: 'Seed One', age: 40, gender: 'M' }, { name: 'Seed Two', age: 38, gender: 'F' }] }, 2);
        navigate(`/trains?from=MMCT&to=NDLS&date=${date}&quota=GN&class=1A`);
      },
    },
    {
      id: 'st-promotion', technique: 'ST', title: 'Cancel → waitlist promotion', ids: 'TC_ST_TKT_01/02/05 · TC_E2E_20',
      observe: 'Three tickets: Confirmed, RAC, Waitlisted. Cancel the Confirmed one and watch RAC → CNF and WL → RAC.',
      run: () => {
        ensureDemoLogin();
        seedRun({ trainNumber: '12951', from: 'MMCT', to: 'NDLS', date: dayFromToday(16), travelClass: '1A', quota: 'GN', passengers: [{ name: 'Meera Iyer', age: 30, gender: 'F' }, { name: 'Arjun Iyer', age: 33, gender: 'M' }] }, 3);
        navigate('/bookings');
      },
    },
    {
      id: 'st-lockout', technique: 'ST', title: 'Login lock-out (S0 → S1 → S2 → LOCKED)', ids: 'TC_ST_LOGIN_01-11 · TC_E2E_10',
      observe: 'Log in as "demo" with a wrong password three times, then try the right one.',
      run: () => {
        if (user) logout();
        db.setLoginState(DEMO_USER.username, INITIAL_LOGIN_STATE);
        navigate('/login');
      },
    },
  ];

  const resetAll = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    try {
      Object.keys(localStorage).filter((k) => k.startsWith('rr.')).forEach((k) => localStorage.removeItem(k));
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
    window.location.assign('/');
  };

  return (
    <div className="no-print">
      <motion.button
        type="button"
        onClick={() => {
          setOpen(!open);
          setConfirmReset(false);
        }}
        whileHover={ok ? { y: -2 } : undefined}
        className="fixed bottom-4 left-4 z-[65] flex items-center gap-2 rounded-full bg-navy-900 py-2.5 pl-3 pr-4 text-sm font-bold text-white shadow-lift ring-1 ring-white/10 hover:bg-navy-800"
        data-testid="demo-dock-toggle"
        aria-expanded={open}
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inset-0 rounded-full bg-saffron-400 motion-safe:animate-pulse-ring" />
          <span className="relative h-2.5 w-2.5 rounded-full bg-saffron-500" />
        </span>
        <FlaskConical size={16} /> Demo
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.aside
            initial={ok ? { opacity: 0, y: 24, scale: 0.97 } : false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={ok ? { opacity: 0, y: 24, scale: 0.97, transition: { duration: 0.15 } } : { opacity: 0, transition: { duration: 0 } }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="fixed bottom-20 left-3 right-3 z-[65] flex max-h-[75vh] flex-col overflow-hidden rounded-3xl bg-white shadow-lift ring-1 ring-line sm:left-4 sm:right-auto sm:w-[420px]"
            data-testid="demo-panel"
            aria-label="Demo control room"
          >
            <div className="relative shrink-0 overflow-hidden bg-navy-900 px-5 py-4 text-white">
              <div className="absolute inset-0 hero-grid" aria-hidden="true" />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-1.5 font-extrabold"><Sparkles size={16} className="text-saffron-400" /> Demo control room</p>
                  <p className="mt-0.5 text-xs text-navy-200">One-click scenarios for each test-design technique</p>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-navy-200 hover:bg-white/10 hover:text-white" aria-label="Close demo panel">
                  <X size={17} />
                </button>
              </div>
              <div className="relative mt-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-navy-200">
                  {user ? <>Signed in as <b className="text-white">{user.username}</b></> : 'Not signed in'}
                </span>
                <div className="flex items-center gap-2">
                  {user?.username !== DEMO_USER.username && (
                    <button type="button" onClick={() => { ensureDemoLogin(); toast.success('Signed in as demo', 'Demo Passenger is ready to book.'); }} className="chip bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20" data-testid="demo-login">
                      <LogIn size={13} /> Login as demo
                    </button>
                  )}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={toast.lens}
                    onClick={() => toast.setLens(!toast.lens)}
                    className={`chip ring-1 ${toast.lens ? 'bg-saffron-500 text-white ring-saffron-400' : 'bg-white/10 text-navy-100 ring-white/20'}`}
                    data-testid="demo-lens-toggle"
                    title="Show the technique and test-case ids in notifications"
                  >
                    <FlaskConical size={13} /> Testing lens {toast.lens ? 'on' : 'off'}
                  </button>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
              {(Object.keys(TECH) as Technique[]).map((t) => (
                <section key={t}>
                  <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
                    <span className={`rounded-md px-1.5 py-0.5 font-mono ${TECH[t].tone}`}>{t}</span> {TECH[t].name}
                  </h3>
                  <ul className="space-y-1.5">
                    {scenarios.filter((s) => s.technique === t).map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => start(s)}
                          className="group flex w-full items-center gap-3 rounded-xl border border-line p-3 text-left transition-colors hover:border-navy-300 hover:bg-navy-50/60"
                          data-testid={`demo-scenario-${s.id}`}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold">{s.title}</span>
                            <span className="block truncate font-mono text-[10.5px] text-muted">{s.ids}</span>
                          </span>
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-navy-900 text-white transition-transform group-hover:scale-110">
                            <Play size={13} className="ml-0.5" fill="currentColor" />
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            <div className="shrink-0 border-t border-line p-3">
              <button
                type="button"
                onClick={resetAll}
                className={`btn w-full py-2.5 ${confirmReset ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-mist text-ink hover:bg-line'}`}
                data-testid="demo-reset"
              >
                <RotateCcw size={15} /> {confirmReset ? 'Click again to erase all bookings & accounts' : 'Reset all demo data'}
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
