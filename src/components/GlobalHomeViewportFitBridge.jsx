import { useEffect } from 'react';

const HOME_SELECTOR = ".metro-clean-system[data-route='home']";

function clearHomeFit() {
  document.querySelectorAll(HOME_SELECTOR).forEach((root) => {
    root.removeAttribute('data-home-viewport-fit');
    root.removeAttribute('data-home-viewport-density');
    root.style.removeProperty('--bes-home-chrome-height');
    root.style.removeProperty('--bes-home-stage-height');
  });
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
      const chrome = root?.querySelector(':scope > .bes-top-chrome')
        || root?.querySelector('.bes-top-chrome');

      if (!root || !chrome) {
        window.clearTimeout(retryTimer);
        retryTimer = window.setTimeout(scheduleMeasure, 120);
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
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };

    scheduleMeasure();
    window.addEventListener('resize', scheduleMeasure, { passive: true });
    window.addEventListener('orientationchange', scheduleMeasure, { passive: true });
    window.visualViewport?.addEventListener('resize', scheduleMeasure, { passive: true });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
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
