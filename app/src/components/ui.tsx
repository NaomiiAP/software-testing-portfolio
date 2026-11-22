import { motion } from 'framer-motion';
import { AlertCircle, Check, CheckCircle2, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { STATUS_LABEL, type TicketStatus } from '../lib/ticketState';
import { useMotionOK } from './motion';

export const inputClass = 'field';
export const primaryButton = 'btn-primary';
export const ctaButton = 'btn-primary';
export const secondaryButton = 'btn-secondary';
export const dangerButton = 'btn-danger';
export const darkButton = 'btn-dark';

/** Navy header band with the page title; the content overlaps it. */
export function PageShell({
  title,
  subtitle,
  eyebrow,
  aside,
  below,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  aside?: ReactNode;
  below?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  const width = wide ? 'max-w-7xl' : 'max-w-6xl';
  return (
    <div>
      <section className="relative overflow-hidden bg-navy-900 text-white">
        <div className="absolute inset-0 hero-grid opacity-70" aria-hidden="true" />
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-saffron-500/25 blur-3xl motion-safe:animate-drift" aria-hidden="true" />
        <div className="absolute -bottom-32 left-10 h-72 w-72 rounded-full bg-navy-500/30 blur-3xl motion-safe:animate-drift [animation-delay:-6s]" aria-hidden="true" />
        <div className={`relative container mx-auto ${width} px-4 pt-9 pb-20`}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              {eyebrow && <div className="mb-2 text-sm font-semibold text-saffron-300">{eyebrow}</div>}
              <h1 className="text-3xl md:text-[2.6rem] font-extrabold tracking-tight leading-tight" data-testid="page-title">{title}</h1>
              {subtitle && <div className="mt-2 text-navy-200 font-medium">{subtitle}</div>}
            </div>
            {aside}
          </div>
          {below && <div className="mt-6">{below}</div>}
        </div>
      </section>
      <div className={`relative container mx-auto ${width} px-4 -mt-12 pb-16`}>{children}</div>
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function Field({
  label,
  htmlFor,
  error,
  errorTestId,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string | null;
  errorTestId?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="label">
        {label}
      </label>
      {children}
      {error && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-rose-600" role="alert" data-testid={errorTestId}>
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

export function Alert({ kind = 'error', children, testId }: { kind?: 'error' | 'success' | 'info'; children: ReactNode; testId?: string }) {
  const style = {
    error: { box: 'bg-rose-50 border-rose-100 text-rose-700', Icon: AlertCircle },
    success: { box: 'bg-mint-50 border-mint-100 text-mint-700', Icon: CheckCircle2 },
    info: { box: 'bg-navy-50 border-navy-100 text-navy-700', Icon: Info },
  }[kind];
  const Icon = style.Icon;
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium ${style.box}`} role={kind === 'error' ? 'alert' : 'status'} data-testid={testId}>
      <Icon size={18} className="shrink-0 mt-px" />
      <div>{children}</div>
    </div>
  );
}

const STATUS_STYLE: Record<TicketStatus, { chip: string; dot: string; pulse: boolean }> = {
  CNF: { chip: 'bg-mint-50 text-mint-700 ring-mint-500/25', dot: 'bg-mint-500', pulse: false },
  RAC: { chip: 'bg-amber-50 text-amber-700 ring-amber-500/30', dot: 'bg-amber-500', pulse: true },
  WL: { chip: 'bg-rose-50 text-rose-700 ring-rose-500/25', dot: 'bg-rose-500', pulse: true },
  CAN: { chip: 'bg-slate-100 text-slate-600 ring-slate-400/30', dot: 'bg-slate-400', pulse: false },
};

export function StatusBadge({ status, testId }: { status: TicketStatus; testId?: string }) {
  const s = STATUS_STYLE[status];
  return (
    <span className={`chip ring-1 ${s.chip}`} data-testid={testId} data-status={status}>
      <span className="relative flex h-2 w-2" aria-hidden="true">
        {s.pulse && <span className={`absolute inset-0 rounded-full ${s.dot} motion-safe:animate-pulse-ring`} />}
        <span className={`relative h-2 w-2 rounded-full ${s.dot}`} />
      </span>
      {STATUS_LABEL[status]}
    </span>
  );
}

const STEPS = ['Search', 'Passengers', 'Payment', 'E-ticket'];

/** Booking progress: Search → Passengers → Payment → E-ticket. */
export function Stepper({ current }: { current: number }) {
  const ok = useMotionOK();
  return (
    <ol className="flex items-center gap-2 sm:gap-3 text-sm" aria-label="Booking progress">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-2 sm:gap-3">
            <span className={`flex items-center gap-2 font-semibold ${active ? 'text-white' : done ? 'text-navy-200' : 'text-navy-300/60'}`}>
              <span
                className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ring-1 ${
                  done ? 'bg-mint-500 text-white ring-mint-500' : active ? 'bg-saffron-500 text-white ring-saffron-400 shadow-glow' : 'bg-white/5 text-navy-200 ring-white/15'
                }`}
                aria-current={active ? 'step' : undefined}
              >
                {done ? <Check size={14} strokeWidth={3} /> : i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </span>
            {i < STEPS.length - 1 && (
              <span className="relative h-0.5 w-6 sm:w-12 rounded bg-white/15 overflow-hidden">
                <motion.span
                  className="absolute inset-y-0 left-0 bg-mint-500"
                  initial={ok ? { width: 0 } : false}
                  animate={{ width: done ? '100%' : '0%' }}
                  transition={{ duration: 0.6, delay: 0.15 * i }}
                />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
