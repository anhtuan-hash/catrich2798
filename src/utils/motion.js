const DEFAULT_COLOR = '#0078d4';
const ROUTE_TRANSITION_KEY = 'bes-route-transition-style';
const VALID_ROUTE_TRANSITIONS = new Set(['metro', 'book']);
const VALID_MOTION_MODES = new Set(['lite', 'full', 'off']);

export const ROUTE_MOTION = Object.freeze({
  metro: Object.freeze({ navigateDelay: 180, sourceReleaseDelay: 230, overlayLifetime: 360 }),
  book: Object.freeze({ navigateDelay: 240, sourceReleaseDelay: 290, overlayLifetime: 460 }),
});

function readMotionMode() {
  if (typeof document !== 'undefined') {
    const active = document.documentElement.dataset.motion;
    if (VALID_MOTION_MODES.has(active)) return active;
  }
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage?.getItem('bes-motion-mode');
      if (VALID_MOTION_MODES.has(stored)) return stored;
    } catch { /* optional preference */ }
  }
  return 'lite';
}

function isReducedMotionRequested() {
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

function isLowPerformanceMode() {
  const active = document.documentElement.dataset.performance;
  if (active) return active === 'low';
  try { return window.localStorage?.getItem('bes-performance-mode') === 'low'; } catch { return false; }
}

function activeTiming() {
  const base = ROUTE_MOTION[getRouteTransitionStyle()] || ROUTE_MOTION.metro;
  if (readMotionMode() === 'full') return base;
  return {
    navigateDelay: Math.min(base.navigateDelay, 150),
    sourceReleaseDelay: Math.min(base.sourceReleaseDelay, 190),
    overlayLifetime: Math.min(base.overlayLifetime, 300),
  };
}

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
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (document.visibilityState === 'hidden') return false;
  if (readMotionMode() === 'off' || isReducedMotionRequested() || isLowPerformanceMode()) return false;
  return true;
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

function dispatchLaunchEffect({ sourceEl = null, color = DEFAULT_COLOR, label = 'BR' } = {}) {
  const timing = activeTiming();
  const fallbackRect = {
    x: Math.round(window.innerWidth / 2 - 90),
    y: Math.round(window.innerHeight / 2 - 70),
    w: 180,
    h: 140,
  };
  window.dispatchEvent(new CustomEvent('bes-tile-launch', {
    detail: {
      color: color || DEFAULT_COLOR,
      label: String(label || 'BR').slice(0, 4),
      rect: elementRect(sourceEl) || fallbackRect,
      duration: timing.overlayLifetime,
      mode: readMotionMode(),
      style: getRouteTransitionStyle(),
    },
  }));
  return timing;
}

export function previewRouteTransition(options = {}) {
  if (!shouldAnimateRoute()) return false;
  dispatchLaunchEffect(options);
  return true;
}

export function launchRoute({ target, sourceEl = null, navigate, color = DEFAULT_COLOR, label = 'BR' } = {}) {
  if (!target || typeof window === 'undefined') return;
  const go = typeof navigate === 'function'
    ? navigate
    : () => { window.location.hash = target; };

  if (window.location.hash === target) {
    sourceEl?.blur?.();
    return;
  }

  window.clearTimeout(window.__besRouteLaunchTimer);
  window.clearTimeout(window.__besRouteSourceTimer);

  if (!shouldAnimateRoute()) {
    document.documentElement.dataset.routeTransition = 'off';
    go();
    sourceEl?.blur?.();
    return;
  }

  document.documentElement.dataset.routeTransition = getRouteTransitionStyle();
  sourceEl?.classList?.add('is-launching');
  const timing = dispatchLaunchEffect({ sourceEl, color, label });

  window.__besRouteLaunchTimer = window.setTimeout(() => {
    go();
    sourceEl?.blur?.();
  }, timing.navigateDelay);

  window.__besRouteSourceTimer = window.setTimeout(() => {
    sourceEl?.classList?.remove('is-launching');
  }, timing.sourceReleaseDelay);
}

if (typeof document !== 'undefined') {
  document.documentElement.dataset.routeTransition = getRouteTransitionStyle();
  document.documentElement.dataset.navigationPerformance = 'animated';
}

export { DEFAULT_COLOR };
