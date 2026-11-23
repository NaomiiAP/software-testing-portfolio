import { AnimatePresence, motion } from 'framer-motion';
import { Check, CreditCard, Loader2, Lock, ShieldCheck, Smartphone, Timer } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SuccessCheck, TrainLoader } from '../components/art';
import { ALLOCATION_LENS, lensForMessage } from '../components/demo/lens';
import { useMotionOK } from '../components/motion';
import { useToast } from '../components/toast';
import { Alert, Card, Field, PageShell, Stepper, ctaButton, inputClass } from '../components/ui';
import { stationLabel } from '../data/stations';
import { CLASS_INFO, GENDER_LABEL, QUOTA_LABEL } from '../lib/constants';
import { formatJourneyDate, toISODate } from '../lib/dates';
import { calculateFare, formatINR } from '../lib/fare';
import { BookingError, createBooking } from '../lib/reservation';
import { STATUS_LABEL } from '../lib/ticketState';
import { validateCardExpiry, validateCardNumber, validateCvv, validateUpiId } from '../lib/validation';
import { db } from '../store/db';
import type { PaymentDraft } from './BookTicket';
import { getJourney, getTrain } from '../data/trains';

type Method = 'UPI' | 'CARD';
const HOLD_MS = 10 * 60_000;
const UPI_HANDLES = ['@okaxis', '@okhdfcbank', '@ybl', '@paytm'];
const STAGES = ['Verifying payment', 'Allocating berths', 'Generating PNR'];

function brandOf(digits: string): string {
  if (/^4/.test(digits)) return 'VISA';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard';
  if (/^(60|65|81|82)/.test(digits)) return 'RuPay';
  return 'Card';
}

