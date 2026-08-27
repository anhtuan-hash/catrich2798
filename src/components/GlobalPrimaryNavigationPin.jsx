import { useLayoutEffect } from 'react';

/**
 * Performance-first navigation pin.
 *
 * Navigation positioning is handled by CSS. The runtime only publishes the
 * route and canonical desktop height; responsive CSS may reduce that height on
 * compact screens without measuring layout on scroll.
 */
export default function GlobalPrimaryNavigationPin({ route = '' }) {
  useLayoutEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const root = document.documentElement;
    root.dataset.besPrimaryNavActive = 'true';
    root.dataset.besPrimaryNavRoute = String(route || '');
    root.style.setProperty('--bes-primary-nav-height', '84px');
    root.style.setProperty('--bes-navigation-hub-height', '136px');

    return () => {
      root.removeAttribute('data-bes-primary-nav-active');
      root.removeAttribute('data-bes-primary-nav-route');
      root.style.removeProperty('--bes-primary-nav-height');
      root.style.removeProperty('--bes-navigation-hub-height');
    };
  }, [route]);

  return null;
}
