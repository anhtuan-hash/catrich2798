import { useEffect } from 'react';

const HOME_SELECTOR = ".metro-clean-system[data-route='home']";
const APPROVED_HOME_SELECTOR = '.bha-home';
const LEGACY_HOME_SELECTOR = '.brian-overlap-home';

function clearRootFit(root) {
  if (!root) return;
  root.removeAttribute('data-home-viewport-fit');
  root.removeAttribute('data-home-viewport-density');
  root.style.removeProperty('--bes-home-chrome-height');
  root.style.removeProperty('--bes-home-stage-height');
}

function clearHomeFit() {
  document.querySelectorAll(HOME_SELECTOR).forEach(clearRootFit);
}

export default function GlobalHomeViewportFitBridge({ route = 'home' }) {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    clearHomeFit();
    if (route !== 'home') return undefined;

    let cancelled = false;
    let frame = 0;
    let retryTimer = 0;
    let resizeObserver = null;
    let observedChrome = null;
    let lastSignature = '';

    const measure = () => {
      if (cancelled) return;

      const root = document.querySelector(HOME_SELECTOR);
      if (!root) {
        window.clearTimeout(retryTimer);
        retryTimer = window.setTimeout(scheduleMeasure, 100);
        return;
      }

      const approvedHome = root.querySelector(APPROVED_HOME_SELECTOR);
      const legacyHome = root.querySelector(LEGACY_HOME_SELECTOR);

      // HomeApproved is a normal scrolling document. The legacy viewport-fit
      // contract forces <main> to one viewport and clips the Weekly Practice hub.
      if (approvedHome) {
        clearRootFit(root);
        resizeObserver?.disconnect();
        observedChrome = null;
        return;
      }

      // The lazy Home chunk may not be mounted yet. Never guess the homepage
      // layout: wait until either the approved or legacy root is identifiable.
      if (!legacyHome) {
        window.clearTimeout(retryTimer);
        retryTimer = window.setTimeout(scheduleMeasure, 100);
        return;
      }

      const chrome = root.querySelector(':scope > .bes-top-chrome')
        || root.querySelector('.bes-top-chrome');

      if (!chrome) {
        window.clearTimeout(retryTimer);
        retryTimer = window.setTimeout(scheduleMeasure, 100);
        return;
      }

      if (observedChrome !== chrome && typeof ResizeObserver !== 'undefined') {
        resizeObserver?.disconnect();
        resizeObserver = new ResizeObserver(scheduleMeasure);
        resizeObserver.observe(chrome);
        observedChrome = chrome;
      }

      const viewportHeight = Math.round(window.visualViewport?.height || window.innerHeight || 0);
      const chromeHeight = Math.ceil(chrome.getBoundingClientRect().height);
      const stageHeight = Math.max(1, viewportHeight - chromeHeight);
      const density = stageHeight < 560 ? 'tight' : stageHeight < 700 ? 'compact' : 'roomy';
      const signature = `${viewportHeight}:${chromeHeight}:${stageHeight}:${density}`;

      if (signature === lastSignature && root.dataset.homeViewportFit === 'ready') return;
      lastSignature = signature;

      root.style.setProperty('--bes-home-chrome-height', `${chromeHeight}px`);
      root.style.setProperty('--bes-home-stage-height', `${stageHeight}px`);
      root.dataset.homeViewportFit = 'ready';
      root.dataset.homeViewportDensity = density;
    };

    const scheduleMeasure = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };

    scheduleMeasure();
    window.addEventListener('resize', scheduleMeasure, { passive: true });
    window.addEventListener('orientationchange', scheduleMeasure, { passive: true });
    window.visualViewport?.addEventListener('resize', scheduleMeasure, { passive: true });

    return () => {
      cancelled = true;
      if (frame) window.cancelAnimationFrame(frame);
      window.clearTimeout(retryTimer);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
      window.removeEventListener('orientationchange', scheduleMeasure);
      window.visualViewport?.removeEventListener('resize', scheduleMeasure);
      clearHomeFit();
    };
  }, [route]);

  return null;
}
