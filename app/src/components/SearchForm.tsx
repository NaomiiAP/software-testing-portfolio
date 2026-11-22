import { motion } from 'framer-motion';
import { ArrowRightLeft, CalendarDays, Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { stationLabel } from '../data/stations';
import { searchTrains } from '../data/trains';
import { CLASS_ORDER, QUOTA_LABEL, type Quota } from '../lib/constants';
import { addDays, formatJourneyDate, toISODate } from '../lib/dates';
import { maxBookingDate } from '../lib/reservation';
import { validateJourneyDate, validateQuota, validateStations } from '../lib/validation';
import { LENS, lensForMessage } from './demo/lens';
import { useMotionOK } from './motion';
import StationPicker from './StationPicker';
import { useToast } from './toast';
import { Alert } from './ui';

interface Props {
  initial?: { from?: string; to?: string; date?: string; quota?: Quota; travelClass?: string };
}

const QUICK_DATES = [
  { label: 'Today', offset: 0 },
  { label: 'Tomorrow', offset: 1 },
  { label: 'In a week', offset: 7 },
];

function Segmented<T extends string>({
  name,
  value,
  options,
  onChange,
  testId,
}: {
  name: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  testId: string;
}) {
  const ok = useMotionOK();
  return (
    <div role="radiogroup" aria-label={name} className="inline-flex flex-wrap gap-1 rounded-xl bg-mist p-1" data-testid={testId}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`relative rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${active ? 'text-navy-900' : 'text-muted hover:text-ink'}`}
            data-testid={`${testId}-${o.value || 'ALL'}`}
          >
            {active &&
              (ok ? (
                <motion.span layoutId={`seg-${testId}`} className="absolute inset-0 rounded-lg bg-white shadow-card" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
              ) : (
                <span className="absolute inset-0 rounded-lg bg-white shadow-card" />
              ))}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function SearchForm({ initial = {} }: Props) {
  const navigate = useNavigate();
  const toast = useToast();
  const ok = useMotionOK();
  const today = toISODate(new Date());
  const [from, setFrom] = useState(initial.from ?? '');
  const [to, setTo] = useState(initial.to ?? '');
  const [date, setDate] = useState(initial.date ?? addDays(today, 1));
  const [quota, setQuota] = useState<Quota>(initial.quota ?? 'GN');
  const [travelClass, setTravelClass] = useState(initial.travelClass ?? '');
  const [error, setError] = useState<string | null>(null);
  const [spins, setSpins] = useState(0);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const problem = validateStations(from, to) ?? validateJourneyDate(date, today) ?? validateQuota(quota, date, today);
    setError(problem);
    if (problem) {
      toast.error('Check your search', problem, lensForMessage(problem));
      return;
    }
    const found = searchTrains(from, to, date).length;
    if (found > 0) {
      toast.success(`${found} train${found > 1 ? 's' : ''} found`, `${stationLabel(from)} → ${stationLabel(to)} · ${formatJourneyDate(date)}`, LENS.validSearch);
    } else {
      toast.info('No trains on this date', 'Pick another date from the date strip on the results page.');
    }
    const params = new URLSearchParams({ from, to, date, quota });
    if (travelClass) params.set('class', travelClass);
    navigate(`/trains?${params.toString()}`);
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
    setSpins((s) => s + 1);
  };

  return (
    <form onSubmit={submit} noValidate data-testid="search-form">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr_220px] gap-3 lg:gap-4 items-end">
        <StationPicker label="From" value={from} onChange={setFrom} placeholder="Leaving from (city or code)" testId="from-station" icon="from" />

        <motion.button
          type="button"
          onClick={swap}
          animate={ok ? { rotate: spins * 180 } : undefined}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="mx-auto mb-1 grid h-11 w-11 place-items-center rounded-full border border-line bg-white text-navy-600 shadow-card hover:border-navy-300 hover:text-saffron-600"
          aria-label="Swap stations"
          data-testid="swap-stations"
        >
          <ArrowRightLeft size={18} strokeWidth={2.4} />
        </motion.button>

        <StationPicker label="To" value={to} onChange={setTo} placeholder="Going to (city or code)" testId="to-station" icon="to" />

        <div>
          <label htmlFor="journey-date" className="label">Journey date</label>
          <div className="relative">
            <CalendarDays size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              id="journey-date"
              type="date"
              value={date}
              min={today}
              max={maxBookingDate(today)}
              onChange={(e) => setDate(e.target.value)}
              className="field pl-10 font-semibold"
              data-testid="journey-date"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex flex-wrap gap-1.5">
          {QUICK_DATES.map((q) => {
            const d = addDays(today, q.offset);
            const active = d === date;
            return (
              <button
                key={q.label}
                type="button"
                onClick={() => setDate(d)}
                className={`chip border transition-colors ${active ? 'border-navy-600 bg-navy-600 text-white' : 'border-line bg-white text-muted hover:border-navy-300 hover:text-ink'}`}
                data-testid={`date-chip-${q.offset}`}
              >
                {q.label}
              </button>
            );
          })}
        </div>
        <Segmented
          name="Class"
          value={travelClass}
          onChange={setTravelClass}
          testId="travel-class"
          options={[{ value: '', label: 'All classes' }, ...CLASS_ORDER.map((c) => ({ value: c as string, label: c as string }))]}
        />
        <Segmented
          name="Quota"
          value={quota}
          onChange={setQuota}
          testId="quota"
          options={(Object.keys(QUOTA_LABEL) as Quota[]).map((q) => ({ value: q, label: QUOTA_LABEL[q] }))}
        />
        <button type="submit" className="btn-primary ml-auto w-full sm:w-auto px-7 py-3.5 text-base" data-testid="search-btn">
          <Search size={19} strokeWidth={2.6} /> Search trains
        </button>
      </div>

      {error && (
        <div className="mt-4">
          <Alert testId="search-error">{error}</Alert>
        </div>
      )}
    </form>
  );
}
