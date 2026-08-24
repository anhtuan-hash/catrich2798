import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Footer from './Footer.jsx';

export default function GlobalDashboardFooterBridge({ route, language }) {
  const [host, setHost] = useState(null);

  useEffect(() => {
    if (route !== 'dashboard' || typeof document === 'undefined') {
      setHost(null);
      return undefined;
    }

    const resolveHost = () => setHost(document.querySelector('.app-shell'));
    resolveHost();
    const frame = window.requestAnimationFrame(resolveHost);
    return () => window.cancelAnimationFrame(frame);
  }, [route]);

  if (route !== 'dashboard' || !host) return null;

  return createPortal(<Footer language={language} />, host);
}
