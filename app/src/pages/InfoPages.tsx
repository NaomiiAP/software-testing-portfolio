import { Link } from 'react-router-dom';
import { TrainArt } from '../components/art';
import { Card, PageShell } from '../components/ui';
import { CLASS_INFO, CLASS_ORDER, CLERKAGE_PER_PASSENGER, CONVENIENCE_FEE } from '../lib/constants';
import { formatINR } from '../lib/fare';
import { REFUND_RULE_TEXT } from '../lib/refund';

export function NotFound() {
  return (
    <PageShell title="Page not found" subtitle="Error 404 - this platform does not exist.">
      <Card className="p-8 text-center">
        <div className="relative mx-auto h-24 w-full max-w-md">
          <TrainArt className="absolute left-1/2 top-2 w-72 -translate-x-1/2 rotate-[-8deg] motion-safe:animate-float" />
          <div className="absolute bottom-3 left-0 right-0 h-1 rounded bg-line" />
        </div>
        <p className="mt-4 text-lg font-medium" data-testid="not-found">
          Sorry, the page you requested was not found. <Link to="/" className="link">Go to home page</Link>
        </p>
      </Card>
    </PageShell>
  );
}

export function About() {
  return (
    <PageShell title="About RailReserve" subtitle="The application under test of a Software Testing portfolio.">
      <Card className="space-y-4 p-6 md:p-8 leading-relaxed">
        <p data-testid="about-text">
          RailReserve is a railway reservation web application used as the application under test in a Software
          Testing portfolio. It extends the open-source{' '}
          <a href="https://github.com/krishanmurariji/irctc-clone" className="link" target="_blank" rel="noreferrer">irctc-clone</a>{' '}
          project with a working booking flow, deterministic sample timetable, fare and concession rules, PNR enquiry,
          cancellation with refunds and user accounts.
        </p>
        <p className="text-muted">All data is stored in your browser. No real tickets are issued and no real payments are taken. Not affiliated with Indian Railways or IRCTC.</p>
      </Card>
    </PageShell>
  );
}

export function RefundPolicy() {
  const order = ['FLAT', 'PCT_25', 'PCT_50', 'NO_REFUND_CHART', 'NO_REFUND_TATKAL', 'CLERKAGE', 'NO_REFUND_LATE'] as const;
  return (
    <PageShell title="Cancellation & refund policy" subtitle="Refunds are calculated on the fare excluding the convenience fee.">
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-6 md:p-8">
          <h2 className="font-bold">Refund rules</h2>
          <ul className="mt-4 space-y-3" data-testid="refund-rules">
            {order.map((r, i) => (
              <li key={r} className="flex gap-3 text-sm">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-navy-50 text-xs font-bold text-navy-700">{i + 1}</span>
                <span className="pt-0.5">{REFUND_RULE_TEXT[r]}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-6 md:p-8">
          <h2 className="font-bold">Charges</h2>
          <table className="mt-4 w-full text-sm">
            <tbody>
              {CLASS_ORDER.map((c) => (
                <tr key={c} className="border-b border-line">
                  <td className="py-2.5 text-muted">{CLASS_INFO[c].label}</td>
                  <td className="py-2.5 text-right font-semibold tabular">{formatINR(CLASS_INFO[c].cancellationCharge)} / passenger</td>
                </tr>
              ))}
              <tr className="border-b border-line"><td className="py-2.5 text-muted">RAC / waitlist clerkage</td><td className="py-2.5 text-right font-semibold tabular">{formatINR(CLERKAGE_PER_PASSENGER)} / passenger</td></tr>
              <tr><td className="py-2.5 text-muted">Convenience fee</td><td className="py-2.5 text-right font-semibold tabular">{formatINR(CONVENIENCE_FEE)} (non-refundable)</td></tr>
            </tbody>
          </table>
          <p className="mt-4 text-xs text-muted">Waitlisted tickets still waitlisted when the chart is prepared (4 hours before departure) are cancelled automatically.</p>
        </Card>
      </div>
    </PageShell>
  );
}
