import { useLayoutEffect } from 'react';

const MIN_NAV_HEIGHT = 68;
const DESKTOP_EDGE = 8;
const MOBILE_EDGE = 6;
const MOBILE_BREAKPOINT = 820;

const NAV_STYLE_PROPERTIES = [
  'position', 'inset', 'inset-block', 'inset-inline', 'inset-block-start',
  'inset-inline-start', 'top', 'right', 'bottom', 'left', 'width', 'min-width',
  'max-width', 'margin', 'z-index', 'transform', 'translate', 'will-change',
];

const ANCESTOR_PROPERTIES = [
  'transform', 'translate', 'scale', 'rotate', 'filter', 'backdrop-filter',
  '-webkit-backdrop-filter', 'perspective', 'contain', 'content-visibility',
  'will-change', 'clip-path', 'mask', '-webkit-mask', 'overflow',
];

function isVisible(element) {
  if (!element?.isConnected || element.hidden) return false;
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 120 && rect.height > 20;
}

function routeCandidates(route) {
  const shells = [...document.querySelectorAll('.app-shell[data-route]')];
  const exact = shells.filter((shell) => shell.dataset.route === route);
  return [...exact, ...shells.filter((shell) => !exact.includes(shell))];
}

function findActiveNavigation(route) {
  const candidates = routeCandidates(route);
  let fallback = null;

  for (const shell of candidates) {
    const chromes = [
      ...shell.querySelectorAll(':scope > .bes-top-chrome'),
      ...shell.querySelectorAll('.bes-top-chrome'),
    ];

    for (const chrome of [...new Set(chromes)]) {
      const navigation = chrome.querySelector(':scope > .brian-nav')
        || chrome.querySelector('.brian-nav');
      if (!navigation) continue;
      fallback ||= { shell, chrome, navigation };
      if (isVisible(shell) && isVisible(chrome) && isVisible(navigation)) {
        return { shell, chrome, navigation };
      }
    }
  }

  const visibleNavigation = [...document.querySelectorAll('.brian-nav')].find(isVisible);
  if (visibleNavigation) {
    return {
      shell: visibleNavigation.closest('.app-shell[data-route]'),
      chrome: visibleNavigation.closest('.bes-top-chrome'),
      navigation: visibleNavigation,
    };
  }

  return fallback;
}

function snapshotInlineStyle(element, properties) {
  return properties.map((property) => ({
    property,
    value: element.style.getPropertyValue(property),
    priority: element.style.getPropertyPriority(property),
  }));
}

function restoreInlineStyle(element, snapshot = []) {
  if (!element) return;
  snapshot.forEach(({ property, value, priority }) => {
    if (value) element.style.setProperty(property, value, priority);
    else element.style.removeProperty(property);
  });
}

function setImportant(element, property, value) {
  element.style.setProperty(property, value, 'important');
}

function neutralizeContainingBlocks(navigation) {
  const records = [];
  let ancestor = navigation.parentElement;

  while (ancestor && ancestor !== document.body && ancestor !== document.documentElement) {
    records.push({
      element: ancestor,
      snapshot: snapshotInlineStyle(ancestor, ANCESTOR_PROPERTIES),
    });

    setImportant(ancestor, 'transform', 'none');
    setImportant(ancestor, 'translate', 'none');
    setImportant(ancestor, 'scale', 'none');
    setImportant(ancestor, 'rotate', 'none');
    setImportant(ancestor, 'filter', 'none');
    setImportant(ancestor, 'backdrop-filter', 'none');
    setImportant(ancestor, '-webkit-backdrop-filter', 'none');
    setImportant(ancestor, 'perspective', 'none');
    setImportant(ancestor, 'contain', 'none');
    setImportant(ancestor, 'content-visibility', 'visible');
    setImportant(ancestor, 'will-change', 'auto');
    setImportant(ancestor, 'clip-path', 'none');
    setImportant(ancestor, 'mask', 'none');
    setImportant(ancestor, '-webkit-mask', 'none');
    setImportant(ancestor, 'overflow', 'visible');
    ancestor.dataset.besFixedNavAncestor = 'true';
    ancestor = ancestor.parentElement;
  }

  return records;
}

function restoreContainingBlocks(records = []) {
  records.forEach(({ element, snapshot }) => {
    if (!element) return;
    restoreInlineStyle(element, snapshot);
    element.removeAttribute('data-bes-fixed-nav-ancestor');
  });
}

function edgeSize() {
  return window.innerWidth <= MOBILE_BREAKPOINT ? MOBILE_EDGE : DESKTOP_EDGE;
}

