import { AnimatePresence, motion } from 'framer-motion';
import { CalendarClock, Download, History, Printer, Ticket as TicketIcon, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Confetti, Logo, QrCode, SuccessCheck } from '../components/art';
import { LENS, REFUND_LENS } from '../components/demo/lens';
import { useMotionOK } from '../components/motion';
import { useToast } from '../components/toast';
import { Alert, Card, PageShell, StatusBadge, Stepper, dangerButton, secondaryButton } from '../components/ui';
import { getStation } from '../data/stations';
import { formatDuration, getJourney, getTrain } from '../data/trains';
import { CLASS_INFO, GENDER_LABEL, QUOTA_LABEL } from '../lib/constants';
import { addDays, formatJourneyDate } from '../lib/dates';
import { CONCESSIONS, formatINR } from '../lib/fare';
import { REFUND_RULE_TEXT, calculateRefund, type RefundResult } from '../lib/refund';
import { BOOKING_MESSAGES, BookingError, berthLabel, cancelBooking, hoursToDeparture, type Booking } from '../lib/reservation';
import { STATUS_LABEL } from '../lib/ticketState';
import { useAuth } from '../store/AuthContext';
import { db } from '../store/db';

function refundPreview(b: Booking): RefundResult | string {
  if (b.status === 'CAN') return BOOKING_MESSAGES.alreadyCancelled;
  try {
    return calculateRefund(
      {
        status: b.status,
        travelClass: b.travelClass,
        quota: b.quota,
        fare: b.fare.total - b.fare.convenienceFee,
        payingPassengers: b.passengers.filter((p) => p.concession !== 'CHILD_FREE').length,
      },
      hoursToDeparture(b, Date.now()),
    );
  } catch (e) {
    return (e as Error).message;
  }
}

const EVENT_TEXT: Record<string, string> = {
  BOOKED: 'Ticket booked',
  PROMOTE: 'Promoted after a cancellation',
  CHART_PREPARED: 'Reservation chart prepared',
  CANCEL: 'Cancelled by passenger',
};

const qrText = (b: Booking) =>
  `RailReserve ERS|PNR ${b.pnr}|${b.trainNumber} ${b.trainName}|${b.from}-${b.to}|${b.date} ${b.departureTime}|${b.travelClass}/${b.quota}|${b.passengers.length} PAX|${b.status}`;

