import { useEffect } from 'react';
import { useLocation } from 'react-router';

/** Starts each new page at the top, as a full page load would. */
export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
