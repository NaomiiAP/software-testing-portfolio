import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  BadgePercent,
  CalendarClock,
  CalendarDays,
  Clock3,
  CreditCard,
  RefreshCcw,
  ScanLine,
  Search,
  ShieldCheck,
  Ticket,
  TrainFront,
  Users,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { RouteNetwork } from '../components/art';
import { CountUp, Reveal, useMotionOK } from '../components/motion';
import SearchForm from '../components/SearchForm';
import { useToast } from '../components/toast';
import { STATIONS, getStation } from '../data/stations';
import { TRAINS, formatDuration, getJourney, getTrain, runningDaysLabel, runsOnDate } from '../data/trains';
import { CLASS_ORDER } from '../lib/constants';
import { addDays, toISODate } from '../lib/dates';
import { baseFare, farePerPassenger, formatINR } from '../lib/fare';
import { validatePNR } from '../lib/validation';
import { lensForMessage } from '../components/demo/lens';

const CITIES = ['New Delhi', 'Mumbai', 'Chennai', 'Kolkata', 'Bengaluru', 'Jaipur'];

const POPULAR: { train: string; from: string; to: string; tag: string }[] = [
  { train: '12951', from: 'MMCT', to: 'NDLS', tag: 'Rajdhani' },
  { train: '12301', from: 'HWH', to: 'NDLS', tag: 'Rajdhani' },
  { train: '12127', from: 'CSMT', to: 'PUNE', tag: 'Intercity' },
  { train: '12621', from: 'MAS', to: 'NDLS', tag: 'Superfast' },
  { train: '12230', from: 'NDLS', to: 'LKO', tag: 'Overnight' },
  { train: '11098', from: 'ERS', to: 'PUNE', tag: 'Weekly' },
];

