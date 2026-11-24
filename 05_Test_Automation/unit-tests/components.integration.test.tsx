// @vitest-environment jsdom
/**
 * Component integration tests (React Testing Library, jsdom).
 * These render real pages with the real store and business rules - no mocks -
 * and check the behaviour a user sees. Regression tests for baseline defects
 * are labelled with the defect id.
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Header from '@app/components/Header';
import RequireAuth from '@app/components/RequireAuth';
import SearchForm from '@app/components/SearchForm';
import { addDays, toISODate } from '@app/lib/dates';
import { createBooking } from '@app/lib/reservation';
import { MESSAGES } from '@app/lib/validation';
import Login from '@app/pages/Login';
import PNRStatus from '@app/pages/PNRStatus';
import TrainResults from '@app/pages/TrainResults';
import { NotFound } from '@app/pages/InfoPages';
import { AuthProvider } from '@app/store/AuthContext';
import { db } from '@app/store/db';

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="location">{loc.pathname + loc.search}</div>;
}

function renderAt(path: string, routes: React.ReactNode) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>{routes}</Routes>
        <LocationProbe />
      </MemoryRouter>
    </AuthProvider>,
  );
}

const today = toISODate(new Date());
const pick = (testId: string, value: string) => fireEvent.change(screen.getByTestId(testId), { target: { value } });
/** Station autocomplete: type the code, then choose the matching option. */
const pickStation = (testId: string, code: string) => {
  pick(testId, code);
  fireEvent.click(screen.getByTestId(`${testId}-option-${code}`));
};

describe('Search form', () => {
  it('TC_IT_01 (regression D02): same source and destination shows an error and does not navigate', () => {
    renderAt('/', <Route path="/" element={<SearchForm />} />);
    pickStation('from-station', 'MMCT');
    pickStation('to-station', 'MMCT');
    fireEvent.click(screen.getByTestId('search-btn'));
    expect(screen.getByTestId('search-error')).toHaveTextContent(MESSAGES.sameStations);
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
  });

  it('TC_IT_02 (regression D01): a valid search navigates to the results URL', () => {
    renderAt('/', <Route path="/" element={<SearchForm />} />);
    const date = addDays(today, 7);
    pickStation('from-station', 'MMCT');
    pickStation('to-station', 'NDLS');
    pick('journey-date', date);
    fireEvent.click(screen.getByTestId('search-btn'));
    expect(screen.getByTestId('location')).toHaveTextContent(`/trains?from=MMCT&to=NDLS&date=${date}&quota=GN`);
  });

  it('TC_IT_03 (regression D03): date picker is limited to today .. today+120', () => {
    renderAt('/', <Route path="/" element={<SearchForm />} />);
    const input = screen.getByTestId('journey-date');
    expect(input).toHaveAttribute('min', today);
    expect(input).toHaveAttribute('max', addDays(today, 120));
  });

  it('TC_IT_04: swap button exchanges source and destination', () => {
    renderAt('/', <Route path="/" element={<SearchForm />} />);
    pickStation('from-station', 'MMCT');
    pickStation('to-station', 'NDLS');
    fireEvent.click(screen.getByTestId('swap-stations'));
    expect(screen.getByTestId('from-station')).toHaveAttribute('data-code', 'NDLS');
    expect(screen.getByTestId('from-station')).toHaveValue('New Delhi');
    expect(screen.getByTestId('to-station')).toHaveAttribute('data-code', 'MMCT');
  });
});

describe('Train results', () => {
  it('TC_IT_05 (regression D11): each result offers a Book button and class availability', () => {
    renderAt(`/trains?from=MMCT&to=NDLS&date=${addDays(today, 10)}&quota=GN`, <Route path="/trains" element={<TrainResults />} />);
    const card = screen.getByTestId('train-card-12951');
    expect(within(card).getByTestId('book-btn-12951')).toBeEnabled();
    expect(within(card).getByTestId('availability-12951-1A')).toHaveTextContent('AVAILABLE 2');
  });

  it('TC_IT_06 (regression D09): filtering All Trains by a listed number keeps that train', () => {
    renderAt('/trains', <Route path="/trains" element={<TrainResults />} />);
    pick('trains-filter', '12951');
    expect(screen.getByTestId('train-row-12951')).toBeInTheDocument();
    expect(screen.getAllByTestId(/^train-row-/)).toHaveLength(1);
  });

  it('TC_IT_07: invalid URL parameters show the validation message instead of results', () => {
    renderAt(`/trains?from=MMCT&to=MMCT&date=${today}`, <Route path="/trains" element={<TrainResults />} />);
    expect(screen.getByTestId('search-error')).toHaveTextContent(MESSAGES.sameStations);
  });

  it('TC_IT_08: Book Now when logged out redirects to login with a return URL', () => {
    renderAt(`/trains?from=MMCT&to=NDLS&date=${addDays(today, 10)}&quota=GN`, <Route path="/trains" element={<TrainResults />} />);
    fireEvent.click(screen.getByTestId('book-btn-12951'));
    expect(screen.getByTestId('location').textContent).toMatch(/^\/login\?next=%2Fbook%2F12951/);
  });
});

