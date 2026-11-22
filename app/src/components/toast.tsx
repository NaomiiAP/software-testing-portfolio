/**
 * Toast notifications for every user action.
 *
 * "Testing lens" (on by default, toggled in the Demo panel) adds a small chip to
 * each toast naming the test-design technique and test-case id the action
 * exercises - e.g. "BVA · today − 1 · TC_BVA_DATE_01" - so a live demo can be
 * narrated without opening the test documents.
 */
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, FlaskConical, Info, X, XCircle } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useMotionOK } from './motion';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface ToastInput {
  title: string;
  description?: ReactNode;
  /** technique / test-case annotation shown when the testing lens is on */
  meta?: string;
  duration?: number;
}

interface ToastItem extends ToastInput {
  id: number;
  kind: ToastKind;
  duration: number;
}

export interface ToastApi {
  show: (kind: ToastKind, input: ToastInput) => void;
  success: (title: string, description?: ReactNode, meta?: string) => void;
  error: (title: string, description?: ReactNode, meta?: string) => void;
  info: (title: string, description?: ReactNode, meta?: string) => void;
  warning: (title: string, description?: ReactNode, meta?: string) => void;
  lens: boolean;
  setLens: (on: boolean) => void;
}

const LENS_KEY = 'rr.lens';
const MAX_VISIBLE = 3;

const noop = () => {};
const NOOP_API: ToastApi = { show: noop, success: noop, error: noop, info: noop, warning: noop, lens: false, setLens: noop };

const ToastContext = createContext<ToastApi | null>(null);

/** Works without a provider (e.g. isolated component tests): calls become no-ops. */
// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastApi {
  return useContext(ToastContext) ?? NOOP_API;
}

function readLens(): boolean {
  try {
    return localStorage.getItem(LENS_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [lens, setLensState] = useState(readLens);
  const nextId = useRef(1);
  const recent = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), []);

  const show = useCallback((kind: ToastKind, input: ToastInput) => {
    // React StrictMode runs effects twice in development - drop identical toasts within 1 s.
    const key = `${kind}|${input.title}|${typeof input.description === 'string' ? input.description : ''}`;
    const now = Date.now();
    if ((recent.current.get(key) ?? 0) > now - 1000) return;
    recent.current.set(key, now);
    const duration = input.duration ?? (kind === 'error' || kind === 'warning' ? 6500 : 4800);
    const item: ToastItem = { ...input, kind, duration, id: nextId.current++ };
    setItems((list) => [...list.slice(-(MAX_VISIBLE - 1)), item]);
  }, []);

  const setLens = useCallback((on: boolean) => {
    setLensState(on);
    try {
      localStorage.setItem(LENS_KEY, on ? 'on' : 'off');
    } catch {
      /* ignore */
    }
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (title, description, meta) => show('success', { title, description, meta }),
      error: (title, description, meta) => show('error', { title, description, meta }),
      info: (title, description, meta) => show('info', { title, description, meta }),
      warning: (title, description, meta) => show('warning', { title, description, meta }),
      lens,
      setLens,
    }),
    [show, lens, setLens],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(<ToastViewport items={items} lens={lens} onDismiss={dismiss} />, document.body)}
    </ToastContext.Provider>
  );
}

const KIND_STYLE: Record<ToastKind, { icon: typeof Info; tint: string; bar: string }> = {
  success: { icon: CheckCircle2, tint: 'text-mint-600 bg-mint-50', bar: 'bg-mint-500' },
  error: { icon: XCircle, tint: 'text-rose-600 bg-rose-50', bar: 'bg-rose-500' },
  info: { icon: Info, tint: 'text-navy-600 bg-navy-50', bar: 'bg-navy-500' },
  warning: { icon: AlertTriangle, tint: 'text-amber-700 bg-amber-50', bar: 'bg-amber-500' },
};

function ToastViewport({ items, lens, onDismiss }: { items: ToastItem[]; lens: boolean; onDismiss: (id: number) => void }) {
  const ok = useMotionOK();
  return (
    <ol
      className="fixed z-[70] top-[76px] right-3 left-3 sm:left-auto sm:w-[380px] flex flex-col gap-2.5 pointer-events-none"
      aria-live="polite"
      data-testid="toast-viewport"
    >
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <motion.li
            key={t.id}
            layout={ok}
            initial={ok ? { opacity: 0, x: 48, scale: 0.96 } : false}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={ok ? { opacity: 0, x: 48, transition: { duration: 0.18 } } : { opacity: 0, transition: { duration: 0 } }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          >
            <ToastCard item={t} lens={lens} onDismiss={onDismiss} animateBar={ok} />
          </motion.li>
        ))}
      </AnimatePresence>
    </ol>
  );
}

function ToastCard({ item, lens, onDismiss, animateBar }: { item: ToastItem; lens: boolean; onDismiss: (id: number) => void; animateBar: boolean }) {
  // Toasts are click-through (they never block the form underneath); only the close button takes clicks.
  const paused = false;
  const remaining = useRef(item.duration);
  const startedAt = useRef(0);
  const { icon: Icon, tint, bar } = KIND_STYLE[item.kind];

  useEffect(() => {
    if (paused) return;
    startedAt.current = Date.now();
    const timer = setTimeout(() => onDismiss(item.id), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - startedAt.current;
    };
  }, [paused, item.id, onDismiss]);

  return (
    <div
      className="pointer-events-none relative overflow-hidden rounded-2xl bg-white/95 backdrop-blur border border-line shadow-lift"
      role={item.kind === 'error' ? 'alert' : 'status'}
      data-testid="toast"
      data-kind={item.kind}
    >
      <div className="flex gap-3 p-3.5 pr-10">
        <span className={`shrink-0 h-9 w-9 rounded-xl grid place-items-center ${tint}`}>
          <Icon size={19} strokeWidth={2.4} />
        </span>
        <div className="min-w-0">
          <p className="font-bold text-sm text-ink leading-snug" data-testid="toast-title">{item.title}</p>
          {item.description && <div className="text-[13px] text-muted mt-0.5 leading-snug">{item.description}</div>}
          {lens && item.meta && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-navy-50 border border-navy-100 px-1.5 py-0.5 font-mono text-[10.5px] font-medium text-navy-700" data-testid="toast-lens">
              <FlaskConical size={11} /> {item.meta}
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        className="pointer-events-auto absolute top-2.5 right-2.5 h-7 w-7 grid place-items-center rounded-lg text-muted hover:bg-mist hover:text-ink"
        aria-label="Dismiss notification"
      >
        <X size={15} />
      </button>
      <span
        className={`absolute bottom-0 left-0 h-[3px] w-full origin-left ${bar}`}
        style={animateBar ? { animation: `toastbar ${item.duration}ms linear forwards`, animationPlayState: paused ? 'paused' : 'running' } : undefined}
      />
    </div>
  );
}
