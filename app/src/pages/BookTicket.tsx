import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Clock3, FlaskConical, Mail, Phone, Plus, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CONCESSION_RULE, LENS, lensForMessage } from '../components/demo/lens';
import { clearPrefill, readPrefill } from '../components/demo/demoStore';
import { CountUp, useMotionOK } from '../components/motion';
import { useToast } from '../components/toast';
import { Alert, Card, Field, PageShell, StatusBadge, Stepper, ctaButton, inputClass, secondaryButton } from '../components/ui';
import { getStation, stationLabel } from '../data/stations';
import { formatDuration, getJourney, getTrain } from '../data/trains';
import {
  CHILD_FREE_BELOW_AGE,
  CHILD_MAX_AGE,
  CLASS_INFO,
  GENDER_LABEL,
  MAX_PASSENGERS,
  QUOTA_LABEL,
  type Gender,
  type Quota,
  type TravelClass,
} from '../lib/constants';
import { addDays, formatJourneyDate } from '../lib/dates';
import { calculateFare, formatINR, getConcession } from '../lib/fare';
import { availability, BOOKING_MESSAGES, decideStatus, hasDeparted, occupancy, type BookingDraft } from '../lib/reservation';
import {
  validateAge,
  validateEmail,
  validateGender,
  validateMobile,
  validatePassenger,
  type PassengerErrors,
  type PassengerForm,
} from '../lib/validation';
import { useAuth } from '../store/AuthContext';
import { db } from '../store/db';

export interface PaymentDraft {
  draft: BookingDraft;
  total: number;
  /** epoch ms - the seat hold / payment session starts here */
  createdAt: number;
}

const EMPTY: PassengerForm = { name: '', age: '', gender: '' };

