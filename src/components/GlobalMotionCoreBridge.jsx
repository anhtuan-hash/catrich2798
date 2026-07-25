import { useEffect } from 'react';
import {
  disposeMotionCore,
  installMotionCoreApi,
  runSemanticMotion,
} from '../motion/englishHubMotionCore.js';
import '../motion/EnglishHubMotionCore.css';
import '../motion/EnglishHubInteractiveHover.css';
import './GlobalNavigationHoverRepair.css';

function isIgnored(element) {
  return Boolean(element?.closest?.('[data-motion-ignore="true"], .motion-lab-panel iframe'));
}

function resolveEventTarget(detail, fallbackSelector = '') {
  if (detail?.target instanceof Element) return detail.target;
  if (detail?.selector) {
    try {
      const selected = document.querySelector(detail.selector);
      if (selected) return selected;
    } catch {
      // Ignore invalid external selectors.
    }
  }
  return fallbackSelector ? document.querySelector(fallbackSelector) : null;
}

/**
 * Performance-first global motion bridge.
 *
 * The old bridge watched every DOM mutation (including text changes), scanned
 * whole subtrees, calculated cursor styles on pointer-over and created a new
 * ripple DOM layer for every click. Large dashboards and editors update the DOM
 * frequently, so that global work could block the main thread even when no
 * animation was visible.
 *
 * This bridge keeps the public motion API and explicit semantic events, while
 * leaving ordinary hover/press feedback to lightweight CSS transitions.
 */
export default function GlobalMotionCoreBridge({ route }) {
  useEffect(() => {
    installMotionCoreApi();
    document.documentElement.dataset.motionRuntime = 'light';

    const onClick = (event) => {
      const explicit = event.target instanceof Element
        ? event.target.closest('[data-motion-effect], [data-motion-semantic]')
        : null;
      if (!explicit || isIgnored(explicit)) return;

      if (explicit.dataset.motionSemantic) {
        runSemanticMotion(explicit, explicit.dataset.motionSemantic);
      } else if (explicit.dataset.motionEffect) {
        window.EnglishHubMotion?.run?.(explicit, explicit.dataset.motionEffect);
      }
    };

    const onSuccess = (event) => {
      const target = resolveEventTarget(event.detail, 'main');
      if (target instanceof Element) runSemanticMotion(target, 'success');
    };

    const onError = (event) => {
      const target = resolveEventTarget(event.detail) || document.activeElement;
      if (target instanceof Element) runSemanticMotion(target, 'error');
    };

    const onNotify = (event) => {
      const target = resolveEventTarget(event.detail, '.brian-nav__notification-button');
      if (target instanceof Element) runSemanticMotion(target, 'notify');
    };

    const onFocus = (event) => {
      const target = resolveEventTarget(event.detail);
      if (target instanceof Element) runSemanticMotion(target, 'focus');
    };

    document.addEventListener('click', onClick, true);
    window.addEventListener('bes-motion-success', onSuccess);
    window.addEventListener('bes-motion-error', onError);
    window.addEventListener('bes-motion-notify', onNotify);
    window.addEventListener('bes-motion-focus', onFocus);

    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('bes-motion-success', onSuccess);
      window.removeEventListener('bes-motion-error', onError);
      window.removeEventListener('bes-motion-notify', onNotify);
      window.removeEventListener('bes-motion-focus', onFocus);
      disposeMotionCore();
      delete document.documentElement.dataset.motionRuntime;
    };
  }, []);

  useEffect(() => {
    // Route changes no longer trigger a subtree scan. Expose the active route
    // only for diagnostics and CSS; this write does not force layout.
    document.documentElement.dataset.motionRoute = String(route || '');
  }, [route]);

  return null;
}
