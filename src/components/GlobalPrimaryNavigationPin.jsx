import { useLayoutEffect } from 'react';

/**
 * Performance-first navigation pin.
 *
 * Navigation positioning is handled by CSS. This runtime only marks the
 * already-mounted chrome/nav once per route; it does not watch the document,
 * listen to scroll, measure layout, or rewrite ancestor styles.
 */
export default function GlobalPrimaryNavigationPin({ route = '' }) {
  useLayoutEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const root = document.documentElement;
    const shell = document.querySelector(`.app-shell[data-route="${String(route || '').replace(/"/g, '')}"]`)
      || document.querySelector('.app-shell[data-route]');
    const chrome = shell?.querySelector(':scope > .bes-top-chrome')
      || shell?.querySelector('.bes-top-chrome')
      || document.querySelector('.bes-top-chrome');
    const navigation = chrome?.querySelector(':scope > .brian-nav')
      || chrome?.querySelector('.brian-nav')
      || document.querySelector('.brian-nav');

    root.dataset.besPrimaryNavActive = 'true';
    root.dataset.besPrimaryNavRoute = String(route || '');
    shell?.setAttribute('data-bes-primary-nav-shell', 'true');
    chrome?.setAttribute('data-bes-primary-nav-host', 'true');
    navigation?.setAttribute('data-bes-primary-nav-fixed', 'true');

    return () => {
      root.removeAttribute('data-bes-primary-nav-active');
      root.removeAttribute('data-bes-primary-nav-route');
      shell?.removeAttribute('data-bes-primary-nav-shell');
      chrome?.removeAttribute('data-bes-primary-nav-host');
      navigation?.removeAttribute('data-bes-primary-nav-fixed');
    };
  }, [route]);

  return null;
}
