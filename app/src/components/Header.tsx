import { AnimatePresence, motion } from 'framer-motion';
import { LogIn, LogOut, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { Logo } from './art';
import { useMotionOK } from './motion';
import { useToast } from './toast';

const NAV = [
  { to: '/', label: 'Home', testId: 'nav-home' },
  { to: '/trains', label: 'All Trains', testId: 'nav-trains' },
  { to: '/pnr-status', label: 'PNR Status', testId: 'nav-pnr' },
  { to: '/bookings', label: 'My Bookings', testId: 'nav-bookings' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const ok = useMotionOK();
  const { pathname, search } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  // /trains?from=…&to=… is a search result, not the "All Trains" timetable (DEF-V2-04).
  // `is-active` marks the current section (asserted by TC_IT_18).
  const isActive = (to: string) => {
    const match = to === '/' ? pathname === '/' : pathname.startsWith(to);
    return match && !(to === '/trains' && search !== '');
  };

  const handleLogout = () => {
    logout();
    setOpen(false);
    toast.info('Signed out', 'See you on your next journey.');
    navigate('/');
  };

  const initials = user ? user.fullName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() : '';

  const authBlock = user ? (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-3 ring-1 ring-white/15">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-saffron-500 text-[11px] font-bold text-white">{initials}</span>
        <span className="text-sm font-semibold text-white" data-testid="nav-user">{user.username}</span>
      </span>
      <button onClick={handleLogout} className="btn rounded-full bg-white/10 px-3.5 py-2 text-white ring-1 ring-white/15 hover:bg-white/20" data-testid="nav-logout">
        <LogOut size={15} /> Logout
      </button>
    </div>
  ) : (
    <Link to="/login" className="btn-primary rounded-full px-4 py-2" data-testid="nav-login">
      <LogIn size={16} /> Login / Register
    </Link>
  );

  return (
    <header className={`sticky top-0 z-50 border-b transition-[background-color,border-color,box-shadow] duration-300 ${scrolled ? 'bg-navy-950/90 border-white/10 shadow-lift backdrop-blur-xl' : 'bg-navy-900 border-transparent'}`}>
      <div className="container mx-auto max-w-7xl px-4">
        <div className="flex h-[68px] items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 group" data-testid="brand">
            <span className="transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105">
              <Logo />
            </span>
            <span className="leading-tight">
              <span className="block text-[17px] font-extrabold tracking-tight text-white">RailReserve</span>
              <span className="block text-[11px] font-medium text-navy-300">Railway Reservation System</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1" aria-label="Main">
            {NAV.map((n) => {
              const active = isActive(n.to);
              return (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.to === '/'}
                  className={`relative rounded-full px-4 py-2 text-sm font-semibold transition-colors ${active ? 'is-active text-white' : 'text-navy-200 hover:text-white'}`}
                  data-testid={n.testId}
                >
                  {active &&
                    (ok ? (
                      <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full bg-white/10 ring-1 ring-white/15" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
                    ) : (
                      <span className="absolute inset-0 rounded-full bg-white/10 ring-1 ring-white/15" />
                    ))}
                  <span className="relative">{n.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="hidden md:block">{authBlock}</div>

          <button
            className="md:hidden grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-white ring-1 ring-white/15"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
            aria-expanded={open}
            data-testid="menu-toggle"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={ok ? { height: 0, opacity: 0 } : false}
              animate={{ height: 'auto', opacity: 1 }}
              exit={ok ? { height: 0, opacity: 0 } : { opacity: 0, transition: { duration: 0 } }}
              className="md:hidden overflow-hidden"
            >
              <div className="flex flex-col gap-1 pb-4">
                {NAV.map((n) => (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    end={n.to === '/'}
                    className={`rounded-xl px-4 py-3 font-semibold ${isActive(n.to) ? 'is-active bg-white/10 text-white' : 'text-navy-200'}`}
                    onClick={() => setOpen(false)}
                  >
                    {n.label}
                  </NavLink>
                ))}
                <div className="pt-3">{authBlock}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
