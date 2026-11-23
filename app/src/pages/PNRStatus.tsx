import { motion } from 'framer-motion';
import { ArrowRight, Search } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LENS, lensForMessage } from '../components/demo/lens';
import { useMotionOK } from '../components/motion';
import { useToast } from '../components/toast';
import { Alert, Card, PageShell, StatusBadge, ctaButton } from '../components/ui';
import { getStation } from '../data/stations';
import { CLASS_INFO, QUOTA_LABEL } from '../lib/constants';
import { formatJourneyDate } from '../lib/dates';
import { BOOKING_MESSAGES, berthLabel, type Booking } from '../lib/reservation';
import { STATUS_LABEL } from '../lib/ticketState';
import { validatePNR } from '../lib/validation';
import { db } from '../store/db';

export default function PNRStatus() {
  const [params] = useSearchParams();
  const toast = useToast();
  const ok = useMotionOK();
  const [pnr, setPnr] = useState(params.get('pnr') ?? '');
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);

  const lookup = (value: string) => {
    setBooking(null);
    const problem = validatePNR(value);
    if (problem) {
      setError(problem);
      toast.error('Invalid PNR', problem, lensForMessage(problem));
      return;
    }
    const found = db.findBooking(value.trim());
    setError(found ? null : BOOKING_MESSAGES.pnrNotFound);
    setBooking(found ?? null);
    if (found) toast.success(`PNR ${found.pnr}: ${STATUS_LABEL[found.status]}`, `${found.trainNumber} ${found.trainName} · ${formatJourneyDate(found.date)}`, LENS.pnrFound);
    else toast.error('PNR not found', 'Check the 10-digit number printed on your ticket.', lensForMessage(BOOKING_MESSAGES.pnrNotFound));
  };

  // Deep link: /pnr-status?pnr=4007919017 looks the PNR up immediately.
  useEffect(() => {
    const fromUrl = params.get('pnr');
    if (fromUrl) lookup(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    lookup(pnr);
  };

  return (
    <PageShell
      title="PNR status"
      subtitle="Enter the 10-digit PNR printed on your ticket to see the current status of every passenger."
      below={
        <form onSubmit={submit} noValidate className="flex max-w-xl flex-col gap-3 sm:flex-row">
          <input
            value={pnr}
            onChange={(e) => setPnr(e.target.value)}
            placeholder="e.g. 4007919017"
            className="field h-14 border-white/20 bg-white/95 font-mono text-lg tracking-[.2em]"
            inputMode="numeric"
            aria-label="PNR number"
            data-testid="pnr-input"
          />
          <button type="submit" className={`${ctaButton} h-14 px-7`} data-testid="pnr-submit">
            <Search size={18} /> Get status
          </button>
        </form>
      }
    >
      {error && (
        <Card className="p-5">
          <Alert testId="pnr-error">{error}</Alert>
        </Card>
      )}

      {booking && (
        <motion.div initial={ok ? { opacity: 0, y: 16 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card className="overflow-hidden">
            <div data-testid="pnr-result">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 md:px-6">
                <div>
                  <p className="label !mb-0.5">PNR</p>
                  <h2 className="font-mono text-2xl font-bold tracking-[.16em]">{booking.pnr}</h2>
                </div>
                <StatusBadge status={booking.status} testId="pnr-status" />
              </div>
              <div className="grid gap-6 p-5 md:grid-cols-[1fr_1fr] md:p-6">
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="label">Train</p>
                    <p className="font-bold" data-testid="pnr-train">{booking.trainNumber} - {booking.trainName}</p>
                  </div>
                  <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                    <div><p className="text-xl font-extrabold tabular">{booking.departureTime}</p><p className="font-mono text-xs font-bold text-navy-700">{booking.from}</p></div>
                    <div className="flex items-center"><span className="h-2 w-2 rounded-full bg-navy-500" /><span className="flex-1 border-t-2 border-dashed border-navy-200" /><span className="h-2 w-2 rounded-full bg-navy-500" /></div>
                    <div className="text-right"><p className="text-xl font-extrabold tabular">{booking.arrivalTime}</p><p className="font-mono text-xs font-bold text-navy-700">{booking.to}</p></div>
                  </div>
                  <dl className="grid grid-cols-2 gap-3">
                    <div><dt className="label">Date</dt><dd className="font-semibold">{formatJourneyDate(booking.date)}</dd></div>
                    <div><dt className="label">From → To</dt><dd className="font-semibold">{getStation(booking.from)?.city} → {getStation(booking.to)?.city}</dd></div>
                    <div><dt className="label">Class</dt><dd className="font-semibold">{CLASS_INFO[booking.travelClass].label}</dd></div>
                    <div><dt className="label">Quota · Chart</dt><dd className="font-semibold">{QUOTA_LABEL[booking.quota]} · {booking.chartPrepared ? 'Prepared' : 'Not prepared'}</dd></div>
                  </dl>
                </div>
                <div>
                  <table className="w-full text-sm">
                    <thead className="text-left text-[11px] uppercase tracking-wider text-muted">
                      <tr className="border-b border-line"><th className="py-2">Passenger</th><th className="py-2">Booking</th><th className="py-2">Current status</th></tr>
                    </thead>
                    <tbody>
                      {booking.passengers.map((p, i) => (
                        <tr key={i} className="border-b border-line/70">
                          <td className="py-3">Passenger {i + 1} <span className="text-muted">({p.age} yrs)</span></td>
                          <td className="py-3 font-mono text-xs font-bold text-muted">{booking.history[0]?.status}</td>
                          <td className="py-3 font-mono font-bold text-navy-800" data-testid={`pnr-passenger-${i}`}>{berthLabel(booking.status, booking.travelClass, p.slot)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Link to={`/ticket/${booking.pnr}`} className="btn-secondary mt-5" data-testid="pnr-view-ticket">
                    View full ticket <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {!booking && !error && (
        <Card className="p-6 text-sm text-muted">
          Your PNR is the 10-digit number at the top of your e-ticket. Status updates after every cancellation and when the chart is prepared, 4 hours before departure.
        </Card>
      )}
    </PageShell>
  );
}
