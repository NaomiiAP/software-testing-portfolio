/**
 * Station autocomplete (type a code, name or city). Accessible combobox:
 * ↑/↓ to move, Enter to choose, Esc to close.
 *
 * Test hooks: the input carries data-testid={testId} and data-code={value};
 * each option is `${testId}-option-${CODE}`.
 */
import { AnimatePresence, motion } from 'framer-motion';
import { MapPin, TrainFront } from 'lucide-react';
import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { STATIONS, getStation, type Station } from '../data/stations';
import { useMotionOK } from './motion';

const POPULAR = ['NDLS', 'MMCT', 'CSMT', 'HWH', 'MAS', 'SBC', 'SC', 'PUNE'];

function rank(s: Station, q: string): number {
  const code = s.code.toLowerCase();
  if (code === q) return 0;
  if (code.startsWith(q)) return 1;
  if (s.name.toLowerCase().startsWith(q) || s.city.toLowerCase().startsWith(q)) return 2;
  return 3;
}

export default function StationPicker({
  label,
  value,
  onChange,
  placeholder,
  testId,
  icon = 'from',
}: {
  label: string;
  value: string;
  onChange: (code: string) => void;
  placeholder: string;
  testId: string;
  icon?: 'from' | 'to';
}) {
  const ok = useMotionOK();
  const listId = useId();
  const inputId = useId();
  const selected = getStation(value);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return POPULAR.map((c) => getStation(c)!).filter(Boolean);
    return STATIONS.filter(
      (s) => s.code.toLowerCase().startsWith(q) || s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q),
    ).sort((a, b) => rank(a, q) - rank(b, q) || a.name.localeCompare(b.name));
  }, [query]);

  const choose = (s: Station) => {
    onChange(s.code);
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && open && options[active]) {
      e.preventDefault();
      choose(options[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const Icon = icon === 'from' ? TrainFront : MapPin;

  return (
    <div className="relative">
      <label htmlFor={inputId} className="label">
        {label}
      </label>
      <div className="relative">
        <Icon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          className="field pl-10 pr-16 font-semibold"
          placeholder={placeholder}
          value={open ? query : selected?.name ?? ''}
          onFocus={() => {
            setOpen(true);
            setQuery('');
            setActive(0);
          }}
          onBlur={() => setOpen(false)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          data-testid={testId}
          data-code={value}
        />
        {selected && !open && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-navy-50 px-1.5 py-0.5 font-mono text-[11px] font-bold text-navy-700">
            {selected.code}
          </span>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.ul
            id={listId}
            role="listbox"
            initial={ok ? { opacity: 0, y: -6, scale: 0.98 } : false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={ok ? { opacity: 0, y: -6, transition: { duration: 0.12 } } : { opacity: 0, transition: { duration: 0 } }}
            transition={{ duration: 0.16 }}
            className="absolute z-40 mt-2 w-full min-w-[260px] max-h-80 overflow-auto rounded-2xl border border-line bg-white p-1.5 shadow-lift"
          >
            {!query && <li className="px-3 pt-1.5 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted">Popular stations</li>}
            {options.length === 0 && <li className="px-3 py-3 text-sm text-muted">No station matches “{query}”</li>}
            {options.map((s, i) => (
              <li
                key={s.code}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(s)}
                className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ${i === active ? 'bg-navy-50' : ''}`}
                data-testid={`${testId}-option-${s.code}`}
              >
                <span className="w-12 shrink-0 rounded-lg bg-navy-900 py-1 text-center font-mono text-[11px] font-bold text-white">{s.code}</span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-sm text-ink">{s.name}</span>
                  <span className="block text-xs text-muted">{s.city}</span>
                </span>
                {s.code === value && <span className="ml-auto text-xs font-bold text-mint-600">Selected</span>}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
