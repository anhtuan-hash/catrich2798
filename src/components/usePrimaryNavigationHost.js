import { useLayoutEffect, useState } from 'react';

/**
 * Resolve the primary navigation host after React commits the navigation.
 * The shell is persistent across routes, so a document-wide MutationObserver
 * is unnecessary. A single RAF retry covers the initial mount edge case.
 */
export default function usePrimaryNavigationHost() {
  const [host, setHost] = useState(null);

  useLayoutEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const findHost = () => {
      const next = document.querySelector('.brian-nav__primary');
      if (next) setHost((current) => (current === next ? current : next));
      return next;
    };

    if (findHost()) return undefined;
    const frame = window.requestAnimationFrame(findHost);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return host;
}
