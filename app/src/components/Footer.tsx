import { Mail, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo, RunningTrain } from './art';

const linkClass = 'text-navy-200 hover:text-white transition-colors';

export default function Footer() {
  return (
    <footer className="bg-navy-950 text-white">
      <RunningTrain />
      <div className="container mx-auto max-w-7xl px-4 py-12 grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr] gap-10">
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <Logo />
            <div className="leading-tight">
              <p className="text-lg font-extrabold tracking-tight">RailReserve</p>
              <p className="text-xs text-navy-300">Railway Reservation System</p>
            </div>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-navy-300">
            A demonstration railway reservation system - the application under test of a Software Testing
            portfolio. Train data is sample data and payments are simulated.
          </p>
        </div>

        <div>
          <h4 className="mb-4 text-xs font-bold uppercase tracking-[.14em] text-saffron-400">Quick links</h4>
          <ul className="space-y-2.5 text-sm">
            <li><Link to="/" className={linkClass}>Book tickets</Link></li>
            <li><Link to="/trains" className={linkClass}>All trains</Link></li>
            <li><Link to="/pnr-status" className={linkClass}>PNR status</Link></li>
            <li><Link to="/bookings" className={linkClass}>My bookings</Link></li>
            <li><Link to="/refund-policy" className={linkClass} data-testid="footer-refund">Cancellation &amp; refund policy</Link></li>
            <li><Link to="/about" className={linkClass} data-testid="footer-about">About</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-xs font-bold uppercase tracking-[.14em] text-saffron-400">Contact</h4>
          <ul className="space-y-3 text-sm text-navy-200">
            <li className="flex items-start gap-3"><MapPin size={17} className="mt-0.5 shrink-0 text-saffron-400" /> Railway Station Road, New Delhi 110001</li>
            <li className="flex items-center gap-3"><Phone size={17} className="shrink-0 text-saffron-400" /> 139 (sample helpline)</li>
            <li className="flex items-center gap-3"><Mail size={17} className="shrink-0 text-saffron-400" /> support@railreserve.test</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="container mx-auto max-w-7xl px-4 py-5 text-center text-xs text-navy-300">
          © {new Date().getFullYear()} RailReserve - based on the open-source irctc-clone project. For educational use only; not affiliated with Indian Railways.
        </p>
      </div>
    </footer>
  );
}
