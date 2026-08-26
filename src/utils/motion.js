const DEFAULT_COLOR = '#0078d4';
const RETIRED_MOTION_KEYS = [
  'bes-route-transition-style',
  'bes-motion-mode',
  'motion-effects',
  'brian.ui.motion',
];

/* Compatibility export for callers that still import ROUTE_MOTION.
   Route motion is permanently retired, so every timing is zero. */
export const ROUTE_MOTION = Object.freeze({
  metro: Object.freeze({ navigateDelay: 0, sourceReleaseDelay: 0, overlayLifetime: 0 }),
  book: Object.freeze({ navigateDelay: 0, sourceReleaseDelay: 0, overlayLifetime: 0 }),
  off: Object.freeze({ navigateDelay: 0, sourceReleaseDelay: 0, overlayLifetime: 0 }),
});

function purgeRetiredMotionState() {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.removeAttribute('data-motion');
    root.removeAttribute('data-motion-effects');
    root.removeAttribute('data-route-transition');
    root.dataset.navigationPerformance = 'static';
  }

  if (typeof window !== 'undefined') {
    RETIRED_MOTION_KEYS.forEach((key) => {
      try { window.localStorage?.removeItem(key); } catch { /* optional storage */ }
    });
    window.clearTimeout(window.__besRouteLaunchTimer);
    window.clearTimeout(window.__besRouteSourceTimer);
    delete window.__besRouteLaunchTimer;
    delete window.__besRouteSourceTimer;
  }
}

export function getRouteTransitionStyle() {
  return 'off';
}

/* Kept only for backward-compatible imports. Motion preferences are no longer
   persisted or applied. */
export function setRouteTransitionStyle() {
  purgeRetiredMotionState();
  return 'off';
}

export function shouldAnimateRoute() {
  return false;
}

export function elementRect(sourceEl) {
  const rect = sourceEl?.getBoundingClientRect?.();
  if (!rect || rect.width <= 0 || rect.height <= 0) return null;
  return {
    x: Math.round(rect.left),
    y: Math.round(rect.top),
    w: Math.round(rect.width),
    h: Math.round(rect.height),
  };
}

export function previewRouteTransition() {
  purgeRetiredMotionState();
  return false;
}

export function launchRoute({ target, sourceEl = null, navigate } = {}) {
  if (!target || typeof window === 'undefined') return;
  purgeRetiredMotionState();

  const go = typeof navigate === 'function'
    ? navigate
    : () => { window.location.hash = target; };

  if (window.location.hash !== target) go();
  sourceEl?.classList?.remove('is-launching');
  sourceEl?.blur?.();
}

purgeRetiredMotionState();

export { DEFAULT_COLOR };
