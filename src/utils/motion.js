const DEFAULT_COLOR = '#0078d4';
const ROUTE_TRANSITION_KEY = 'bes-route-transition-style';
const VALID_ROUTE_TRANSITIONS = new Set(['metro', 'book']);

// Kept for compatibility with older callers and settings data. Navigation is
// intentionally immediate in the performance-first runtime.
export const ROUTE_MOTION = Object.freeze({
  metro: Object.freeze({ navigateDelay: 0, sourceReleaseDelay: 0, overlayLifetime: 0 }),
  book: Object.freeze({ navigateDelay: 0, sourceReleaseDelay: 0, overlayLifetime: 0 }),
});

export function getRouteTransitionStyle() {
  if (typeof window === 'undefined') return 'metro';
  try {
    const stored = window.localStorage?.getItem(ROUTE_TRANSITION_KEY);
    return VALID_ROUTE_TRANSITIONS.has(stored) ? stored : 'metro';
  } catch {
    return 'metro';
  }
}

export function setRouteTransitionStyle(value) {
  const next = VALID_ROUTE_TRANSITIONS.has(value) ? value : 'metro';
  if (typeof document !== 'undefined') document.documentElement.dataset.routeTransition = next;
  if (typeof window !== 'undefined') {
    try { window.localStorage?.setItem(ROUTE_TRANSITION_KEY, next); } catch { /* optional preference */ }
    window.dispatchEvent(new CustomEvent('bes-route-transition-style-changed', { detail: { style: next } }));
  }
  return next;
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
  return false;
}

export function launchRoute({ target, sourceEl = null, navigate } = {}) {
  if (!target || typeof window === 'undefined') return;
  const go = typeof navigate === 'function'
    ? navigate
    : () => { window.location.hash = target; };

  if (window.location.hash === target) {
    sourceEl?.blur?.();
    return;
  }

  // Previous versions delayed navigation by 260–430 ms and mounted a large
  // animated overlay. Immediate routing removes that perceived pause and avoids
  // extra compositing/layout work on every app change.
  go();
  sourceEl?.blur?.();
}

if (typeof document !== 'undefined') {
  document.documentElement.dataset.routeTransition = 'off';
  document.documentElement.dataset.navigationPerformance = 'instant';
}

export { DEFAULT_COLOR };