describe('PNR status', () => {
  const submitPnr = (value: string) => {
    pick('pnr-input', value);
    fireEvent.click(screen.getByTestId('pnr-submit'));
  };

  it('TC_IT_09: malformed PNR shows a validation message', () => {
    renderAt('/pnr', <Route path="/pnr" element={<PNRStatus />} />);
    submitPnr('123');
    expect(screen.getByTestId('pnr-error')).toHaveTextContent(MESSAGES.pnrLength);
  });

  it('TC_IT_10 (regression D06): a PNR that was never booked is reported as not found', () => {
    renderAt('/pnr', <Route path="/pnr" element={<PNRStatus />} />);
    submitPnr('0000000000');
    expect(screen.getByTestId('pnr-error')).toHaveTextContent('PNR not found');
    expect(screen.queryByTestId('pnr-result')).not.toBeInTheDocument();
  });

  it('TC_IT_11 (regression D07): a booked PNR shows the same booking on every enquiry', () => {
    const booking = createBooking([], {
      username: 'demo', trainNumber: '12951', from: 'MMCT', to: 'NDLS', date: addDays(today, 10),
      travelClass: '3A', quota: 'GN', passengers: [{ name: 'Asha Rao', age: 30, gender: 'F' }],
      contact: { mobile: '9876543210', email: 'a@b.co' },
    }, { method: 'UPI', reference: 'X' }, '4007919017', Date.now());
    db.saveBookings([booking]);
    renderAt('/pnr', <Route path="/pnr" element={<PNRStatus />} />);
    for (let i = 0; i < 3; i++) {
      submitPnr('4007919017');
      expect(screen.getByTestId('pnr-train')).toHaveTextContent('12951 - Mumbai Rajdhani Express');
      expect(screen.getByTestId('pnr-status')).toHaveTextContent('Confirmed');
    }
  });
});

describe('Authentication', () => {
  const tryLogin = (user: string, pw: string) => {
    pick('login-username', user);
    pick('login-password', pw);
    fireEvent.click(screen.getByTestId('login-submit'));
  };

  it('TC_IT_12: wrong password shows remaining attempts, third failure locks the account', () => {
    renderAt('/login', <Route path="/login" element={<Login />} />);
    tryLogin('demo', 'wrong');
    expect(screen.getByTestId('login-error')).toHaveTextContent('2 attempt(s) left');
    tryLogin('demo', 'wrong');
    expect(screen.getByTestId('login-error')).toHaveTextContent('1 attempt(s) left');
    tryLogin('demo', 'wrong');
    expect(screen.getByTestId('login-error')).toHaveTextContent('Account locked');
    tryLogin('demo', 'Demo@123');
    expect(screen.getByTestId('login-error')).toHaveTextContent('Account locked');
  });

  it('TC_IT_13: correct credentials log in and return to the requested page', () => {
    renderAt('/login?next=%2Fbookings', [
      <Route key="l" path="/login" element={<Login />} />,
      <Route key="b" path="/bookings" element={<p>bookings page</p>} />,
    ]);
    tryLogin('demo', 'Demo@123');
    expect(screen.getByTestId('location')).toHaveTextContent('/bookings');
    expect(db.getSession()).toBe('demo');
  });

  it('TC_IT_14: an external ?next= URL is ignored (no open redirect)', () => {
    renderAt('/login?next=%2F%2Fevil.example', [
      <Route key="l" path="/login" element={<Login />} />,
      <Route key="b" path="/bookings" element={<p>bookings page</p>} />,
    ]);
    tryLogin('demo', 'Demo@123');
    expect(screen.getByTestId('location')).toHaveTextContent('/bookings');
  });

  it('TC_IT_15 (regression D12): protected pages redirect anonymous users to login', () => {
    renderAt('/bookings', [
      <Route key="b" path="/bookings" element={<RequireAuth><p>secret</p></RequireAuth>} />,
      <Route key="l" path="/login" element={<p>login page</p>} />,
    ]);
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/login?next=%2Fbookings');
  });
});

describe('Fixes for defects found in v2.0', () => {
  afterEach(() => vi.useRealTimers());

  it('TC_IT_17 (regression DEF-V2-02): trains that already left today are marked Departed and not bookable', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 0, 20, 10, 0)); // 10:00 - 12127 left at 06:40, 12163 leaves at 20:30
    renderAt('/trains?from=CSMT&to=PUNE&date=2026-01-20&quota=GN', <Route path="/trains" element={<TrainResults />} />);
    expect(screen.getByTestId('departed-12127')).toHaveTextContent('Departed');
    expect(screen.getByTestId('book-btn-12127')).toBeDisabled();
    expect(screen.queryByTestId('departed-12163')).not.toBeInTheDocument();
    expect(screen.getByTestId('book-btn-12163')).toBeEnabled();
  });

  it('TC_IT_18 (regression DEF-V2-04): "All Trains" is highlighted only on the timetable, not on search results', () => {
    const active = (path: string) => {
      const view = renderAt(path, <Route path="*" element={<Header />} />);
      const cls = screen.getByTestId('nav-trains').className;
      view.unmount();
      return cls.split(' ').includes('is-active');
    };
    expect(active('/trains')).toBe(true);
    expect(active('/trains?from=MMCT&to=NDLS&date=2026-01-20')).toBe(false);
  });
});

describe('Routing', () => {
  it('TC_IT_16 (regression D13): unknown routes render the Not Found page', () => {
    renderAt('/about-us-old', <Route path="*" element={<NotFound />} />);
    expect(screen.getByTestId('not-found')).toHaveTextContent('page you requested was not found');
  });
});
