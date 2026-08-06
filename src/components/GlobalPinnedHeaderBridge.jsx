import { useLayoutEffect } from 'react';

const SHELL_SELECTOR = '.app-shell[data-route]';
const SCROLL_THRESHOLD = 12;

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

function documentScrollTop() {
  return Math.max(
    Number(window.scrollY) || 0,
    Number(window.pageYOffset) || 0,
    Number(document.scrollingElement?.scrollTop) || 0,
    Number(document.documentElement?.scrollTop) || 0,
    Number(document.body?.scrollTop) || 0,
  );
}

function normalizeScrollTarget(target) {
  if (!target || target === window || target === document) {
    return document.scrollingElement || document.documentElement;
  }
  return target;
}

function readScrollTop(target) {
  const normalized = normalizeScrollTarget(target);
  if (
    normalized === document.scrollingElement
    || normalized === document.documentElement
    || normalized === document.body
  ) {
    return documentScrollTop();
  }
  return Math.max(0, Number(normalized?.scrollTop) || 0);
}

function isRelevantScrollTarget(target, shell) {
  const normalized = normalizeScrollTarget(target);
  if (!shell || !normalized) return false;
  if (
    normalized === document.scrollingElement
    || normalized === document.documentElement
    || normalized === document.body
  ) return true;
  if (!(normalized instanceof Element)) return false;
  return normalized === shell
    || shell.contains(normalized)
    || normalized.contains(shell);
}

function seedScrolledTargets(shell, trackedTargets) {
  trackedTargets.clear();
  if (!shell) return;

  const candidates = new Set([
    document.scrollingElement,
    document.documentElement,
    document.body,
    shell,
  ]);

  let ancestor = shell.parentElement;
  while (ancestor) {
    candidates.add(ancestor);
    ancestor = ancestor.parentElement;
  }

  // Some Brian routes restore a nested scroller before the global header bridge
  // finishes binding. Seed only elements that are already vertically displaced;
  // all later scroll containers are learned from the captured scroll event itself.
  shell.querySelectorAll('*').forEach((element) => {
    if ((Number(element.scrollTop) || 0) > 0) candidates.add(element);
  });

  candidates.forEach((candidate) => {
    if (!candidate || !isRelevantScrollTarget(candidate, shell)) return;
    const top = readScrollTop(candidate);
    if (top > 0) trackedTargets.set(candidate, top);
  });
}

function currentTrackedScrollTop(shell, trackedTargets) {
  let maximum = Math.max(documentScrollTop(), Number(shell?.scrollTop) || 0);

  trackedTargets.forEach((storedTop, target) => {
    if (target instanceof Element && !target.isConnected) {
      trackedTargets.delete(target);
      return;
    }
    if (!isRelevantScrollTarget(target, shell)) {
      trackedTargets.delete(target);
      return;
    }

    const liveTop = readScrollTop(target);
    if (liveTop <= 0) trackedTargets.delete(target);
    else trackedTargets.set(target, liveTop);
    maximum = Math.max(maximum, liveTop, Number(storedTop) || 0);
  });

  return maximum;
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
    const trackedScrollTargets = new Map();

    const root = document.documentElement;

    const clearGeometry = () => {
      root.style.removeProperty('--bes-pinned-nav-height');
      active.shell?.style.removeProperty('--bes-pinned-nav-height');
    };

    const clearActiveElements = () => {
      resizeObserver?.disconnect();
      chromeObserver?.disconnect();
      trackedScrollTargets.clear();

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
      const scrolled = currentTrackedScrollTop(active.shell, trackedScrollTargets) > SCROLL_THRESHOLD;
      const value = scrolled ? 'true' : 'false';
      active.shell.dataset.besHeaderScrolled = value;
      active.chrome.dataset.besHeaderScrolled = value;
    };

    const scheduleScrollState = () => {
      window.cancelAnimationFrame(scrollFrame);
      scrollFrame = window.requestAnimationFrame(updateScrollState);
    };

    const handleScroll = (event) => {
      if (!active.shell) return;
      const target = normalizeScrollTarget(event?.target);
      if (!isRelevantScrollTarget(target, active.shell)) return;

      const top = readScrollTop(target);
      if (top > 0) trackedScrollTargets.set(target, top);
      else trackedScrollTargets.delete(target);
      scheduleScrollState();
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
      seedScrolledTargets(active.shell, trackedScrollTargets);

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
      settleTimer = window.setTimeout(() => {
        scheduleMeasure();
        scheduleScrollState();
      }, 120);
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

    // The document capture listener receives scroll events from every nested
    // route scroller, even though the native scroll event does not bubble.
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, true);
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
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll, true);
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
