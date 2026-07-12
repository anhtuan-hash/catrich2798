import React, { useEffect, useRef, useState } from 'react';

export default function GlobalAccessibilityAnnouncer() {
  const [polite, setPolite] = useState('');
  const [assertive, setAssertive] = useState('');
  const timers = useRef({});

  useEffect(() => {
    const handler = (event) => {
      const detail = event.detail || {};
      const message = String(detail.message || '').trim();
      if (!message) return;
      const priority = detail.priority === 'assertive' ? 'assertive' : 'polite';
      const setter = priority === 'assertive' ? setAssertive : setPolite;
      setter('');
      window.clearTimeout(timers.current[priority]);
      timers.current[priority] = window.setTimeout(() => setter(message), 20);
    };
    window.addEventListener('bes-a11y-announce', handler);
    return () => {
      window.removeEventListener('bes-a11y-announce', handler);
      Object.values(timers.current).forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  return (
    <>
      <div className="bes-sr-only" aria-live="polite" aria-atomic="true">{polite}</div>
      <div className="bes-sr-only" aria-live="assertive" aria-atomic="true">{assertive}</div>
    </>
  );
}
