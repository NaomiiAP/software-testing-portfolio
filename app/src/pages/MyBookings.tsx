import { motion } from 'framer-motion';
import { ArrowRight, Search, TicketX } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMotionOK } from '../components/motion';
import { Alert, Card, PageShell, StatusBadge } from '../components/ui';
import { getStation } from '../data/stations';
import { formatJourneyDate } from '../lib/dates';
import { formatINR } from '../lib/fare';
import { useAuth } from '../store/AuthContext';
import { db } from '../store/db';

type Tab = 'all' | 'upcoming' | 'cancelled';

export default function MyBookings() {
  const { user } = useAuth();
  const ok = useMotionOK();
  const [tab, setTab] = useState<Tab>('all');
  const all = db
    .getBookings()
    .filter((b) => b.username === user?.username)
    .sort((a, b) => b.bookedAt - a.bookedAt);
  const now = Date.now();
  const upcoming = all.filter((b) => b.status !== 'CAN' && b.departureAt > now);
  const cancelled = all.filter((b) => b.status === 'CAN');
  const shown = tab === 'upcoming' ? upcoming : tab === 'cancelled' ? cancelled : all;

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: all.length },
    { id: 'upcoming', label: 'Upcoming', count: upcoming.length },
    { id: 'cancelled', label: 'Cancelled', count: cancelled.length },
  ];

  return (
    <PageShell
      title="My bookings"
      subtitle={`Tickets booked by ${user?.fullName ?? ''}`}
      below={
        <div className="inline-flex rounded-xl bg-white/10 p-1 ring-1 ring-white/15">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${tab === t.id ? 'bg-white text-navy-900' : 'text-navy-100 hover:text-white'}`}
              data-testid={`bookings-tab-${t.id}`}
            >
              {t.label} <span className="ml-1 opacity-60">{t.count}</span>
            </button>
          ))}
        </div>
      }
    >
      {all.length === 0 ? (
        <Card className="p-10 text-center">
          <TicketX size={44} className="mx-auto text-navy-200" />
          <div className="mx-auto mt-4 max-w-md">
            <Alert kind="info" testId="no-bookings">
              You have no bookings yet. <Link to="/" className="link">Search for trains</Link> to book your first ticket.
            </Alert>
          </div>
        </Card>
      ) : shown.length === 0 ? (
        <Card className="p-8 text-center text-muted">Nothing here yet.</Card>
      ) : (
        <div className="space-y-4" data-testid="bookings-list">
          {shown.map((b, i) => {
            const [, m, d] = b.date.split('-').map(Number);
            const month = new Date(2000, m - 1, 1).toLocaleDateString('en-IN', { month: 'short' });
            return (
              <motion.div key={b.pnr} initial={ok ? { opacity: 0, y: 14 } : false} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 6) * 0.05 }}>
                <Card className={`group overflow-hidden transition-shadow hover:shadow-lift ${b.status === 'CAN' ? 'opacity-75' : ''}`}>
                  <div className="flex flex-wrap items-stretch" data-testid={`booking-${b.pnr}`}>
                    <div className="flex w-24 shrink-0 flex-col items-center justify-center bg-navy-900 py-4 text-white">
                      <span className="text-3xl font-extrabold tabular leading-none">{String(d).padStart(2, '0')}</span>
                      <span className="mt-1 text-xs font-bold uppercase tracking-wider text-saffron-300">{month}</span>
                    </div>
                    <div className="flex flex-1 flex-wrap items-center justify-between gap-4 p-4 md:px-6">
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-bold text-muted">PNR {b.pnr}</p>
                        <p className="mt-0.5 font-bold">{b.trainNumber} {b.trainName}</p>
                        <p className="mt-1 text-sm text-muted">
                          <span className="font-mono font-bold text-navy-700">{b.from}</span> {b.departureTime} → <span className="font-mono font-bold text-navy-700">{b.to}</span> {b.arrivalTime}
                          {' · '}{getStation(b.from)?.city} to {getStation(b.to)?.city} · {formatJourneyDate(b.date)} · {b.travelClass} · {b.passengers.length} pax
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-extrabold tabular">{formatINR(b.fare.total)}</span>
                        <StatusBadge status={b.status} testId={`booking-status-${b.pnr}`} />
                        <Link to={`/ticket/${b.pnr}`} className="btn-secondary py-2" data-testid={`view-ticket-${b.pnr}`}>
                          View / Cancel <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
      <p className="mt-6 text-sm text-muted">
        <Link to="/" className="link inline-flex items-center gap-1"><Search size={14} /> Book another journey</Link>
      </p>
    </PageShell>
  );
}