export default function BookTicket() {
  const { trainNumber = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const ok = useMotionOK();

  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const date = params.get('date') ?? '';
  const travelClass = (params.get('class') ?? '') as TravelClass;
  const quota: Quota = params.get('quota') === 'TQ' ? 'TQ' : 'GN';

  const train = getTrain(trainNumber);
  const journey = train ? getJourney(train, from, to) : null;
  const inventory = train?.classes[travelClass];

  const [passengers, setPassengers] = useState<PassengerForm[]>(() => readPrefill() ?? [{ ...EMPTY }]);
  const [errors, setErrors] = useState<PassengerErrors[]>([]);
  const [mobile, setMobile] = useState(user?.mobile ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [contactErrors, setContactErrors] = useState<{ mobile?: string; email?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => clearPrefill(), []);

  // Live fare for the passengers whose age and gender are already valid.
  const fare = useMemo(() => {
    if (!journey || !inventory) return null;
    const ready = passengers.filter((p) => !validateAge(p.age) && !validateGender(p.gender));
    if (ready.length === 0) return null;
    return calculateFare(journey.distanceKm, travelClass, quota, ready.map((p) => ({ age: Number(p.age), gender: p.gender as Gender })));
  }, [journey, inventory, passengers, travelClass, quota]);

  const problem = !train
    ? BOOKING_MESSAGES.trainNotFound
    : !journey
      ? BOOKING_MESSAGES.routeNotServed
      : !inventory || !date
        ? BOOKING_MESSAGES.classNotAvailable
        : hasDeparted(date, journey.from.time, Date.now())
          ? BOOKING_MESSAGES.departed
          : null;
  if (problem || !train || !journey || !inventory) {
    return (
      <PageShell title="Book ticket" eyebrow={<Stepper current={1} />}>
        <Card className="p-6">
          <Alert testId="booking-error">
            {problem}. <Link to="/" className="link">Start a new search</Link>
          </Alert>
        </Card>
      </PageShell>
    );
  }

  const occ = occupancy(db.getBookings(), { trainNumber, runDate: addDays(date, -journey.from.day), travelClass });
  const avail = availability(inventory, occ);
  const seatsNeeded = passengers.filter((p) => !validateAge(p.age) && Number(p.age) >= CHILD_FREE_BELOW_AGE).length;
  const expected = seatsNeeded > 0 ? decideStatus(seatsNeeded, inventory, occ) : null;

  const update = (i: number, field: keyof PassengerForm, value: string) =>
    setPassengers((list) => list.map((p, k) => (k === i ? { ...p, [field]: value } : p)));

  const addPassenger = () => {
    if (passengers.length >= MAX_PASSENGERS) return;
    const next = [...passengers, { ...EMPTY }];
    setPassengers(next);
    if (next.length === MAX_PASSENGERS) toast.info('Maximum reached', `A single booking can have at most ${MAX_PASSENGERS} passengers.`, LENS.maxPassengers);
  };

  const removePassenger = (i: number) => {
    setPassengers(passengers.filter((_, k) => k !== i));
    setErrors(errors.filter((_, k) => k !== i));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const pErrors = passengers.map(validatePassenger);
    const cErrors = { mobile: validateMobile(mobile) ?? undefined, email: validateEmail(email) ?? undefined };
    setErrors(pErrors);
    setContactErrors(cErrors);
    const count = pErrors.reduce((n, x) => n + Object.keys(x).length, 0) + (cErrors.mobile ? 1 : 0) + (cErrors.email ? 1 : 0);
    if (count > 0) {
      setFormError('Please correct the highlighted fields');
      toast.error(`${count} field${count > 1 ? 's need' : ' needs'} attention`, 'Fix the highlighted passenger or contact details.', LENS.passengerErrors);
      return;
    }
    if (!passengers.some((p) => Number(p.age) > CHILD_MAX_AGE)) {
      setFormError(BOOKING_MESSAGES.adultRequired);
      toast.error('Adult passenger required', BOOKING_MESSAGES.adultRequired, lensForMessage(BOOKING_MESSAGES.adultRequired));
      return;
    }
    // DEF-V2-03: tell the user now if the group fits no berth / RAC / WL pool, not after payment.
    const seats = passengers.filter((p) => Number(p.age) >= CHILD_FREE_BELOW_AGE).length;
    if (decideStatus(seats, inventory, occ) === 'REGRET') {
      setFormError(BOOKING_MESSAGES.regret);
      toast.error('No seats for this group', BOOKING_MESSAGES.regret, lensForMessage(BOOKING_MESSAGES.regret));
      return;
    }
    setFormError(null);
    const draft: BookingDraft = {
      username: user!.username,
      trainNumber,
      from,
      to,
      date,
      travelClass,
      quota,
      passengers: passengers.map((p) => ({ name: p.name.trim(), age: Number(p.age), gender: p.gender as Gender })),
      contact: { mobile: mobile.trim(), email: email.trim() },
    };
    const full = calculateFare(journey.distanceKm, travelClass, quota, draft.passengers);
    db.setDraft({ draft, total: full.total, createdAt: Date.now() } satisfies PaymentDraft);
    toast.info('Seats held for 10 minutes', 'Complete the payment to confirm your booking.');
    navigate('/payment');
  };

  return (
    <PageShell title="Passenger details" eyebrow={<Stepper current={1} />} subtitle={`${train.number} · ${train.name}`}>
      <Card className="p-5 md:p-6 mb-6">
        <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center" data-testid="journey-summary">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
            <div>
              <p className="text-2xl font-extrabold tabular">{journey.from.time}</p>
              <p className="text-sm font-semibold"><span className="font-mono text-navy-700">{from}</span> <span className="text-muted">{getStation(from)?.name}</span></p>
            </div>
            <div className="text-center text-xs font-semibold text-muted">
              <p className="flex items-center justify-center gap-1"><Clock3 size={13} /> {formatDuration(journey.durationMinutes)}</p>
              <div className="my-1.5 flex items-center"><span className="h-2 w-2 rounded-full bg-navy-500" /><span className="flex-1 border-t-2 border-dashed border-navy-200" /><span className="h-2 w-2 rounded-full bg-navy-500" /></div>
              <p>{journey.distanceKm} km</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold tabular">{journey.to.time}{journey.arrivalDayOffset > 0 && <sup className="ml-1 text-xs text-saffron-600">+{journey.arrivalDayOffset}</sup>}</p>
              <p className="text-sm font-semibold"><span className="text-muted">{getStation(to)?.name}</span> <span className="font-mono text-navy-700">{to}</span></p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 md:flex-col md:items-end">
            <span className="chip bg-navy-50 text-navy-700">{formatJourneyDate(date)}</span>
            <span className="chip bg-navy-50 text-navy-700">{CLASS_INFO[travelClass].label} · {QUOTA_LABEL[quota]}</span>
            <span className="chip bg-mint-50 text-mint-700">Availability: <b data-testid="booking-availability">{avail.label}</b></span>
          </div>
        </div>
      </Card>

      <form onSubmit={submit} noValidate className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {passengers.map((p, i) => {
              const ageOk = !validateAge(p.age) && !validateGender(p.gender);
              const concession = ageOk ? getConcession(Number(p.age), p.gender as Gender, quota) : null;
              return (
                <motion.div
                  key={i}
                  layout={ok}
                  initial={ok ? { opacity: 0, y: 12, scale: 0.98 } : false}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={ok ? { opacity: 0, x: -30, transition: { duration: 0.18 } } : { opacity: 0, transition: { duration: 0 } }}
                  className="card p-5"
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-navy-900 text-white"><UserRound size={16} /></span>
                      <h2 className="font-bold">Passenger {i + 1}</h2>
                      {concession && concession.type !== 'NONE' && (
                        <span className="chip bg-saffron-50 text-saffron-700 ring-1 ring-saffron-200">{concession.label}</span>
                      )}
                      {concession && toast.lens && (
                        <span className="chip bg-navy-50 font-mono text-[10.5px] text-navy-700"><FlaskConical size={11} /> {CONCESSION_RULE[concession.type]}</span>
                      )}
                    </div>
                    {passengers.length > 1 && (
                      <button type="button" onClick={() => removePassenger(i)} className="btn-ghost px-3 py-1.5 text-rose-600 hover:bg-rose-50" data-testid={`remove-passenger-${i}`}>
                        <Trash2 size={15} /> Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1.2fr] gap-4">
                    <Field label="Full name" htmlFor={`name-${i}`} error={errors[i]?.name} errorTestId={`passenger-error-${i}-name`}>
                      <input id={`name-${i}`} value={p.name} onChange={(e) => update(i, 'name', e.target.value)} className={inputClass} aria-invalid={!!errors[i]?.name} placeholder="As on ID proof" data-testid={`passenger-name-${i}`} autoComplete="off" />
                    </Field>
                    <Field label="Age" htmlFor={`age-${i}`} error={errors[i]?.age} errorTestId={`passenger-error-${i}-age`}>
                      <input id={`age-${i}`} inputMode="numeric" value={p.age} onChange={(e) => update(i, 'age', e.target.value)} className={inputClass} aria-invalid={!!errors[i]?.age} placeholder="Years" data-testid={`passenger-age-${i}`} />
                    </Field>
                    <Field label="Gender" htmlFor={`gender-${i}`} error={errors[i]?.gender} errorTestId={`passenger-error-${i}-gender`}>
                      <select id={`gender-${i}`} value={p.gender} onChange={(e) => update(i, 'gender', e.target.value)} className={inputClass} aria-invalid={!!errors[i]?.gender} data-testid={`passenger-gender-${i}`}>
                        <option value="">Select</option>
                        {(Object.keys(GENDER_LABEL) as Gender[]).map((g) => <option key={g} value={g}>{GENDER_LABEL[g]}</option>)}
                      </select>
                    </Field>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={addPassenger} disabled={passengers.length >= MAX_PASSENGERS} className={secondaryButton} data-testid="add-passenger">
              <Plus size={17} /> Add passenger
            </button>
            <span className="chip bg-white ring-1 ring-line text-ink" data-testid="passenger-count">
              {passengers.length} of {MAX_PASSENGERS} passengers
            </span>
            <span className="text-xs text-muted">Children below 5 travel free without a berth.</span>
          </div>

          <Card className="p-5">
            <h2 className="mb-4 font-bold">Contact details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Mobile number" htmlFor="contact-mobile" error={contactErrors.mobile} errorTestId="contact-error-mobile">
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input id="contact-mobile" inputMode="numeric" value={mobile} onChange={(e) => setMobile(e.target.value)} className={`${inputClass} pl-10`} aria-invalid={!!contactErrors.mobile} data-testid="contact-mobile" />
                </div>
              </Field>
              <Field label="Email" htmlFor="contact-email" error={contactErrors.email} errorTestId="contact-error-email">
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input id="contact-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputClass} pl-10`} aria-invalid={!!contactErrors.email} data-testid="contact-email" />
                </div>
              </Field>
            </div>
            <p className="mt-3 text-xs text-muted">Your e-ticket and PNR updates are sent here.</p>
          </Card>
        </div>

        <div>
          <Card className="p-5 lg:sticky lg:top-24">
            <h2 className="font-bold">Fare summary</h2>
            <p className="text-xs text-muted">{stationLabel(from)} → {stationLabel(to)}</p>
            {fare ? (
              <div className="mt-4 space-y-2.5 text-sm" data-testid="fare-summary">
                {fare.lines.map((l, i) => (
                  <div key={i} className="flex justify-between gap-3" data-testid={`fare-line-${i}`}>
                    <span className="text-muted">{l.concession.type === 'NONE' ? 'Passenger' : l.concession.label}</span>
                    <span className="font-semibold tabular">{formatINR(l.total)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-muted"><span>Convenience fee</span><span className="font-semibold tabular">{formatINR(fare.convenienceFee)}</span></div>
                <div className="!mt-4 flex items-baseline justify-between border-t border-dashed border-line pt-4">
                  <span className="font-bold">Total</span>
                  <span className="text-2xl font-extrabold tracking-tight tabular" data-testid="fare-total"><CountUp value={fare.total} format={formatINR} /></span>
                </div>
              </div>
            ) : (
              <p className="mt-4 rounded-xl bg-mist p-3 text-sm text-muted" data-testid="fare-pending">Enter age and gender to see the fare.</p>
            )}
            {expected && (
              <div className="mt-4 flex items-center justify-between rounded-xl bg-mist px-3 py-2.5 text-sm">
                <span className="text-muted">If you pay now</span>
                {expected === 'REGRET' ? (
                  <span className="chip bg-slate-100 text-slate-600 ring-1 ring-slate-300">REGRET</span>
                ) : (
                  <StatusBadge status={expected} />
                )}
              </div>
            )}
            {formError && <div className="mt-4"><Alert testId="booking-error">{formError}</Alert></div>}
            <button type="submit" className={`${ctaButton} mt-5 w-full py-3.5 text-base`} data-testid="proceed-payment">
              Continue to payment <ArrowRight size={18} />
            </button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted"><ShieldCheck size={14} /> Seats are held for 10 minutes</p>
          </Card>
        </div>
      </form>
    </PageShell>
  );
}
