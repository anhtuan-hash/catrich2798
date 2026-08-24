import { useLayoutEffect, useState } from 'react';

/** Resolve the persistent top chrome without watching the full document. */
export default function useTopChromeHost() {
  const [host, setHost] = useState(null);

  useLayoutEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const findHost = () => {
      const next = document.querySelector('.bes-top-chrome');
      if (next) setHost((current) => (current === next ? current : next));
      return next;
    };

    if (findHost()) return undefined;
    const frame = window.requestAnimationFrame(findHost);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return host;
}
