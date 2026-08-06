import { useLayoutEffect } from 'react';

const SHELL_SELECTOR = '.app-shell[data-route]';

function firstUsableElement(elements = []) {
  return elements.find((element) => (
    element?.isConnected
    && !element.hidden
    && element.getClientRects().length > 0
  )) || elements[0] || null;
}

function findNavigationElements(route = '') {
  const shells = [...document.querySelectorAll(SHELL_SELECTOR)];
  const matching = route
    ? shells.filter((shell) => shell.dataset.route === route)
    : shells;
  const shell = firstUsableElement([...matching, ...shells]);
  const chrome = shell?.querySelector(':scope > .bes-top-chrome')
    || shell?.querySelector('.bes-top-chrome')
    || null;
  const navigation = chrome?.querySelector(':scope > .brian-nav')
    || chrome?.querySelector('.brian-nav')
    || null;
  const briefing = chrome?.querySelector(':scope > .brian-briefing-bar')
    || chrome?.querySelector('.brian-briefing-bar')
    || null;
  return { shell, chrome, navigation, briefing };
}

function sameElements(left = {}, right = {}) {
  return left.shell === right.shell
    && left.chrome === right.chrome
    && left.navigation === right.navigation
    && left.briefing === right.briefing;
}

function usableRect(element) {
  if (!element?.isConnected) return null;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height >= 0 ? rect : null;
}

export default function GlobalPinnedHeaderBridge({ route = '' }) {
  useLayoutEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return undefined;

    let frame = 0;
    let resizeObserver = null;
    let chromeObserver = null;
    let documentObserver = null;
    let active = {};

    const root = document.documentElement;

    const clearRootGeometry = () => {
      root.style.removeProperty('--bes-pinned-nav-height');
      root.style.removeProperty('--bes-header-row-left');
      root.style.removeProperty('--bes-header-row-width');
      root.style.removeProperty('--bes-pinned-header-height');
    };

    const clearActiveElements = () => {
      resizeObserver?.disconnect();
      chromeObserver?.disconnect();

      active.shell?.removeAttribute('data-bes-nav-pinned');
      active.shell?.removeAttribute('data-bes-header-pinned');
      active.shell?.style.removeProperty('--bes-pinned-nav-height');
      active.shell?.style.removeProperty('--bes-header-row-left');
      active.shell?.style.removeProperty('--bes-header-row-width');
      active.shell?.style.removeProperty('--bes-pinned-header-height');
      active.chrome?.removeAttribute('data-bes-pinned-chrome');
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

      active.shell.dataset.besNavPinned = 'true';
      active.shell.removeAttribute('data-bes-header-pinned');
      active.chrome?.setAttribute('data-bes-pinned-chrome', 'true');
      active.navigation.setAttribute('data-bes-pinned-navigation', 'true');
      active.briefing?.setAttribute('data-bes-scrollable-briefing', 'true');

      if (resizeObserver) {
        [active.shell, active.chrome, active.navigation, active.briefing]
          .filter(Boolean)
          .forEach((element) => resizeObserver.observe(element));
      }
      if (chromeObserver && active.chrome) {
        chromeObserver.observe(active.chrome, {
          attributes: true,
          attributeFilter: ['class', 'style', 'hidden'],
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
      const availableWidth = Math.max(0, window.innerWidth - left);
      const width = Math.max(0, Math.min(Math.round(alignmentRect.width), availableWidth));

      next.shell.dataset.besNavPinned = 'true';
      next.shell.removeAttribute('data-bes-header-pinned');
      next.shell.style.setProperty('--bes-pinned-nav-height', `${height}px`);
      next.shell.style.setProperty('--bes-header-row-left', `${left}px`);
      next.shell.style.setProperty('--bes-header-row-width', `${width}px`);
      next.shell.style.removeProperty('--bes-pinned-header-height');

      root.style.setProperty('--bes-pinned-nav-height', `${height}px`);
      root.style.setProperty('--bes-header-row-left', `${left}px`);
      root.style.setProperty('--bes-header-row-width', `${width}px`);
      root.style.removeProperty('--bes-pinned-header-height');
    }

    measure();
    scheduleMeasure();

    if (typeof MutationObserver !== 'undefined' && document.body) {
      documentObserver = new MutationObserver(scheduleMeasure);
      documentObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-route'],
      });
    }

    window.addEventListener('resize', scheduleMeasure, { passive: true });
    window.addEventListener('orientationchange', scheduleMeasure, { passive: true });
    window.addEventListener('hashchange', scheduleMeasure, { passive: true });
    window.addEventListener('pageshow', scheduleMeasure, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      documentObserver?.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
      window.removeEventListener('orientationchange', scheduleMeasure);
      window.removeEventListener('hashchange', scheduleMeasure);
      window.removeEventListener('pageshow', scheduleMeasure);
      clearActiveElements();
      clearRootGeometry();
    };
  }, [route]);

  return null;
}
