import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Scrolls to the top on every route change (React Router keeps the old position otherwise). */
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
