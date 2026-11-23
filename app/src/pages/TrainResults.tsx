import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Moon,
  Search,
  SlidersHorizontal,
  Sun,
  Sunrise,
  Sunset,
  TrainFront,
} from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { lensForMessage } from '../components/demo/lens';
import { Reveal, useMotionOK } from '../components/motion';
import SearchForm from '../components/SearchForm';
import { useToast } from '../components/toast';
import { Alert, PageShell, ctaButton, inputClass } from '../components/ui';
import { getStation, stationLabel } from '../data/stations';
import {
  DAY_NAMES,
  TRAINS,
  formatDuration,
  runningDaysLabel,
  searchTrains,
  type Journey,
  type TrainDef,
} from '../data/trains';
import { CLASS_INFO, CLASS_ORDER, QUOTA_LABEL, type Quota, type TravelClass } from '../lib/constants';
import { addDays, daysBetween, formatJourneyDate, toISODate } from '../lib/dates';
import { baseFare, farePerPassenger, formatINR } from '../lib/fare';
import { availability, hasDeparted, maxBookingDate, occupancy, type AvailabilityInfo, type Booking } from '../lib/reservation';
import { validateJourneyDate, validateQuota, validateStations } from '../lib/validation';
import { useAuth } from '../store/AuthContext';
import { db } from '../store/db';

const AVAIL_STYLE: Record<AvailabilityInfo['kind'], string> = {
  CNF: 'bg-mint-50 text-mint-700 ring-mint-500/25',
  RAC: 'bg-amber-50 text-amber-700 ring-amber-500/30',
  WL: 'bg-rose-50 text-rose-700 ring-rose-500/25',
  REGRET: 'bg-slate-100 text-slate-500 ring-slate-300',
};

const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));

type ClassInfo = { cls: TravelClass; avail: AvailabilityInfo; fare: number };

function classInfo(journey: Journey, date: string, quota: Quota, bookings: Booking[]): ClassInfo[] {
  const t = journey.train;
  return CLASS_ORDER.filter((c) => t.classes[c]).map((cls) => {
    const key = { trainNumber: t.number, runDate: addDays(date, -journey.from.day), travelClass: cls };
    return {
      cls,
      avail: availability(t.classes[cls]!, occupancy(bookings, key)),
      fare: farePerPassenger(baseFare(journey.distanceKm, cls), cls, quota, { age: 30, gender: 'M' }).total,
    };
  });
}

/** Mon → Sun running-day dots. */
function RunsOn({ train }: { train: TrainDef }) {
  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <span className="flex items-center gap-0.5" title={`Runs: ${runningDaysLabel(train.runsOn)}`} aria-label={`Runs: ${runningDaysLabel(train.runsOn)}`}>
      {order.map((d) => (
        <span
          key={d}
          className={`grid h-5 w-5 place-items-center rounded-md text-[10px] font-bold ${train.runsOn.includes(d) ? 'bg-navy-100 text-navy-700' : 'text-slate-300'}`}
        >
          {DAY_NAMES[d][0]}
        </span>
      ))}
    </span>
  );
}

