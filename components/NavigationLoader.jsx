'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import QniverseLogo from './QniverseLogo';

// Next's file-based loading.jsx only fires if a navigation is slow enough to
// suspend — with prefetching, most route changes here are instant and no
// loading state shows at all. This component instead starts the clock the
// moment an internal link (or back/forward) is triggered, and guarantees the
// overlay stays up for a natural 2-3s, with a label specific to the page
// being loaded — this is the single loader for the whole app.
const MIN_MS_LOW = 2000;
const MIN_MS_HIGH = 3000;
const SAFETY_MS = 8000; // never get stuck showing the loader forever

const ROUTE_LABELS = {
  '/': 'Loading Qniverse',
  '/learn': 'Loading lessons',
  '/playground': 'Starting the Lab',
  '/algorithms': 'Loading algorithms',
  '/challenges': 'Loading challenges',
  '/progress': 'Loading your progress',
};

function labelFor(pathname) {
  return ROUTE_LABELS[pathname] || 'Loading';
}

export default function NavigationLoader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [label, setLabel] = useState(() => labelFor(pathname));
  const startRef = useRef(0);
  const prevPathRef = useRef(pathname);
  const hideTimerRef = useRef(null);
  const safetyTimerRef = useRef(null);
  const minDurationRef = useRef(MIN_MS_LOW);

  function beginLoading(targetPathname) {
    startRef.current = Date.now();
    minDurationRef.current = MIN_MS_LOW + Math.random() * (MIN_MS_HIGH - MIN_MS_LOW);
    setLabel(labelFor(targetPathname));
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    setVisible(true);
    safetyTimerRef.current = setTimeout(() => setVisible(false), SAFETY_MS);
  }

  useEffect(() => {
    function onClick(e) {
      // Note: we deliberately do NOT check e.defaultPrevented here — Next.js's
      // <Link> always calls preventDefault() to intercept the browser's own
      // navigation before doing its own client-side routing, so that flag is
      // already true for every normal Link click by the time this runs.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      if (a.target && a.target !== '_self') return;
      if (a.hasAttribute('download')) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

      let url;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;

      beginLoading(url.pathname);
    }

    function onPopState() {
      beginLoading(window.location.pathname);
    }

    // Capture phase: run before React's own delegated click handling (which
    // is what calls preventDefault for Link), so detection never depends on
    // handler registration order.
    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPopState);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  useEffect(() => {
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;
    if (!visible) return;

    const elapsed = Date.now() - startRef.current;
    const remaining = Math.max(0, minDurationRef.current - elapsed);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setVisible(false), remaining);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="qn-nav-loader" role="status" aria-live="polite">
      <QniverseLogo compact spinning size={64} />
      <span className="qn-loader-label">{label}</span>
      <span className="qn-loader-bar"><i /></span>
    </div>
  );
}