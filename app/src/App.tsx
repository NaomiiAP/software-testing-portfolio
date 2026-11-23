import { AnimatePresence, motion } from 'framer-motion';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation, type Location } from 'react-router-dom';
import DemoDock from './components/demo/DemoDock';
import Footer from './components/Footer';
import Header from './components/Header';
import { useMotionOK } from './components/motion';
import RequireAuth from './components/RequireAuth';
import ScrollToTop from './components/ScrollToTop';
import { ToastProvider } from './components/toast';
import BookTicket from './pages/BookTicket';
import Home from './pages/Home';
import { About, NotFound, RefundPolicy } from './pages/InfoPages';
import Login from './pages/Login';
import MyBookings from './pages/MyBookings';
import Payment from './pages/Payment';
import PNRStatus from './pages/PNRStatus';
import Register from './pages/Register';
import Ticket from './pages/Ticket';
import TrainResults from './pages/TrainResults';
import { AuthProvider } from './store/AuthContext';

/** `location` is passed in so a page that is fading out keeps rendering its own route. */
function AppRoutes({ location }: { location: Location }) {
  return (
    <Routes location={location}>
      <Route path="/" element={<Home />} />
      <Route path="/trains" element={<TrainResults />} />
      <Route path="/book" element={<Navigate to="/" replace />} />
      <Route path="/book/:trainNumber" element={<RequireAuth><BookTicket /></RequireAuth>} />
      <Route path="/payment" element={<RequireAuth><Payment /></RequireAuth>} />
      <Route path="/ticket/:pnr" element={<Ticket />} />
      <Route path="/pnr-status" element={<PNRStatus />} />
      <Route path="/bookings" element={<RequireAuth><MyBookings /></RequireAuth>} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/about" element={<About />} />
      <Route path="/refund-policy" element={<RefundPolicy />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

/** Fade/slide between pages; disabled under prefers-reduced-motion. */
function PageTransition() {
  const ok = useMotionOK();
  const location = useLocation();
  if (!ok) return <AppRoutes location={location} />;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <AppRoutes location={location} />
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ToastProvider>
          <ScrollToTop />
          <div className="flex min-h-screen flex-col overflow-x-clip">
            <Header />
            <main className="flex-grow">
              <PageTransition />
            </main>
            <Footer />
          </div>
          <DemoDock />
        </ToastProvider>
      </Router>
    </AuthProvider>
  );
}