const formatCard = (raw: string) => raw.replace(/[^\d]/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
const formatExpiry = (raw: string) => {
  const d = raw.replace(/[^\d]/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

function CardPreview({ number, expiry, flipped }: { number: string; expiry: string; flipped: boolean }) {
  const ok = useMotionOK();
  const digits = number.replace(/\s/g, '');
  const shown = (digits + '•'.repeat(16 - digits.length)).replace(/(.{4})/g, '$1 ').trim();
  return (
    <div className="mx-auto h-44 w-full max-w-[300px] [perspective:1000px]">
      <motion.div
        className="relative h-full w-full [transform-style:preserve-3d]"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={ok ? { type: 'spring', stiffness: 160, damping: 20 } : { duration: 0 }}
      >
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-navy-700 via-navy-800 to-navy-950 p-5 text-white shadow-lift [backface-visibility:hidden]">
          <div className="flex items-center justify-between">
            <span className="h-8 w-11 rounded-md bg-gradient-to-br from-amber-100 to-amber-500" />
            <span className="text-sm font-extrabold italic tracking-wide">{brandOf(digits)}</span>
          </div>
          <p className="mt-7 font-mono text-lg tracking-[.14em]">{shown}</p>
          <div className="mt-4 flex justify-between text-[11px] uppercase text-navy-200">
            <span>Card holder</span>
            <span>Expires <b className="ml-1 font-mono text-sm text-white">{expiry || 'MM/YY'}</b></span>
          </div>
        </div>
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-navy-800 to-navy-950 shadow-lift [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <div className="mt-6 h-10 bg-black/70" />
          <div className="mx-5 mt-5 flex h-9 items-center justify-end rounded bg-white/90 px-3 font-mono text-sm text-ink">CVV •••</div>
        </div>
      </motion.div>
    </div>
  );
}

export default function Payment() {
  const navigate = useNavigate();
  const toast = useToast();
  const ok = useMotionOK();
  const [pending] = useState(() => db.getDraft<PaymentDraft>());
  const [method, setMethod] = useState<Method>('UPI');
  const [upi, setUpi] = useState('');
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '' });
  const [cvvFocus, setCvvFocus] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const deadline = (pending?.createdAt ?? now) + HOLD_MS;
  const left = Math.max(0, deadline - now);

  useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [pending]);

  useEffect(() => {
    if (pending && left === 0 && stage === null) {
      db.setDraft(null);
      toast.error('Payment session expired', 'The seat hold has been released. Please search again.');
      navigate('/');
    }
  }, [left, pending, stage, navigate, toast]);

  if (!pending) {
    return (
      <PageShell title="Payment" eyebrow={<Stepper current={2} />}>
        <Card className="p-6">
          <Alert kind="info" testId="no-draft">
            There is no booking in progress. <Link to="/" className="link">Search for trains</Link> to start one.
          </Alert>
        </Card>
      </PageShell>
    );
  }
  const { draft, total } = pending;
  const train = getTrain(draft.trainNumber);
  const journey = train ? getJourney(train, draft.from, draft.to) : null;
  const fare = journey ? calculateFare(journey.distanceKm, draft.travelClass, draft.quota, draft.passengers) : null;

  const pay = async (e: FormEvent) => {
    e.preventDefault();
    const today = toISODate(new Date());
    const errs: Record<string, string | null> =
      method === 'UPI'
        ? { upi: validateUpiId(upi) }
        : { number: validateCardNumber(card.number), expiry: validateCardExpiry(card.expiry, today), cvv: validateCvv(card.cvv) };
    setFieldErrors(errs);
    const firstError = Object.values(errs).find(Boolean);
    if (firstError) {
      toast.error('Payment details invalid', firstError, lensForMessage(firstError));
      return;
    }

    setError(null);
    const step = ok ? 520 : 80;
    for (let i = 0; i < STAGES.length; i++) {
      setStage(i);
      await new Promise((r) => setTimeout(r, step));
    }

    const reference =
      method === 'UPI' ? `UPI-${Date.now().toString(36).toUpperCase()}` : `CARD-XXXX-${card.number.replace(/\D/g, '').slice(-4)}`;
    try {
      const { pnr, commit } = db.reservePNR();
      const bookings = db.getBookings();
      const booking = createBooking(bookings, draft, { method, reference }, pnr, Date.now());
      db.saveBookings([...bookings, booking]);
      commit();
      db.setDraft(null);
      setDone(true);
      const status = booking.status as 'CNF' | 'RAC' | 'WL';
      toast.success(`PNR ${booking.pnr} · ${STATUS_LABEL[status]}`, `${formatINR(booking.fare.total)} paid via ${method}.`, ALLOCATION_LENS[status]);
      await new Promise((r) => setTimeout(r, ok ? 900 : 50));
      navigate(`/ticket/${booking.pnr}`, { state: { justBooked: true } });
    } catch (err) {
      setStage(null);
      const message = err instanceof BookingError ? err.message : 'Payment could not be completed. Please try again.';
      setError(message);
      toast.error('Booking failed - no money was taken', message, lensForMessage(message));
    }
  };

  const mm = String(Math.floor(left / 60_000)).padStart(2, '0');
  const ss = String(Math.floor((left % 60_000) / 1000)).padStart(2, '0');

  return (
    <PageShell
      title="Secure payment"
      eyebrow={<Stepper current={2} />}
      subtitle="Simulated payment gateway - no real money is charged."
      aside={
        <span className={`chip px-3 py-1.5 text-sm ring-1 ${left < 60_000 ? 'bg-rose-500/20 text-rose-100 ring-rose-400/40' : 'bg-white/10 text-white ring-white/15'}`} data-testid="payment-timer">
          <Timer size={15} /> Seats held for <b className="font-mono tabular">{mm}:{ss}</b>
        </span>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <Card className="p-5 md:p-6">
          <div className="relative mb-6 grid grid-cols-2 rounded-xl bg-mist p-1">
            {(['UPI', 'CARD'] as Method[]).map((m) => {
              const active = method === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`relative flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-colors ${active ? 'text-navy-900' : 'text-muted hover:text-ink'}`}
                  data-testid={`pay-method-${m.toLowerCase()}`}
                  aria-pressed={active}
                >
                  {active && (ok ? <motion.span layoutId="pay-tab" className="absolute inset-0 rounded-lg bg-white shadow-card" /> : <span className="absolute inset-0 rounded-lg bg-white shadow-card" />)}
                  <span className="relative flex items-center gap-2">
                    {m === 'UPI' ? <Smartphone size={17} /> : <CreditCard size={17} />}
                    {m === 'UPI' ? 'UPI' : 'Debit / Credit card'}
                  </span>
                </button>
              );
            })}
          </div>

          <form onSubmit={pay} noValidate className="space-y-5">
            {method === 'UPI' ? (
              <div className="space-y-3">
                <Field label="UPI ID" htmlFor="upi-id" error={fieldErrors.upi} errorTestId="pay-error-upi">
                  <input id="upi-id" value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="yourname@bank" className={`${inputClass} font-mono`} aria-invalid={!!fieldErrors.upi} data-testid="upi-id" />
                </Field>
                <div className="flex flex-wrap gap-2">
                  {UPI_HANDLES.map((h) => (
                    <button key={h} type="button" onClick={() => setUpi((v) => (v.split('@')[0] || 'yourname') + h)} className="chip border border-line bg-white font-mono text-muted hover:border-navy-300 hover:text-ink">
                      {h}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted">A collect request would be sent to your UPI app. In this demo the payment is approved instantly.</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-[1fr_300px] md:items-center">
                <div className="space-y-4">
                  <Field label="Card number" htmlFor="card-number" error={fieldErrors.number} errorTestId="pay-error-card">
                    <input id="card-number" inputMode="numeric" value={card.number} onChange={(e) => setCard({ ...card, number: formatCard(e.target.value) })} placeholder="4111 1111 1111 1111" className={`${inputClass} font-mono tracking-wider`} aria-invalid={!!fieldErrors.number} data-testid="card-number" />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Expiry (MM/YY)" htmlFor="card-expiry" error={fieldErrors.expiry} errorTestId="pay-error-expiry">
                      <input id="card-expiry" value={card.expiry} onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })} placeholder="12/28" className={`${inputClass} font-mono`} aria-invalid={!!fieldErrors.expiry} data-testid="card-expiry" />
                    </Field>
                    <Field label="CVV" htmlFor="card-cvv" error={fieldErrors.cvv} errorTestId="pay-error-cvv">
                      <input id="card-cvv" type="password" inputMode="numeric" maxLength={3} value={card.cvv} onFocus={() => setCvvFocus(true)} onBlur={() => setCvvFocus(false)} onChange={(e) => setCard({ ...card, cvv: e.target.value })} className={`${inputClass} font-mono`} aria-invalid={!!fieldErrors.cvv} data-testid="card-cvv" />
                    </Field>
                  </div>
                </div>
                <CardPreview number={card.number} expiry={card.expiry} flipped={cvvFocus} />
              </div>
            )}
            {error && <Alert testId="pay-error">{error}</Alert>}
            <button type="submit" disabled={stage !== null} className={`${ctaButton} w-full py-4 text-base`} data-testid="pay-btn">
              <Lock size={18} /> Pay {formatINR(total)}
            </button>
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted"><ShieldCheck size={14} /> 256-bit encrypted · demonstration only, no real payment is taken</p>
          </form>
        </Card>

        <Card className="p-5 h-fit lg:sticky lg:top-24">
          <h2 className="font-bold">Order summary</h2>
          <div className="mt-4 rounded-xl bg-mist p-4 text-sm">
            <p className="font-bold"><span className="font-mono text-navy-700">{draft.trainNumber}</span> · {train?.name}</p>
            <p className="mt-1 text-muted">{stationLabel(draft.from)} → {stationLabel(draft.to)}</p>
            <p className="mt-1 text-muted">{formatJourneyDate(draft.date)} · {CLASS_INFO[draft.travelClass].label} · {QUOTA_LABEL[draft.quota]}</p>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {draft.passengers.map((p, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="truncate">{p.name} <span className="text-muted">· {p.age} {GENDER_LABEL[p.gender][0]}</span></span>
                <span className="font-semibold tabular">{fare ? formatINR(fare.lines[i].total) : ''}</span>
              </li>
            ))}
            {fare && <li className="flex justify-between text-muted"><span>Convenience fee</span><span className="tabular">{formatINR(fare.convenienceFee)}</span></li>}
          </ul>
          <div className="mt-4 flex items-baseline justify-between border-t border-dashed border-line pt-4">
            <span className="font-bold">Total</span>
            <span className="text-2xl font-extrabold tracking-tight tabular" data-testid="payment-total">{formatINR(total)}</span>
          </div>
        </Card>
      </div>

      <AnimatePresence>
        {stage !== null && (
          <motion.div
            className="fixed inset-0 z-[80] grid place-items-center bg-navy-950/70 p-4 backdrop-blur-sm"
            initial={ok ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            exit={ok ? { opacity: 0 } : { opacity: 0, transition: { duration: 0 } }}
            data-testid="payment-processing"
          >
            <motion.div initial={ok ? { scale: 0.92, y: 10 } : false} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-lift">
              {done ? <div className="grid place-items-center"><SuccessCheck /></div> : <TrainLoader />}
              <h3 className="mt-3 text-lg font-extrabold">{done ? 'Payment successful' : 'Processing payment…'}</h3>
              <ul className="mt-4 space-y-2 text-left text-sm">
                {STAGES.map((s, i) => (
                  <li key={s} className="flex items-center gap-2.5">
                    {done || i < stage ? (
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-mint-500 text-white"><Check size={12} strokeWidth={3} /></span>
                    ) : i === stage ? (
                      <Loader2 size={20} className="text-saffron-500 motion-safe:animate-spin" />
                    ) : (
                      <span className="h-5 w-5 rounded-full border-2 border-line" />
                    )}
                    <span className={i <= stage || done ? 'font-semibold text-ink' : 'text-muted'}>{s}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