export default function GlobalPrimaryNavigationPin({ route = '' }) {
  useLayoutEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    let frame = 0;
    let chrome = null;
    let shell = null;
    let navigation = null;
    let navigationSnapshot = [];
    let ancestorRecords = [];
    let resizeObserver = null;
    let mutationObserver = null;
    let offsetX = 0;
    let offsetY = 0;

    const root = document.documentElement;

    const applyViewportFixedStyles = () => {
      if (!navigation) return;
      const edge = edgeSize();
      const horizontalGap = edge * 2;

      setImportant(navigation, 'position', 'fixed');
      setImportant(navigation, 'inset', 'auto');
      setImportant(navigation, 'inset-block', 'auto');
      setImportant(navigation, 'inset-inline', 'auto');
      setImportant(navigation, 'inset-block-start', `${edge}px`);
      setImportant(navigation, 'inset-inline-start', `${edge}px`);
      setImportant(navigation, 'top', `${edge}px`);
      setImportant(navigation, 'right', 'auto');
      setImportant(navigation, 'bottom', 'auto');
      setImportant(navigation, 'left', `${edge}px`);
      setImportant(navigation, 'width', `calc(100vw - ${horizontalGap}px)`);
      setImportant(navigation, 'min-width', '0');
      setImportant(navigation, 'max-width', 'none');
      setImportant(navigation, 'margin', '0');
      setImportant(navigation, 'z-index', '2147483000');
      setImportant(navigation, 'translate', 'none');
      setImportant(navigation, 'will-change', 'transform');
      setImportant(navigation, 'transform', `translate3d(${offsetX}px, ${offsetY}px, 0)`);
    };

    const clearBinding = () => {
      resizeObserver?.disconnect();
      resizeObserver = null;

      shell?.removeAttribute('data-bes-primary-nav-shell');
      chrome?.removeAttribute('data-bes-primary-nav-host');
      chrome?.style.removeProperty('--bes-primary-nav-height');
      navigation?.removeAttribute('data-bes-primary-nav-fixed');
      restoreInlineStyle(navigation, navigationSnapshot);
      restoreContainingBlocks(ancestorRecords);

      root.style.removeProperty('--bes-primary-nav-height');
      root.removeAttribute('data-bes-primary-nav-active');

      shell = null;
      chrome = null;
      navigation = null;
      navigationSnapshot = [];
      ancestorRecords = [];
      offsetX = 0;
      offsetY = 0;
    };

    const measureAndEnforce = () => {
      frame = 0;
      if (!navigation?.isConnected || !chrome?.isConnected) return;

      applyViewportFixedStyles();

      const edge = edgeSize();
      let rect = navigation.getBoundingClientRect();
      const deltaX = edge - rect.left;
      const deltaY = edge - rect.top;

      // Fallback for browsers/layouts where a transformed scrolling ancestor still
      // establishes the containing block. Counter-translation keeps the real DOM
      // rectangle attached to the viewport even inside a nested workspace.
      if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
        offsetX += deltaX;
        offsetY += deltaY;
        setImportant(navigation, 'transform', `translate3d(${offsetX}px, ${offsetY}px, 0)`);
        rect = navigation.getBoundingClientRect();
      }

      const height = Math.max(MIN_NAV_HEIGHT, Math.ceil(rect.height || 0));
      const value = `${height}px`;
      chrome.style.setProperty('--bes-primary-nav-height', value);
      root.style.setProperty('--bes-primary-nav-height', value);
      root.dataset.besPrimaryNavActive = 'true';
    };

    const scheduleMeasure = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(measureAndEnforce);
    };

    const bind = () => {
      const next = findActiveNavigation(route);
      if (!next?.chrome || !next?.navigation) return;

      if (next.chrome === chrome && next.navigation === navigation) {
        applyViewportFixedStyles();
        scheduleMeasure();
        return;
      }

      clearBinding();
      ({ shell, chrome, navigation } = next);

      navigationSnapshot = snapshotInlineStyle(navigation, NAV_STYLE_PROPERTIES);
      ancestorRecords = neutralizeContainingBlocks(navigation);

      shell?.setAttribute('data-bes-primary-nav-shell', 'true');
      chrome.removeAttribute('data-bes-pinned-chrome');
      chrome.removeAttribute('data-bes-hub-scrolled');
      chrome.removeAttribute('data-bes-header-scrolled');
      chrome.dataset.besPrimaryNavHost = 'true';

      navigation.removeAttribute('data-bes-pinned-navigation');
      navigation.removeAttribute('aria-hidden');
      navigation.dataset.besPrimaryNavFixed = 'true';

      chrome.querySelectorAll('.brian-briefing-bar').forEach((briefing) => {
        briefing.removeAttribute('data-bes-scrollable-briefing');
        briefing.removeAttribute('aria-hidden');
      });

      applyViewportFixedStyles();

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

    // Capture scroll from window and every nested workspace. This listener does
    // not hide anything; it only enforces the navigation's viewport coordinates.
    window.addEventListener('scroll', scheduleMeasure, { passive: true });
    document.addEventListener('scroll', scheduleMeasure, true);
    window.addEventListener('resize', scheduleMeasure, { passive: true });
    window.addEventListener('orientationchange', scheduleMeasure, { passive: true });
    window.addEventListener('hashchange', bind, { passive: true });
    window.addEventListener('pageshow', bind, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      mutationObserver?.disconnect();
      window.removeEventListener('scroll', scheduleMeasure);
      document.removeEventListener('scroll', scheduleMeasure, true);
      window.removeEventListener('resize', scheduleMeasure);
      window.removeEventListener('orientationchange', scheduleMeasure);
      window.removeEventListener('hashchange', bind);
      window.removeEventListener('pageshow', bind);
      clearBinding();
    };
  }, [route]);

  return null;
}
