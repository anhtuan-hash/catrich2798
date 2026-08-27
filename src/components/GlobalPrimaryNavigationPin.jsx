import { useLayoutEffect } from 'react';

/**
 * Performance-first navigation pin metadata.
 * Navigation Hub V3 owns sticky positioning for both the primary row and the
 * newswire. This runtime only publishes the route and canonical primary height.
 */
export default function GlobalPrimaryNavigationPin({ route = '' }) {
  useLayoutEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const root = document.documentElement;
    root.dataset.besPrimaryNavActive = 'true';
    root.dataset.besPrimaryNavRoute = String(route || '');
    root.style.setProperty('--bes-primary-nav-height', '64px');

    return () => {
      root.removeAttribute('data-bes-primary-nav-active');
      root.removeAttribute('data-bes-primary-nav-route');
      root.style.removeProperty('--bes-primary-nav-height');
    };
  }, [route]);

  return null;
}
