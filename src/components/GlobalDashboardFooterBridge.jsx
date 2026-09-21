import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Footer from './Footer.jsx';

export default function GlobalDashboardFooterBridge({ route, language }) {
  const [host, setHost] = useState(null);
  const [compactFooter, setCompactFooter] = useState(false);

  useEffect(() => {
    if (route !== 'dashboard' || typeof document === 'undefined') {
      setHost(null);
      return undefined;
    }

    const resolveHost = () => {
      setHost(document.querySelector('.app-shell'));
      setCompactFooter(window.location.hash.startsWith('#/assessment-core'));
    };
    resolveHost();
    const frame = window.requestAnimationFrame(resolveHost);
    window.addEventListener('hashchange', resolveHost);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('hashchange', resolveHost);
    };
  }, [route]);

  if (route !== 'dashboard' || !host) return null;

  return createPortal(<Footer language={language} compact={compactFooter} />, host);
}
