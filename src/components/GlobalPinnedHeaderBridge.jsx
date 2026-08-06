import { useLayoutEffect } from 'react';

const SHELL_SELECTOR = '.app-shell[data-route]';

function isUsable(element) {
  if (!element?.isConnected || element.hidden) return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height >= 0;
}

function findInside(shell, selector) {
  return shell?.querySelector(`:scope > ${selector}`)
    || shell?.querySelector(selector)
    || null;
}

function findNavigationElements(route = '') {
  const shells = [...document.querySelectorAll(SHELL_SELECTOR)];
  const routeMatches = route
    ? shells.filter((shell) => shell.dataset.route === route)
    : [];
  const candidates = [...routeMatches, ...shells.filter((shell) => !routeMatches.includes(shell))];

  for (const shell of candidates) {
    const chrome = findInside(shell, '.bes-top-chrome');
    const navigation = chrome?.querySelector(':scope > .brian-nav')
      || chrome?.querySelector('.brian-nav')
      || null;
    if (!isUsable(shell) || !isUsable(chrome) || !isUsable(navigation)) continue;

    const briefing = chrome?.querySelector(':scope > .brian-briefing-bar')
      || chrome?.querySelector('.brian-briefing-bar')
      || null;
    return { shell, chrome, navigation, briefing };
  }

  return { shell: null, chrome: null, navigation: null, briefing: null };
}

function sameElements(left = {}, right = {}) {
  return left.shell === right.shell
    && left.chrome === right.chrome
    && left.navigation === right.navigation
    && left.briefing === right.briefing;
}

function usableRect(element) {
  if (!isUsable(element)) return null;
  return element.getBoundingClientRect();
}

export default function GlobalPinnedHeaderBridge({ route = '' }) {
  useLayoutEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return undefined;

    let frame = 0;
    let settleTimer = 0;
    let resizeObserver = null;
    let chromeObserver = null;
    let documentObserver = null;
    let active = {};

    const root = document.documentElement;

    const clearRootGeometry = () => {
      root.style.removeProperty('--bes-pinned-nav-height');
      root.style.removeProperty('--bes-header-row-left');
      root.style.removeProperty('--bes-header-row-width');
    };

    const clearActiveElements = () => {
      resizeObserver?.disconnect();
      chromeObserver?.disconnect();

      active.shell?.removeAttribute('data-bes-nav-pinned');
      active.shell?.style.removeProperty('--bes-pinned-nav-height');
      active.shell?.style.removeProperty('--bes-header-row-left');
      active.shell?.style.removeProperty('--bes-header-row-width');

      active.chrome?.removeAttribute('data-bes-pinned-chrome');
      active.chrome?.style.removeProperty('--bes-pinned-nav-height');
      active.chrome?.style.removeProperty('--bes-chrome-base-padding-top');

      active.navigation?.removeAttribute('data-bes-pinned-navigation');
      active.briefing?.removeAttribute('data-bes-scrollable-briefing');
      active = {};
    };

    const scheduleMeasure = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };

    resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(scheduleMeasure)
      : null;
    chromeObserver = typeof MutationObserver !== 'undefined'
      ? new MutationObserver(scheduleMeasure)
      : null;

    const bindElements = (next) => {
      if (sameElements(active, next)) return;
      clearActiveElements();
      active = next;

      const basePaddingTop = Number.parseFloat(window.getComputedStyle(active.chrome).paddingTop) || 0;

      active.shell.dataset.besNavPinned = 'true';
      active.chrome.dataset.besPinnedChrome = 'true';
      active.chrome.style.setProperty('--bes-chrome-base-padding-top', `${basePaddingTop}px`);
      active.navigation.dataset.besPinnedNavigation = 'true';
      if (active.briefing) active.briefing.dataset.besScrollableBriefing = 'true';

      if (resizeObserver) {
        [active.shell, active.chrome, active.navigation, active.briefing]
          .filter(Boolean)
          .forEach((element) => resizeObserver.observe(element));
      }

      if (chromeObserver) {
        chromeObserver.observe(active.chrome, {
          attributes: true,
          attributeFilter: ['class', 'hidden'],
          childList: true,
          subtree: true,
          characterData: true,
        });
      }
    };

    function measure() {
      const next = findNavigationElements(route);
      if (!next.shell || !next.chrome || !next.navigation) {
        clearActiveElements();
        clearRootGeometry();
        return;
      }

      bindElements(next);

      const navigationRect = usableRect(next.navigation);
      const alignmentRect = usableRect(next.briefing)
        || usableRect(next.chrome)
        || navigationRect;
      if (!navigationRect || !alignmentRect) return;

      const height = Math.max(0, Math.ceil(navigationRect.height));
      const left = Math.max(0, Math.round(alignmentRect.left));
      const width = Math.max(
        0,
        Math.min(Math.round(alignmentRect.width), Math.max(0, window.innerWidth - left)),
      );

      next.shell.dataset.besNavPinned = 'true';
      next.shell.style.setProperty('--bes-pinned-nav-height', `${height}px`);
      next.shell.style.setProperty('--bes-header-row-left', `${left}px`);
      next.shell.style.setProperty('--bes-header-row-width', `${width}px`);
      next.chrome.style.setProperty('--bes-pinned-nav-height', `${height}px`);

      root.style.setProperty('--bes-pinned-nav-height', `${height}px`);
      root.style.setProperty('--bes-header-row-left', `${left}px`);
      root.style.setProperty('--bes-header-row-width', `${width}px`);
    }

    const scheduleSettledMeasure = () => {
      scheduleMeasure();
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(scheduleMeasure, 120);
    };

    measure();
    scheduleSettledMeasure();

    if (typeof MutationObserver !== 'undefined' && document.body) {
      documentObserver = new MutationObserver(scheduleSettledMeasure);
      documentObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-route'],
      });
    }

    window.addEventListener('resize', scheduleSettledMeasure, { passive: true });
    window.addEventListener('orientationchange', scheduleSettledMeasure, { passive: true });
    window.addEventListener('hashchange', scheduleSettledMeasure, { passive: true });
    window.addEventListener('popstate', scheduleSettledMeasure, { passive: true });
    window.addEventListener('pageshow', scheduleSettledMeasure, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
      documentObserver?.disconnect();
      window.removeEventListener('resize', scheduleSettledMeasure);
      window.removeEventListener('orientationchange', scheduleSettledMeasure);
      window.removeEventListener('hashchange', scheduleSettledMeasure);
      window.removeEventListener('popstate', scheduleSettledMeasure);
      window.removeEventListener('pageshow', scheduleSettledMeasure);
      clearActiveElements();
      clearRootGeometry();
    };
  }, [route]);

  return null;
}
