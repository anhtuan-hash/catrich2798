import { useLayoutEffect } from 'react';

const MIN_NAV_HEIGHT = 68;

function findRouteChrome(route) {
  const shells = [...document.querySelectorAll('.app-shell[data-route]')];
  const preferred = shells.find((shell) => shell.dataset.route === route) || shells[0];
  return preferred?.querySelector(':scope > .bes-top-chrome')
    || preferred?.querySelector('.bes-top-chrome')
    || document.querySelector('.bes-top-chrome');
}

function removeLegacyInlineStyles(element) {
  if (!element) return;
  [
    'display', 'position', 'inset', 'inset-block', 'inset-inline',
    'top', 'right', 'bottom', 'left', 'width', 'height', 'min-height',
    'max-height', 'margin', 'padding', 'border', 'box-shadow', 'overflow',
    'opacity', 'visibility', 'pointer-events', 'transform', 'translate',
  ].forEach((property) => element.style.removeProperty(property));
}

export default function GlobalPrimaryNavigationPin({ route = '' }) {
  useLayoutEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    let frame = 0;
    let chrome = null;
    let navigation = null;
    let resizeObserver = null;
    let mutationObserver = null;

    const root = document.documentElement;

    const clearBinding = () => {
      resizeObserver?.disconnect();
      chrome?.removeAttribute('data-bes-primary-nav-host');
      chrome?.style.removeProperty('--bes-primary-nav-height');
      navigation?.removeAttribute('data-bes-primary-nav-fixed');
      root.style.removeProperty('--bes-primary-nav-height');
      chrome = null;
      navigation = null;
    };

    const measure = () => {
      frame = 0;
      if (!navigation?.isConnected || !chrome?.isConnected) return;
      const height = Math.max(MIN_NAV_HEIGHT, Math.ceil(navigation.getBoundingClientRect().height || 0));
      const value = `${height}px`;
      chrome.style.setProperty('--bes-primary-nav-height', value);
      root.style.setProperty('--bes-primary-nav-height', value);
    };

    const scheduleMeasure = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };

    const bind = () => {
      const nextChrome = findRouteChrome(route);
      const nextNavigation = nextChrome?.querySelector(':scope > .brian-nav')
        || nextChrome?.querySelector('.brian-nav')
        || null;

      if (!nextChrome || !nextNavigation) return;
      if (nextChrome === chrome && nextNavigation === navigation) {
        scheduleMeasure();
        return;
      }

      clearBinding();
      chrome = nextChrome;
      navigation = nextNavigation;

      chrome.removeAttribute('data-bes-pinned-chrome');
      chrome.removeAttribute('data-bes-hub-scrolled');
      chrome.removeAttribute('data-bes-header-scrolled');
      navigation.removeAttribute('data-bes-pinned-navigation');
      navigation.removeAttribute('aria-hidden');

      removeLegacyInlineStyles(chrome);
      removeLegacyInlineStyles(navigation);
      chrome.querySelectorAll('.brian-briefing-bar').forEach((briefing) => {
        briefing.removeAttribute('data-bes-scrollable-briefing');
        briefing.removeAttribute('aria-hidden');
        removeLegacyInlineStyles(briefing);
      });

      chrome.dataset.besPrimaryNavHost = 'true';
      navigation.dataset.besPrimaryNavFixed = 'true';

      resizeObserver = typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(scheduleMeasure)
        : null;
      resizeObserver?.observe(navigation);
      scheduleMeasure();
    };

    bind();

    mutationObserver = typeof MutationObserver !== 'undefined'
      ? new MutationObserver(bind)
      : null;
    mutationObserver?.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('resize', scheduleMeasure, { passive: true });
    window.addEventListener('orientationchange', scheduleMeasure, { passive: true });
    window.addEventListener('pageshow', bind, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      mutationObserver?.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
      window.removeEventListener('orientationchange', scheduleMeasure);
      window.removeEventListener('pageshow', bind);
      clearBinding();
    };
  }, [route]);

  return null;
}