function RotatingCity() {
  const ok = useMotionOK();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!ok) return;
    const t = setInterval(() => setI((n) => (n + 1) % CITIES.length), 2200);
    return () => clearInterval(t);
  }, [ok]);
  return (
    <span className="relative inline-flex h-[1.15em] overflow-hidden align-bottom">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={CITIES[i]}
          initial={ok ? { y: '100%', opacity: 0 } : false}
          animate={{ y: '0%', opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          className="bg-gradient-to-r from-saffron-300 via-saffron-400 to-saffron-500 bg-clip-text text-transparent"
        >
          {CITIES[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function PopularRoute({ train: number, from, to, tag }: (typeof POPULAR)[number]) {
  const navigate = useNavigate();
  const train = getTrain(number)!;
  const journey = getJourney(train, from, to)!;
  const cheapest = Math.min(
    ...CLASS_ORDER.filter((c) => train.classes[c]).map((c) => farePerPassenger(baseFare(journey.distanceKm, c), c, 'GN', { age: 30, gender: 'M' }).total),
  );
  const today = toISODate(new Date());
  // next date (from tomorrow) on which the train calls at the boarding station
  const nextDate = Array.from({ length: 8 }, (_, k) => addDays(today, k + 1)).find((d) => runsOnDate(journey, d)) ?? addDays(today, 1);

  return (
    <button
      type="button"
      onClick={() => navigate(`/trains?from=${from}&to=${to}&date=${nextDate}&quota=GN`)}
      className="group card flex h-full w-full flex-col overflow-hidden text-left transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lift"
      data-testid={`popular-${number}`}
    >
      <div className="flex items-center justify-between px-5 pt-5">
        <span className="chip bg-navy-50 text-navy-700">{tag}</span>
        <span className="rounded-md bg-navy-900 px-1.5 py-0.5 font-mono text-[11px] font-bold text-white">{number}</span>
      </div>

      <div className="px-5 pt-5 pb-5">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
          <div>
            <p className="font-mono text-2xl font-bold leading-none text-ink">{from}</p>
            <p className="mt-1 text-xs font-medium text-muted">{getStation(from)?.city}</p>
          </div>
          <div className="relative h-6" aria-hidden="true">
            <span className="absolute inset-x-1 top-1/2 border-t-2 border-dashed border-navy-200" />
            <span className="absolute left-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-navy-500 bg-white" />
            <span className="absolute right-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-navy-500" />
            <span className="absolute left-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full bg-saffron-500 text-white shadow-glow transition-[left] duration-[1400ms] ease-in-out motion-safe:group-hover:left-[calc(100%-32px)]">
              <TrainFront size={13} strokeWidth={2.5} />
            </span>
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl font-bold leading-none text-ink">{to}</p>
            <p className="mt-1 text-xs font-medium text-muted">{getStation(to)?.city}</p>
          </div>
        </div>
        <p className="mt-5 truncate font-bold text-ink">{train.name}</p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted">
          <span className="flex items-center gap-1"><Clock3 size={13} /> {formatDuration(journey.durationMinutes)}</span>
          <span className="flex items-center gap-1"><CalendarDays size={13} /> {runningDaysLabel(train.runsOn)}</span>
          <span>{journey.distanceKm} km</span>
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-dashed border-line bg-mist/60 px-5 py-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Fares from</p>
          <p className="text-xl font-extrabold tracking-tight tabular text-ink">{formatINR(cheapest)}</p>
        </div>
        <span className="flex items-center gap-2 text-sm font-bold text-saffron-600">
          <span className="hidden sm:inline">Check seats</span>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-saffron-500 text-white shadow-glow transition-transform duration-300 group-hover:translate-x-1">
            <ArrowRight size={18} />
          </span>
        </span>
      </div>
    </button>
  );
}

function QuickPnr() {
  const navigate = useNavigate();
  const toast = useToast();
  const [pnr, setPnr] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const problem = validatePNR(pnr);
    if (problem) {
      toast.error('Invalid PNR', problem, lensForMessage(problem));
      return;
    }
    navigate(`/pnr-status?pnr=${pnr.trim()}`);
  };
  return (
    <form onSubmit={submit} className="flex w-full max-w-md gap-2">
      <input
        value={pnr}
        onChange={(e) => setPnr(e.target.value)}
        inputMode="numeric"
        placeholder="10-digit PNR"
        className="field font-mono tracking-widest"
        aria-label="PNR number"
        data-testid="home-pnr-input"
      />
      <button type="submit" className="btn-primary shrink-0">Check</button>
    </form>
  );
}

const STEPS = [
  { icon: Search, title: 'Search', text: 'Pick stations, a date, class and quota.' },
  { icon: Users, title: 'Add passengers', text: 'Up to 6 - concessions apply automatically.' },
  { icon: CreditCard, title: 'Pay', text: 'UPI or card, with a 10-minute seat hold.' },
  { icon: Ticket, title: 'Travel', text: 'Instant PNR and a printable e-ticket.' },
];

const FEATURES = [
  { icon: BadgePercent, title: 'Automatic concessions', text: 'Senior citizen and child concessions are applied from age and gender - never in Tatkal.' },
  { icon: RefreshCcw, title: 'Live waitlist promotion', text: 'When someone cancels, RAC and waitlisted tickets move up automatically, oldest first.' },
  { icon: ShieldCheck, title: 'Transparent refunds', text: 'See the exact refund and the rule behind it before you confirm a cancellation.' },
  { icon: CalendarClock, title: 'Chart preparation', text: 'Four hours before departure the chart is prepared; waitlisted tickets are refunded.' },
];

export default function Home() {
  return (
    <div>
      {/* ---------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-navy-900 via-navy-900 to-navy-800 text-white">
        <div className="absolute inset-0 hero-grid" aria-hidden="true" />
        <div className="absolute -top-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-navy-500/30 blur-3xl motion-safe:animate-drift" aria-hidden="true" />
        <div className="absolute top-20 right-0 h-96 w-96 rounded-full bg-saffron-500/20 blur-3xl motion-safe:animate-drift [animation-delay:-7s]" aria-hidden="true" />

        <div className="relative container mx-auto max-w-7xl px-4 pt-12 pb-40 md:pt-16 grid lg:grid-cols-[1.05fr_1fr] gap-8 items-center">
          <div>
            <Reveal>
              <span className="chip bg-white/10 text-navy-100 ring-1 ring-white/15">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inset-0 rounded-full bg-mint-500 motion-safe:animate-pulse-ring" />
                  <span className="relative h-2 w-2 rounded-full bg-mint-500" />
                </span>
                Bookings open · {TRAINS.length} trains · {STATIONS.length} stations
              </span>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="mt-5 text-[2.6rem] leading-[1.05] sm:text-6xl font-extrabold tracking-tight">
                Book your train to
                <br />
                <RotatingCity />
                <br />
                in under a minute.
              </h1>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-5 max-w-xl text-lg text-navy-200">
                Live seat availability, automatic concessions, instant PNR and transparent refunds - the way railway booking should feel.
              </p>
            </Reveal>
            <Reveal delay={0.24}>
              <div className="mt-7 flex flex-wrap gap-x-8 gap-y-3 text-sm text-navy-200">
                <span className="flex items-center gap-2"><CalendarClock size={17} className="text-saffron-400" /> Book up to 120 days ahead</span>
                <span className="flex items-center gap-2"><ScanLine size={17} className="text-saffron-400" /> QR e-ticket</span>
                <span className="flex items-center gap-2"><RefreshCcw size={17} className="text-saffron-400" /> Auto waitlist promotion</span>
              </div>
            </Reveal>
          </div>
          <Reveal delay={0.1} className="hidden lg:block">
            <div className="relative">
              <RouteNetwork className="w-full drop-shadow-[0_0_30px_rgba(47,91,224,.35)]" />
              <span className="absolute bottom-2 right-2 text-[11px] font-medium text-navy-300/80">Illustrative network · not to scale</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------------- search card */}
      <div className="relative container mx-auto max-w-7xl px-4 -mt-28">
        <Reveal delay={0.2}>
          <div className="card shadow-lift p-5 md:p-7">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-extrabold tracking-tight">Book train tickets</h2>
              <span className="text-xs font-medium text-muted">Tatkal opens one day before the journey</span>
            </div>
            <SearchForm />
          </div>
        </Reveal>
      </div>

      {/* ---------------------------------------------------------------- stats */}
      <section className="container mx-auto max-w-7xl px-4 pt-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { n: TRAINS.length, label: 'Trains in the network' },
            { n: STATIONS.length, label: 'Stations served' },
            { n: CLASS_ORDER.length, label: 'Travel classes' },
            { n: 120, label: 'Days advance booking' },
          ].map((s, i) => (
            <Reveal key={s.label} inView delay={i * 0.06}>
              <div className="card p-5">
                <p className="text-3xl font-extrabold tracking-tight text-navy-900 tabular"><CountUp value={s.n} /></p>
                <p className="mt-1 text-sm font-medium text-muted">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- popular routes */}
      <section className="container mx-auto max-w-7xl px-4 pt-16">
        <Reveal inView>
          <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
            <div>
              <p className="text-sm font-bold text-saffron-600">Popular right now</p>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Trending routes</h2>
            </div>
            <p className="text-sm text-muted">Fares shown for one adult, General quota, incl. GST.</p>
          </div>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {POPULAR.map((p, i) => (
            <Reveal key={p.train} inView delay={i * 0.05} className="h-full">
              <PopularRoute {...p} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- PNR band */}
      <section className="container mx-auto max-w-7xl px-4 pt-16">
        <Reveal inView>
          <div className="relative overflow-hidden rounded-3xl bg-navy-900 px-6 py-9 md:px-10 text-white">
            <div className="absolute inset-0 hero-grid" aria-hidden="true" />
            <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-saffron-500/25 blur-3xl" aria-hidden="true" />
            <div className="relative flex flex-wrap items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight">Check your PNR status</h2>
                <p className="mt-1 text-navy-200">Current status, berth and chart status - instantly.</p>
              </div>
              <QuickPnr />
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---------------------------------------------------------------- how it works */}
      <section className="container mx-auto max-w-7xl px-4 pt-16">
        <Reveal inView>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-8">How booking works</h2>
        </Reveal>
        <div className="relative grid gap-6 md:grid-cols-4">
          <div className="absolute left-0 right-0 top-7 hidden h-0.5 bg-gradient-to-r from-saffron-400 via-navy-300 to-mint-500 md:block" aria-hidden="true" />
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} inView delay={i * 0.08}>
              <div className="relative">
                <span className="relative grid h-14 w-14 place-items-center rounded-2xl bg-white text-navy-700 shadow-card ring-1 ring-line">
                  <Icon size={24} />
                  <span className="absolute -top-2 -right-2 grid h-6 w-6 place-items-center rounded-full bg-saffron-500 text-xs font-bold text-white">{i + 1}</span>
                </span>
                <h3 className="mt-4 font-bold">{title}</h3>
                <p className="mt-1 text-sm text-muted">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- features */}
      <section className="container mx-auto max-w-7xl px-4 py-16">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} inView delay={i * 0.06} className="h-full">
              <div className="group card h-full p-6 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lift">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-saffron-50 text-saffron-600 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                  <Icon size={22} />
                </span>
                <h3 className="mt-4 font-bold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