function TrainCard({ journey, date, quota, preferred, classes, index }: {
  journey: Journey; date: string; quota: Quota; preferred: TravelClass | null; classes: ClassInfo[]; index: number;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const ok = useMotionOK();
  const t = journey.train;
  const [selected, setSelected] = useState<TravelClass>(preferred && t.classes[preferred] ? preferred : classes[0].cls);
  const chosen = classes.find((c) => c.cls === selected)!;
  const departed = hasDeparted(date, journey.from.time, Date.now());
  const fromIdx = t.stops.findIndex((s) => s.code === journey.from.code);
  const toIdx = t.stops.findIndex((s) => s.code === journey.to.code);
  const halts = toIdx - fromIdx - 1;

  const book = () => {
    const params = new URLSearchParams({ from: journey.from.code, to: journey.to.code, date, class: selected, quota });
    const target = `/book/${t.number}?${params.toString()}`;
    if (!user) toast.info('Please log in to continue', 'You will come straight back to this train after signing in.');
    navigate(user ? target : `/login?next=${encodeURIComponent(target)}`);
  };

  return (
    <motion.article
      initial={ok ? { opacity: 0, y: 18 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index, 6) * 0.06, ease: [0.2, 0.8, 0.2, 1] }}
      className={`group card overflow-hidden transition-shadow duration-300 hover:shadow-lift ${departed ? 'opacity-80' : ''}`}
    >
      <div data-testid={`train-card-${t.number}`}>
        <div className="p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-lg bg-navy-900 px-2 py-1 font-mono text-xs font-bold text-white">{t.number}</span>
              <h3 className="text-[17px] font-bold tracking-tight">{t.name}</h3>
              {departed && (
                <span className="chip bg-slate-100 text-slate-600 ring-1 ring-slate-300" data-testid={`departed-${t.number}`}>
                  Departed
                </span>
              )}
            </div>
            <RunsOn train={t} />
          </div>

          <div className="mt-5 grid grid-cols-[auto_1fr_auto] items-center gap-4 sm:gap-6">
            <div>
              <p className="text-2xl md:text-[28px] font-extrabold tracking-tight tabular" data-testid={`departure-${t.number}`}>{journey.from.time}</p>
              <p className="mt-0.5 text-sm font-semibold"><span className="font-mono text-navy-700">{journey.from.code}</span> <span className="hidden sm:inline text-muted font-medium">{getStation(journey.from.code)?.name}</span></p>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-muted flex items-center justify-center gap-1"><Clock3 size={13} /> {formatDuration(journey.durationMinutes)}</p>
              <div className="relative my-2 flex items-center">
                <span className="h-2.5 w-2.5 rounded-full border-2 border-navy-500 bg-white" />
                <span className="flex-1 border-t-2 border-dashed border-navy-200" />
                <span className="h-2.5 w-2.5 rounded-full bg-navy-500" />
                <TrainFront size={16} className="absolute left-3 -top-[3px] text-saffron-500 transition-[left] duration-[1600ms] ease-in-out motion-safe:group-hover:left-[calc(100%-28px)]" />
              </div>
              <p className="text-xs text-muted">{halts === 0 ? 'Non-stop' : `${halts} halt${halts > 1 ? 's' : ''}`} · {journey.distanceKm} km</p>
            </div>
            <div className="text-right">
              <p className="text-2xl md:text-[28px] font-extrabold tracking-tight tabular">
                {journey.to.time}
                {journey.arrivalDayOffset > 0 && <sup className="ml-1 rounded bg-saffron-100 px-1 text-[11px] font-bold text-saffron-700">+{journey.arrivalDayOffset}</sup>}
              </p>
              <p className="mt-0.5 text-sm font-semibold"><span className="hidden sm:inline text-muted font-medium">{getStation(journey.to.code)?.name}</span> <span className="font-mono text-navy-700">{journey.to.code}</span></p>
            </div>
          </div>
        </div>

        <div className="border-t border-line bg-mist/70 p-4 md:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {classes.map(({ cls, avail, fare }) => {
              const active = cls === selected;
              return (
                <button
                  key={cls}
                  type="button"
                  onClick={() => setSelected(cls)}
                  className={`relative rounded-xl border bg-white p-3 text-left transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 ${
                    active ? 'border-navy-500 shadow-ring' : 'border-line hover:border-navy-300'
                  }`}
                  data-testid={`class-option-${t.number}-${cls}`}
                  aria-pressed={active}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold">{cls}</span>
                    <span className="text-[11px] font-medium text-muted truncate ml-2">{CLASS_INFO[cls].label.replace(/ \(.*\)$/, '')}</span>
                  </div>
                  <p className={`chip mt-2 ring-1 ${AVAIL_STYLE[avail.kind]}`} data-testid={`availability-${t.number}-${cls}`}>{avail.label}</p>
                  <p className="mt-2 font-extrabold tabular" data-testid={`fare-${t.number}-${cls}`}>{formatINR(fare)}</p>
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              {departed
                ? 'This train has already left the boarding station today.'
                : `${CLASS_INFO[selected].label} · ${QUOTA_LABEL[quota]} quota · adult fare incl. GST`}
            </p>
            <button type="button" onClick={book} disabled={departed || chosen.avail.kind === 'REGRET'} className={`${ctaButton} px-6`} data-testid={`book-btn-${t.number}`}>
              Book Now <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

const BUCKETS = [
  { id: 'early', label: 'Early', range: '00-06', icon: Moon, from: 0, to: 360 },
  { id: 'morning', label: 'Morning', range: '06-12', icon: Sunrise, from: 360, to: 720 },
  { id: 'afternoon', label: 'Afternoon', range: '12-18', icon: Sun, from: 720, to: 1080 },
  { id: 'night', label: 'Night', range: '18-24', icon: Sunset, from: 1080, to: 1440 },
] as const;

type Sort = 'departure' | 'duration' | 'fare';

function DateStrip({ from, to, date, quota }: { from: string; to: string; date: string; quota: Quota }) {
  const navigate = useNavigate();
  const today = toISODate(new Date());
  const max = maxBookingDate(today);
  const startOffset = Math.max(-3, -daysBetween(today, date));
  const days = Array.from({ length: 7 }, (_, i) => addDays(date, startOffset + i));
  const go = (d: string) => navigate(`/trains?${new URLSearchParams({ from, to, date: d, quota }).toString()}`);
  const prev = addDays(date, -1);
  const next = addDays(date, 1);
  return (
    <div className="flex items-stretch gap-2">
      <button type="button" onClick={() => go(prev)} disabled={daysBetween(today, prev) < 0} className="grid w-10 place-items-center rounded-xl bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/20 disabled:opacity-30" aria-label="Previous day">
        <ChevronLeft size={18} />
      </button>
      <div className="grid flex-1 grid-cols-4 sm:grid-cols-7 gap-2">
        {days.map((d, i) => {
          const active = d === date;
          const outside = daysBetween(today, d) < 0 || d > max;
          const count = outside ? 0 : searchTrains(from, to, d).length;
          const [yy, mm, dd] = d.split('-').map(Number);
          const month = new Date(yy, mm - 1, dd).toLocaleDateString('en-IN', { month: 'short' });
          return (
            <button
              key={d}
              type="button"
              disabled={outside}
              onClick={() => go(d)}
              className={`${i > 3 ? 'hidden sm:block' : ''} rounded-xl px-2 py-2 text-center ring-1 transition-colors ${
                active ? 'bg-white text-navy-900 ring-white shadow-lift' : 'bg-white/5 text-navy-100 ring-white/10 hover:bg-white/15'
              } disabled:opacity-30`}
              data-testid={`date-strip-${d}`}
            >
              <span className="block text-[11px] font-semibold uppercase tracking-wide opacity-70">{formatJourneyDate(d).split(',')[0]}</span>
              <span className="block text-base font-extrabold tabular">{String(dd).padStart(2, '0')} {month}</span>
              <span className={`block text-[11px] font-semibold ${active ? (count ? 'text-mint-600' : 'text-rose-500') : count ? 'text-mint-500' : 'text-navy-300'}`}>
                {count ? `${count} train${count > 1 ? 's' : ''}` : 'No trains'}
              </span>
            </button>
          );
        })}
      </div>
      <button type="button" onClick={() => go(next)} disabled={next > max} className="grid w-10 place-items-center rounded-xl bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/20 disabled:opacity-30" aria-label="Next day">
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

function SearchResults({ from, to, date, quota, travelClass }: {
  from: string; to: string; date: string; quota: Quota; travelClass: TravelClass | null;
}) {
  const toast = useToast();
  const ok = useMotionOK();
  const today = toISODate(new Date());
  const problem = validateStations(from, to) ?? validateJourneyDate(date, today) ?? validateQuota(quota, date, today);
  const journeys = useMemo(() => (problem ? [] : searchTrains(from, to, date)), [problem, from, to, date]);
  const bookings = useMemo(() => db.getBookings(), []);
  const [editing, setEditing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState<Sort>('departure');
  const [classes, setClasses] = useState<TravelClass[]>([]);
  const [buckets, setBuckets] = useState<string[]>([]);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [hideDeparted, setHideDeparted] = useState(false);

  useEffect(() => {
    if (problem) toast.error('This search is not valid', problem, lensForMessage(problem));
  }, [problem, toast]);

  const rows = useMemo(() => {
    const enriched = journeys.map((j) => ({ j, info: classInfo(j, date, quota, bookings) }));
    const filtered = enriched.filter(({ j, info }) => {
      const dep = toMinutes(j.from.time);
      if (classes.length && !info.some((c) => classes.includes(c.cls))) return false;
      if (buckets.length && !BUCKETS.some((b) => buckets.includes(b.id) && dep >= b.from && dep < b.to)) return false;
      if (availableOnly && !info.some((c) => c.avail.kind === 'CNF' || c.avail.kind === 'RAC')) return false;
      if (hideDeparted && hasDeparted(date, j.from.time, Date.now())) return false;
      return true;
    });
    const minFare = (info: ClassInfo[]) => Math.min(...info.map((c) => c.fare));
    return filtered.sort((a, b) =>
      sort === 'duration' ? a.j.durationMinutes - b.j.durationMinutes : sort === 'fare' ? minFare(a.info) - minFare(b.info) : toMinutes(a.j.from.time) - toMinutes(b.j.from.time),
    );
  }, [journeys, date, quota, bookings, classes, buckets, availableOnly, hideDeparted, sort]);

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const activeFilters = classes.length + buckets.length + (availableOnly ? 1 : 0) + (hideDeparted ? 1 : 0);
  const clearFilters = () => {
    setClasses([]);
    setBuckets([]);
    setAvailableOnly(false);
    setHideDeparted(false);
  };

  const filters = (
    <div className="card p-5 space-y-6 text-sm">
      <div>
        <p className="label">Sort by</p>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-mist p-1">
          {(['departure', 'duration', 'fare'] as Sort[]).map((s) => (
            <button key={s} type="button" onClick={() => setSort(s)} className={`rounded-lg py-1.5 font-semibold capitalize transition-colors ${sort === s ? 'bg-white text-navy-900 shadow-card' : 'text-muted hover:text-ink'}`} data-testid={`sort-${s}`}>
              {s === 'fare' ? 'Price' : s}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="label">Journey class</p>
        <div className="flex flex-wrap gap-2">
          {CLASS_ORDER.map((c) => (
            <button key={c} type="button" onClick={() => setClasses(toggle(classes, c))} className={`chip border font-mono ${classes.includes(c) ? 'border-navy-600 bg-navy-600 text-white' : 'border-line bg-white text-ink hover:border-navy-300'}`} data-testid={`filter-class-${c}`}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="label">Departure time</p>
        <div className="grid grid-cols-2 gap-2">
          {BUCKETS.map(({ id, label, range, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setBuckets(toggle(buckets, id))} className={`rounded-xl border p-2.5 text-left transition-colors ${buckets.includes(id) ? 'border-navy-500 bg-navy-50' : 'border-line bg-white hover:border-navy-300'}`} data-testid={`filter-time-${id}`}>
              <Icon size={16} className={buckets.includes(id) ? 'text-navy-600' : 'text-muted'} />
              <span className="mt-1 block font-semibold">{label}</span>
              <span className="block text-xs text-muted">{range}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {[
          { label: 'Only trains with CNF / RAC seats', value: availableOnly, set: setAvailableOnly, id: 'available' },
          { label: 'Hide departed trains', value: hideDeparted, set: setHideDeparted, id: 'departed' },
        ].map((t) => (
          <label key={t.id} className="flex cursor-pointer items-center justify-between gap-3 font-medium">
            {t.label}
            <button type="button" role="switch" aria-checked={t.value} onClick={() => t.set(!t.value)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${t.value ? 'bg-mint-500' : 'bg-slate-300'}`} data-testid={`filter-${t.id}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] duration-200 ${t.value ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </label>
        ))}
      </div>
      {activeFilters > 0 && (
        <button type="button" onClick={clearFilters} className="btn-ghost w-full">Clear {activeFilters} filter{activeFilters > 1 ? 's' : ''}</button>
      )}
    </div>
  );

  return (
    <PageShell
      wide
      eyebrow={problem ? 'Search' : `${formatJourneyDate(date)} · ${QUOTA_LABEL[quota]} quota`}
      title={`${getStation(from)?.name ?? from} → ${getStation(to)?.name ?? to}`}
      subtitle={problem ? undefined : <span className="font-mono text-sm">{from} · {to}</span>}
      aside={
        <button type="button" onClick={() => setEditing(!editing)} className="btn rounded-full bg-white/10 px-4 py-2 text-white ring-1 ring-white/15 hover:bg-white/20" data-testid="modify-search">
          <Search size={16} /> {editing ? 'Close' : 'Modify search'}
        </button>
      }
      below={problem ? undefined : <DateStrip from={from} to={to} date={date} quota={quota} />}
    >
      <AnimatePresence initial={false}>
        {(editing || problem) && (
          <motion.div initial={ok ? { opacity: 0, y: -8 } : false} animate={{ opacity: 1, y: 0 }} exit={ok ? { opacity: 0, y: -8 } : { opacity: 0, transition: { duration: 0 } }} className="card mb-6 p-5 md:p-6">
            <SearchForm key={`${from}${to}${date}${quota}`} initial={{ from, to, date, quota, travelClass: travelClass ?? '' }} />
          </motion.div>
        )}
      </AnimatePresence>

      {problem ? (
        <Alert testId="search-error">{problem}</Alert>
      ) : journeys.length === 0 ? (
        <div className="card p-10 text-center">
          <TrainFront size={40} className="mx-auto text-navy-200" />
          <div className="mx-auto mt-4 max-w-lg">
            <Alert kind="info" testId="no-trains">
              No trains found from {stationLabel(from)} to {stationLabel(to)} on {formatJourneyDate(date)}. Try another date.
            </Alert>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <button type="button" onClick={() => setShowFilters(!showFilters)} className="btn-secondary mb-3 w-full lg:hidden">
              <SlidersHorizontal size={16} /> Filters &amp; sort {activeFilters > 0 && `(${activeFilters})`}
            </button>
            <div className={showFilters ? 'block' : 'hidden lg:block'}>{filters}</div>
          </aside>
          <div className="space-y-5" data-testid="results-list">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="chip bg-white text-ink ring-1 ring-line" data-testid="results-count">{journeys.length} train(s) found</p>
              {rows.length !== journeys.length && <p className="text-sm text-muted">{rows.length} shown after filters</p>}
            </div>
            {rows.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="font-semibold">No trains match your filters.</p>
                <button type="button" onClick={clearFilters} className="btn-secondary mt-4">Clear filters</button>
              </div>
            ) : (
              rows.map(({ j, info }, i) => (
                <TrainCard key={j.train.number} journey={j} date={date} quota={quota} preferred={travelClass} classes={info} index={i} />
              ))
            )}
          </div>
        </div>
      )}
    </PageShell>
  );
}

function AllTrains() {
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const q = filter.trim().toLowerCase();
  const rows = TRAINS.filter((t) => t.number.includes(q) || t.name.toLowerCase().includes(q));

  return (
    <PageShell title="All Trains" subtitle="Complete timetable of the RailReserve network - click a train to see every stop." wide>
      <Reveal>
        <div className="card p-4 mb-5">
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by train number or name..."
              className={`${inputClass} pl-10`}
              data-testid="trains-filter"
              aria-label="Filter trains"
            />
          </div>
        </div>
      </Reveal>
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm" data-testid="trains-table">
          <thead className="bg-mist text-[11px] uppercase tracking-wider text-muted">
            <tr>
              {['Train', 'Route', 'Departs', 'Arrives', 'Runs', 'Classes', ''].map((h) => (
                <th key={h} className="px-4 py-3 font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const first = t.stops[0];
              const last = t.stops[t.stops.length - 1];
              const expanded = open === t.number;
              return (
                <Fragment key={t.number}>
                  <tr
                    className={`cursor-pointer border-t border-line transition-colors hover:bg-navy-50/60 ${expanded ? 'bg-navy-50/60' : ''}`}
                    onClick={() => setOpen(expanded ? null : t.number)}
                    data-testid={`train-row-${t.number}`}
                  >
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="mr-2 rounded-md bg-navy-900 px-1.5 py-0.5 font-mono text-xs font-bold text-white">{t.number}</span>
                      <span className="font-semibold">{t.name}</span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs font-bold text-navy-700 whitespace-nowrap">{first.code} → {last.code}</td>
                    <td className="px-4 py-3.5 font-semibold tabular">{first.time}</td>
                    <td className="px-4 py-3.5 font-semibold tabular whitespace-nowrap">
                      {last.time}
                      {last.day > 0 && <sup className="ml-1 rounded bg-saffron-100 px-1 text-[10px] font-bold text-saffron-700">+{last.day}</sup>}
                    </td>
                    <td className="px-4 py-3.5"><RunsOn train={t} /></td>
                    <td className="px-4 py-3.5 font-mono text-xs">{CLASS_ORDER.filter((c) => t.classes[c]).join(' · ')}</td>
                    <td className="px-4 py-3.5 text-muted"><ChevronDown size={16} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} /></td>
                  </tr>
                  {expanded && (
                    <tr className="bg-navy-50/40" data-testid={`train-stops-${t.number}`}>
                      <td colSpan={7} className="px-6 pb-5 pt-2">
                        <ol className="relative ml-2 border-l-2 border-dashed border-navy-200">
                          {t.stops.map((s, i) => (
                            <li key={s.code} className="relative pl-6 py-1.5">
                              <span className={`absolute -left-[7px] top-2.5 h-3 w-3 rounded-full ${i === 0 || i === t.stops.length - 1 ? 'bg-saffron-500' : 'border-2 border-navy-400 bg-white'}`} />
                              <span className="font-mono text-xs font-bold text-navy-700 mr-2">{s.time}{s.day > 0 ? ` (+${s.day})` : ''}</span>
                              <span className="font-semibold">{stationLabel(s.code)}</span>
                              <span className="ml-2 text-xs text-muted">{s.km} km</span>
                            </li>
                          ))}
                        </ol>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {rows.length === 0 && (
              <tr className="border-t border-line">
                <td colSpan={7} className="px-4 py-8 text-center font-semibold text-muted" data-testid="no-trains">No matching trains found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-6 text-sm text-muted">
        To book, <Link to="/" className="link">search by route and date</Link>.
      </p>
    </PageShell>
  );
}

export default function TrainResults() {
  const [params] = useSearchParams();
  const from = params.get('from');
  const to = params.get('to');
  const date = params.get('date');
  if (from === null && to === null && date === null) return <AllTrains />;

  const quota: Quota = params.get('quota') === 'TQ' ? 'TQ' : 'GN';
  const cls = params.get('class');
  const travelClass = cls && cls in CLASS_INFO ? (cls as TravelClass) : null;
  return <SearchResults from={from ?? ''} to={to ?? ''} date={date ?? ''} quota={quota} travelClass={travelClass} />;
}
