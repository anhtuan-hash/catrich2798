import { useLayoutEffect } from 'react';

const SHELL_SELECTOR = '.app-shell[data-route]';
const SCROLL_REGION_SELECTOR = [
  'main#bes-main-content',
  'main.wp8-page-stage',
  '[role="main"]',
  '.app-shell[data-route]',
].join(',');

function isUsable(element) {
  if (!element?.isConnected || element.hidden) return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
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

function getCurrentScrollTop(shell) {
  const values = [
    window.scrollY,
    window.pageYOffset,
    document.scrollingElement?.scrollTop,
    document.documentElement?.scrollTop,
    document.body?.scrollTop,
    shell?.scrollTop,
  ];

  if (shell) {
    shell.querySelectorAll(SCROLL_REGION_SELECTOR).forEach((element) => {
      values.push(element.scrollTop);
    });
  }

  return Math.max(0, ...values.map((value) => Number(value) || 0));
}

export default function GlobalPinnedHeaderBridge({ route = '' }) {
  useLayoutEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return undefined;

    let measureFrame = 0;
    let scrollFrame = 0;
    let settleTimer = 0;
    let resizeObserver = null;
    let chromeObserver = null;
    let documentObserver = null;
    let active = {};

    const root = document.documentElement;

    const clearGeometry = () => {
      root.style.removeProperty('--bes-pinned-nav-height');
      active.shell?.style.removeProperty('--bes-pinned-nav-height');
    };

    const clearActiveElements = () => {
      resizeObserver?.disconnect();
      chromeObserver?.disconnect();

      active.shell?.removeAttribute('data-bes-nav-pinned');
      active.shell?.removeAttribute('data-bes-header-scrolled');
      active.shell?.style.removeProperty('--bes-pinned-nav-height');

      active.chrome?.removeAttribute('data-bes-pinned-chrome');
      active.chrome?.removeAttribute('data-bes-header-scrolled');
      active.navigation?.removeAttribute('data-bes-pinned-navigation');
      active.briefing?.removeAttribute('data-bes-scrollable-briefing');
      active = {};
    };

    const updateScrollState = () => {
      if (!active.shell || !active.chrome) return;
      const scrolled = getCurrentScrollTop(active.shell) > 12;
      const value = scrolled ? 'true' : 'false';
      active.shell.dataset.besHeaderScrolled = value;
      active.chrome.dataset.besHeaderScrolled = value;
    };

    const scheduleScrollState = () => {
      window.cancelAnimationFrame(scrollFrame);
      scrollFrame = window.requestAnimationFrame(updateScrollState);
    };

    const scheduleMeasure = () => {
      window.cancelAnimationFrame(measureFrame);
      measureFrame = window.requestAnimationFrame(measure);
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

      active.shell.dataset.besNavPinned = 'true';
      active.chrome.dataset.besPinnedChrome = 'true';
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

      updateScrollState();
    };

    function measure() {
      const next = findNavigationElements(route);
      if (!next.shell || !next.chrome || !next.navigation) {
        clearActiveElements();
        clearGeometry();
        return;
      }

      bindElements(next);

      const height = Math.max(0, Math.ceil(next.navigation.getBoundingClientRect().height));
      next.shell.style.setProperty('--bes-pinned-nav-height', `${height}px`);
      root.style.setProperty('--bes-pinned-nav-height', `${height}px`);
      updateScrollState();
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

    window.addEventListener('scroll', scheduleScrollState, { passive: true });
    document.addEventListener('scroll', scheduleScrollState, true);
    window.addEventListener('resize', scheduleSettledMeasure, { passive: true });
    window.addEventListener('orientationchange', scheduleSettledMeasure, { passive: true });
    window.addEventListener('hashchange', scheduleSettledMeasure, { passive: true });
    window.addEventListener('popstate', scheduleSettledMeasure, { passive: true });
    window.addEventListener('pageshow', scheduleSettledMeasure, { passive: true });

    return () => {
      window.cancelAnimationFrame(measureFrame);
      window.cancelAnimationFrame(scrollFrame);
      window.clearTimeout(settleTimer);
      documentObserver?.disconnect();
      window.removeEventListener('scroll', scheduleScrollState);
      document.removeEventListener('scroll', scheduleScrollState, true);
      window.removeEventListener('resize', scheduleSettledMeasure);
      window.removeEventListener('orientationchange', scheduleSettledMeasure);
      window.removeEventListener('hashchange', scheduleSettledMeasure);
      window.removeEventListener('popstate', scheduleSettledMeasure);
      window.removeEventListener('pageshow', scheduleSettledMeasure);
      clearActiveElements();
      clearGeometry();
    };
  }, [route]);

  return null;
}
