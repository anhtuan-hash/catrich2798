import { useLayoutEffect } from 'react';

const CLEAR_RUNTIME_KEY = '__besNavigationHubClearRuntimeV1';
const SCROLL_THRESHOLD = 12;

function documentScrollTop() {
  return Math.max(
    Number(window.scrollY) || 0,
    Number(window.pageYOffset) || 0,
    Number(document.scrollingElement?.scrollTop) || 0,
    Number(document.documentElement?.scrollTop) || 0,
    Number(document.body?.scrollTop) || 0,
  );
}

function targetScrollTop(target) {
  if (!target || target === window || target === document
    || target === document.documentElement || target === document.body
    || target === document.scrollingElement) {
    return documentScrollTop();
  }
  return Math.max(0, Number(target.scrollTop) || 0);
}

function restoreChrome(chrome) {
  if (!chrome) return;
  [
    'display', 'position', 'inset', 'top', 'right', 'bottom', 'left',
    'margin', 'padding', 'min-height', 'height', 'background', 'border',
    'box-shadow', 'transform',
  ].forEach((property) => chrome.style.removeProperty(property));
  chrome.removeAttribute('data-bes-pinned-chrome');
  chrome.removeAttribute('data-bes-header-scrolled');
}

function restoreHubElement(element) {
  if (!element) return;
  [
    'display', 'position', 'inset', 'width', 'height', 'min-height',
    'margin', 'padding', 'border', 'box-shadow', 'overflow',
  ].forEach((property) => element.style.removeProperty(property));
  element.removeAttribute('aria-hidden');
  element.removeAttribute('data-bes-pinned-navigation');
  element.removeAttribute('data-bes-scrollable-briefing');
}

function findChrome(route) {
  const routeName = String(route || '').replace(/[^a-z0-9/_-]/gi, '');
  const preferred = routeName
    ? document.querySelector(`.app-shell[data-route="${routeName}"] > .bes-top-chrome`)
    : null;
  return preferred || document.querySelector('.app-shell[data-route] > .bes-top-chrome') || document.querySelector('.bes-top-chrome');
}

export default function GlobalBrianHubController({ route = '' }) {
  useLayoutEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    window[CLEAR_RUNTIME_KEY]?.dispose?.();

    const chrome = findChrome(route);
    if (!chrome) return undefined;

    const shell = chrome.closest('.app-shell[data-route]');
    const navigation = chrome.querySelector(':scope > .brian-nav') || chrome.querySelector('.brian-nav');
    const briefings = [...chrome.querySelectorAll('.brian-briefing-bar')];

    restoreChrome(chrome);
    restoreHubElement(navigation);
    briefings.forEach(restoreHubElement);

    document.documentElement.style.removeProperty('--bes-pinned-nav-height');
    document.documentElement.style.removeProperty('scroll-padding-top');
    document.documentElement.dataset.besNavigationHub = 'rebuilt';
    shell?.removeAttribute('data-bes-nav-pinned');
    shell?.removeAttribute('data-bes-header-scrolled');
    shell?.style.removeProperty('--bes-pinned-nav-height');

    chrome.dataset.besGlobalHub = 'true';

    let frame = 0;
    const scrolledTargets = new Map();

    const updateState = () => {
      frame = 0;
      let maximum = documentScrollTop();

      scrolledTargets.forEach((_value, target) => {
        if (target instanceof Element && !target.isConnected) {
          scrolledTargets.delete(target);
          return;
        }
        const top = targetScrollTop(target);
        if (top <= SCROLL_THRESHOLD) {
          scrolledTargets.delete(target);
          return;
        }
        scrolledTargets.set(target, top);
        maximum = Math.max(maximum, top);
      });

      chrome.dataset.besHubScrolled = maximum > SCROLL_THRESHOLD ? 'true' : 'false';
    };

    const scheduleUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateState);
    };

    const handleScroll = (event) => {
      const target = event?.target || document.scrollingElement;
      const top = targetScrollTop(target);
      if (top > SCROLL_THRESHOLD) scrolledTargets.set(target, top);
      else scrolledTargets.delete(target);
      scheduleUpdate();
    };

    const restoreLateChildren = () => {
      const nextNavigation = chrome.querySelector(':scope > .brian-nav') || chrome.querySelector('.brian-nav');
      restoreHubElement(nextNavigation);
      chrome.querySelectorAll('.brian-briefing-bar').forEach(restoreHubElement);
      scheduleUpdate();
    };

    const observer = typeof MutationObserver !== 'undefined'
      ? new MutationObserver(restoreLateChildren)
      : null;
    observer?.observe(chrome, { childList: true, subtree: true });

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', scheduleUpdate, { passive: true });
    window.addEventListener('pageshow', scheduleUpdate, { passive: true });

    updateState();

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('pageshow', scheduleUpdate);
      chrome.removeAttribute('data-bes-global-hub');
      chrome.removeAttribute('data-bes-hub-scrolled');
    };
  }, [route]);

  return null;
}