export function TicketDetails({ booking }: { booking: Booking }) {
  const journey = getJourney(getTrain(booking.trainNumber)!, booking.from, booking.to);
  const bookedStatus = booking.history[0]?.status ?? booking.status;
  const arrivalDate = addDays(booking.date, booking.arrivalDayOffset);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 bg-navy-900 px-5 py-4 text-white md:px-7">
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <div className="leading-tight">
            <p className="font-extrabold tracking-tight">RailReserve</p>
            <p className="text-xs text-navy-200">Electronic Reservation Slip (ERS)</p>
          </div>
        </div>
        <StatusBadge status={booking.status} testId="ticket-status" />
      </div>

      <div className="grid gap-6 p-5 md:grid-cols-[1fr_auto] md:p-7">
        <div>
          <p className="label">PNR</p>
          <p className="font-mono text-3xl font-bold tracking-[.18em] text-navy-900" data-testid="ticket-pnr">{booking.pnr}</p>

          <div className="mt-6 grid grid-cols-[auto_1fr_auto] items-center gap-4">
            <div>
              <p className="text-3xl font-extrabold tracking-tight tabular">{booking.departureTime}</p>
              <p className="text-xs font-semibold text-muted">{formatJourneyDate(booking.date)}</p>
              <p className="mt-1 text-sm font-bold"><span className="font-mono text-navy-700">{booking.from}</span> {getStation(booking.from)?.name}</p>
            </div>
            <div className="text-center text-xs font-semibold text-muted">
              {journey && <p>{formatDuration(journey.durationMinutes)}</p>}
              <div className="my-1.5 flex items-center"><span className="h-2.5 w-2.5 rounded-full border-2 border-navy-500" /><span className="flex-1 border-t-2 border-dashed border-navy-200" /><span className="h-2.5 w-2.5 rounded-full bg-navy-500" /></div>
              {journey && <p>{journey.distanceKm} km</p>}
            </div>
            <div className="text-right">
              <p className="text-3xl font-extrabold tracking-tight tabular">{booking.arrivalTime}</p>
              <p className="text-xs font-semibold text-muted">{formatJourneyDate(arrivalDate)}</p>
              <p className="mt-1 text-sm font-bold">{getStation(booking.to)?.name} <span className="font-mono text-navy-700">{booking.to}</span></p>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
            <div><dt className="label">Train</dt><dd className="font-semibold" data-testid="ticket-train">{booking.trainNumber} - {booking.trainName}</dd></div>
            <div><dt className="label">Journey date</dt><dd className="font-semibold" data-testid="ticket-date">{formatJourneyDate(booking.date)}</dd></div>
            <div><dt className="label">Class / Quota</dt><dd className="font-semibold" data-testid="ticket-class">{CLASS_INFO[booking.travelClass].label} · {QUOTA_LABEL[booking.quota]}</dd></div>
            <div><dt className="label">Booked on</dt><dd className="font-semibold">{new Date(booking.bookedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</dd></div>
            <div><dt className="label">Chart status</dt><dd className="font-semibold">{booking.chartPrepared ? 'Chart prepared' : 'Chart not prepared'}</dd></div>
            <div><dt className="label">Payment</dt><dd className="font-semibold">{booking.payment.method} · <span className="font-mono text-xs">{booking.payment.reference}</span></dd></div>
          </dl>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-line p-4 md:self-start">
          <QrCode text={qrText(booking)} />
          <p className="text-[11px] font-semibold text-muted">Show at boarding</p>
        </div>
      </div>

      <div className="perforation mx-0" />

      <div className="p-5 md:p-7">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="ticket-passengers">
            <thead className="text-left text-[11px] uppercase tracking-wider text-muted">
              <tr className="border-b border-line">
                <th className="py-2 pr-3">#</th>
                <th className="py-2 pr-3">Passenger</th>
                <th className="py-2 pr-3">Concession</th>
                <th className="py-2 pr-3">Booking status</th>
                <th className="py-2 pr-3">Current status</th>
                <th className="py-2 text-right">Fare</th>
              </tr>
            </thead>
            <tbody>
              {booking.passengers.map((p, i) => (
                <tr key={i} className="border-b border-line/70" data-testid={`passenger-row-${i}`}>
                  <td className="py-3 pr-3 font-mono text-muted">{i + 1}</td>
                  <td className="py-3 pr-3">
                    <p className="font-semibold" data-testid={`passenger-name-${i}`}>{p.name}</p>
                    <p className="text-xs text-muted">{p.age} yrs · {GENDER_LABEL[p.gender]}</p>
                  </td>
                  <td className="py-3 pr-3 text-muted" data-testid={`passenger-concession-${i}`}>{CONCESSIONS[p.concession].label}</td>
                  <td className="py-3 pr-3 font-mono text-xs font-bold text-muted">{bookedStatus}</td>
                  <td className="py-3 pr-3">
                    <span className="font-mono text-xs font-bold text-muted mr-1.5">{booking.status}</span>
                    <span className="font-mono font-bold text-navy-800" data-testid={`passenger-berth-${i}`}>{berthLabel(booking.status, booking.travelClass, p.slot)}</span>
                  </td>
                  <td className="py-3 text-right font-semibold tabular" data-testid={`passenger-fare-${i}`}>{formatINR(p.fare)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          {booking.status === 'WL' ? (
            <p className="max-w-md rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
              Waitlisted e-tickets are not valid for travel. If still waitlisted when the chart is prepared, the ticket is cancelled and refunded automatically.
            </p>
          ) : (
            <p className="text-xs text-muted">Carry an original photo ID. The chart is prepared 4 hours before departure.</p>
          )}
          <div className="text-right text-sm">
            <p className="text-muted">Convenience fee: {formatINR(booking.fare.convenienceFee)}</p>
            <p className="mt-1 font-semibold">Total paid <span className="ml-2 text-2xl font-extrabold tabular" data-testid="ticket-total">{formatINR(booking.fare.total)}</span></p>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Ticket() {
  const { pnr = '' } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const toast = useToast();
  const ok = useMotionOK();
  const [booking, setBooking] = useState(() => db.findBooking(pnr));
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<{ refund: number; promoted: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const justBooked = (location.state as { justBooked?: boolean } | null)?.justBooked;

  if (!booking) {
    return (
      <PageShell title="E-ticket">
        <Card className="p-6">
          <Alert testId="ticket-not-found">{BOOKING_MESSAGES.pnrNotFound}. <Link to="/pnr-status" className="link">Check PNR status</Link></Alert>
        </Card>
      </PageShell>
    );
  }

  const owner = user?.username === booking.username;
  const preview = booking.status !== 'CAN' ? refundPreview(booking) : null;
  const refundable = booking.fare.total - booking.fare.convenienceFee;

  const confirmCancel = () => {
    try {
      const out = cancelBooking(db.getBookings(), booking.pnr, Date.now());
      db.saveBookings(out.bookings);
      setBooking(out.cancelled);
      setResult({ refund: out.cancelled.cancellation!.refund, promoted: out.promoted });
      setConfirming(false);
      setError(null);
      const c = out.cancelled.cancellation!;
      toast.success('Ticket cancelled', `Refund of ${formatINR(c.refund)} initiated to your ${booking.payment.method}.`, REFUND_LENS[c.rule]);
      if (out.promoted.length) toast.info(`${out.promoted.length} waiting ticket${out.promoted.length > 1 ? 's' : ''} promoted`, `PNR ${out.promoted.join(', ')} moved up the queue.`, LENS.promotion);
    } catch (e) {
      const message = e instanceof BookingError || e instanceof Error ? e.message : 'Cancellation failed';
      setError(message);
      toast.error('Cancellation failed', message);
    }
  };

  const download = async () => {
    setDownloading(true);
    try {
      const { downloadTicketPdf } = await import('../utils/ticketPdf');
      await downloadTicketPdf(booking);
      toast.success('E-ticket downloaded', `RailReserve-${booking.pnr}.pdf`);
    } catch {
      toast.error('Could not create the PDF', 'Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const successTone = booking.status === 'CNF' ? 'bg-mint-50 border-mint-100' : booking.status === 'RAC' ? 'bg-amber-50 border-amber-100' : 'bg-rose-50 border-rose-100';
  const checkTone = booking.status === 'CNF' ? '#00A88F' : booking.status === 'RAC' ? '#D98A0B' : '#E5484D';

  return (
    <PageShell
      title="E-ticket"
      eyebrow={justBooked ? <Stepper current={4} /> : 'Electronic Reservation Slip'}
      subtitle={`Booked on ${new Date(booking.bookedAt).toLocaleString('en-IN')}`}
    >
      {justBooked && !result && (
        <motion.div initial={ok ? { opacity: 0, y: 12 } : false} animate={{ opacity: 1, y: 0 }} className={`relative mb-6 flex items-center gap-4 overflow-visible rounded-2xl border px-5 py-4 shadow-card ${successTone}`}>
          <Confetti />
          <SuccessCheck size={52} tone={checkTone} />
          <div data-testid="booking-success">
            <p className="text-lg font-extrabold tracking-tight">Booking successful!</p>
            <p className="text-sm font-medium">Your PNR is <b className="font-mono">{booking.pnr}</b> - status {STATUS_LABEL[booking.status]}. A copy has been sent to {booking.contact.email}.</p>
          </div>
        </motion.div>
      )}

      <div className="relative overflow-hidden card print-ticket">
        <TicketDetails booking={booking} />
        <AnimatePresence>
          {booking.status === 'CAN' && (
            <div className="pointer-events-none absolute inset-x-0 top-36 flex justify-center" aria-hidden="true">
              <motion.div
                initial={ok ? { scale: 1.6, opacity: 0, rotate: -24 } : false}
                animate={{ scale: 1, opacity: 1, rotate: -12 }}
                transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                className="rounded-xl border-4 border-rose-500/60 bg-white/40 px-6 py-2 text-4xl font-extrabold tracking-[.25em] text-rose-500/70 backdrop-blur-[1px]"
              >
                CANCELLED
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {booking.cancellation && (
        <div className="mt-5">
          <Alert kind="info" testId="cancel-result">
            Ticket cancelled. Refund: <b data-testid="refund-amount">{formatINR(booking.cancellation.refund)}</b>{' '}
            (deduction {formatINR(booking.cancellation.deduction)}).{' '}
            {booking.cancellation.rule === 'WL_AUTO_CANCEL'
              ? 'Waitlisted ticket cancelled automatically at chart preparation.'
              : REFUND_RULE_TEXT[booking.cancellation.rule]}
            {result && result.promoted.length > 0 && (
              <span className="mt-1 block" data-testid="promoted-info">Waiting passengers promoted: {result.promoted.join(', ')}</span>
            )}
          </Alert>
        </div>
      )}

      {error && <div className="mt-5"><Alert testId="cancel-error">{error}</Alert></div>}

      <div className="no-print mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={download} disabled={downloading} className={secondaryButton} data-testid="download-ticket">
          <Download size={17} /> {downloading ? 'Preparing PDF…' : 'Download e-ticket (PDF)'}
        </button>
        <button type="button" onClick={() => window.print()} className={secondaryButton} data-testid="print-ticket">
          <Printer size={17} /> Print
        </button>
        {owner && booking.status !== 'CAN' && !confirming && (
          <button type="button" onClick={() => setConfirming(true)} className={dangerButton} data-testid="cancel-ticket">
            <XCircle size={17} /> Cancel ticket
          </button>
        )}
        <Link to="/bookings" className="btn-ghost"><TicketIcon size={17} /> My bookings</Link>
      </div>

      <AnimatePresence>
        {confirming && (
          <motion.div
            initial={ok ? { opacity: 0, height: 0 } : false}
            animate={{ opacity: 1, height: 'auto' }}
            exit={ok ? { opacity: 0, height: 0 } : { opacity: 0, transition: { duration: 0 } }}
            className="no-print overflow-hidden"
          >
            <Card className="mt-5 border-rose-100 p-5 md:p-6">
              <h2 className="text-lg font-extrabold">Cancel this ticket?</h2>
              {typeof preview === 'string' ? (
                <div className="mt-3"><Alert testId="cancel-error">{preview}</Alert></div>
              ) : preview ? (
                <>
                  <p className="mt-1 text-sm font-medium text-muted" data-testid="refund-preview">
                    {REFUND_RULE_TEXT[preview.rule]}. Deduction {formatINR(preview.deduction)}, you will receive{' '}
                    <b className="text-ink" data-testid="refund-preview-amount">{formatINR(preview.refund)}</b>.
                  </p>
                  <dl className="mt-4 grid max-w-md gap-2 rounded-xl bg-mist p-4 text-sm">
                    <div className="flex justify-between"><dt className="text-muted">Amount paid</dt><dd className="tabular">{formatINR(booking.fare.total)}</dd></div>
                    <div className="flex justify-between"><dt className="text-muted">Convenience fee (non-refundable)</dt><dd className="tabular">− {formatINR(booking.fare.convenienceFee)}</dd></div>
                    <div className="flex justify-between"><dt className="text-muted">Refundable fare</dt><dd className="tabular">{formatINR(refundable)}</dd></div>
                    <div className="flex justify-between"><dt className="text-muted">Cancellation charge</dt><dd className="tabular text-rose-600">− {formatINR(preview.deduction)}</dd></div>
                    <div className="flex justify-between border-t border-line pt-2 font-bold"><dt>Refund</dt><dd className="tabular text-mint-700">{formatINR(preview.refund)}</dd></div>
                  </dl>
                </>
              ) : null}
              <div className="mt-5 flex flex-wrap gap-3">
                {typeof preview !== 'string' && (
                  <button type="button" onClick={confirmCancel} className={dangerButton} data-testid="confirm-cancel">Yes, cancel ticket</button>
                )}
                <button type="button" onClick={() => setConfirming(false)} className={secondaryButton} data-testid="abort-cancel">Keep ticket</button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="no-print mt-6 p-5 md:p-6">
        <h2 className="flex items-center gap-2 font-bold"><History size={18} /> Status history</h2>
        <ol className="relative mt-4 ml-2 border-l-2 border-line">
          {booking.history.map((h, i) => (
            <li key={i} className="relative pl-6 pb-4 last:pb-0">
              <span className={`absolute -left-[7px] top-1 h-3 w-3 rounded-full ring-4 ring-white ${h.status === 'CNF' ? 'bg-mint-500' : h.status === 'RAC' ? 'bg-amber-500' : h.status === 'WL' ? 'bg-rose-500' : 'bg-slate-400'}`} />
              <p className="text-sm font-semibold">{EVENT_TEXT[h.event] ?? h.event} <span className="ml-1 font-mono text-xs text-muted">→ {h.status}</span></p>
              <p className="flex items-center gap-1 text-xs text-muted"><CalendarClock size={12} /> {new Date(h.at).toLocaleString('en-IN')}</p>
            </li>
          ))}
        </ol>
      </Card>
    </PageShell>
  );
}
