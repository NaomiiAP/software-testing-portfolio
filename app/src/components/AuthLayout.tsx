import { BadgePercent, RefreshCcw, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { RouteNetwork } from './art';
import { Reveal } from './motion';

/** Split layout for login / registration: animated network on the left, form on the right. */
export default function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-10 md:py-14">
      <div className="grid overflow-hidden rounded-3xl bg-white shadow-lift ring-1 ring-line lg:grid-cols-[1fr_1.05fr]">
        <div className="relative hidden overflow-hidden bg-navy-900 p-10 text-white lg:block">
          <div className="absolute inset-0 hero-grid" aria-hidden="true" />
          <div className="absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-saffron-500/25 blur-3xl motion-safe:animate-drift" aria-hidden="true" />
          <div className="relative">
            <p className="text-sm font-bold text-saffron-300">RailReserve</p>
            <h2 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight">Every journey,<br />one account.</h2>
            <ul className="mt-6 space-y-3 text-sm text-navy-100">
              <li className="flex items-center gap-2.5"><BadgePercent size={17} className="text-saffron-400" /> Concessions applied automatically</li>
              <li className="flex items-center gap-2.5"><RefreshCcw size={17} className="text-saffron-400" /> Waitlist promotion in real time</li>
              <li className="flex items-center gap-2.5"><ShieldCheck size={17} className="text-saffron-400" /> Account locks after 3 failed logins</li>
            </ul>
            <RouteNetwork className="mt-6 w-full opacity-90" />
          </div>
        </div>
        <div className="p-6 sm:p-10">
          <Reveal>
            <h1 className="text-3xl font-extrabold tracking-tight" data-testid="page-title">{title}</h1>
            <p className="mt-1 text-muted">{subtitle}</p>
            <div className="mt-7">{children}</div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
