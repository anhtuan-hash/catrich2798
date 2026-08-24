import { useLayoutEffect } from 'react';

/**
 * Performance-first navigation pin.
 *
 * Navigation positioning is handled by CSS. The previous runtime watched the
 * entire document, measured layout on every scroll frame and rewrote ancestor
 * styles. That work happened on every route and was a major source of jank.
 *
 * The primary navigation now has one geometry contract across every viewport:
 * 76px tall. Responsive rules may hide labels or allow horizontal scrolling,
 * but they must never resize the navigation bar itself.
 */
export default function GlobalPrimaryNavigationPin({ route = '' }) {
  useLayoutEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const root = document.documentElement;
    root.dataset.besPrimaryNavActive = 'true';
    root.dataset.besPrimaryNavRoute = String(route || '');
    root.style.setProperty('--bes-primary-nav-height', '76px');

    return () => {
      root.removeAttribute('data-bes-primary-nav-active');
      root.removeAttribute('data-bes-primary-nav-route');
      root.style.removeProperty('--bes-primary-nav-height');
    };
  }, [route]);

  return null;
}
