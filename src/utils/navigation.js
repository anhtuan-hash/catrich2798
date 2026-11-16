const DEFAULT_COLOR = '#0078d4';

const ROUTE_ORDER = [
  'home', 'apps', 'news', 'games', 'tools', 'homeroom', 'homeroom-portal',
  'resources', 'library', 'resource-library', 'knowledge-hub', 'dashboard',
  'practice', 'reports', 'ttcm', 'settings', 'admin',
];

let metroNavigationTimer = 0;
let metroCleanupTimer = 0;
let pendingTarget = '';
let pendingStartedAt = 0;

function routeName(value = '') {
  return String(value || '')
    .replace(/^#\/?/, '')
    .split('?')[0]
    .split('&')[0]
    .trim() || 'home';
}

function metroDirection(fromTarget, toTarget) {
  const fromIndex = ROUTE_ORDER.indexOf(routeName(fromTarget));
  const toIndex = ROUTE_ORDER.indexOf(routeName(toTarget));
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return 'forward';
  return toIndex > fromIndex ? 'forward' : 'backward';
}

function windows8MotionActive() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return false;
  const root = document.documentElement;
  const metroSelected = root?.dataset?.motionPage === 'metro-sweep'
    || root?.dataset?.motionMode === 'metro'
    || root?.dataset?.motionMode === 'windows8';
  return metroSelected
    && root?.dataset?.motionEnabled === 'true'
    && !window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
}

function clearPendingTarget(target = '') {
  if (!target || pendingTarget === target) {
    pendingTarget = '';
    pendingStartedAt = 0;
  }
}

function clearMetroNavigationState(root, delay = 480) {
  window.clearTimeout(metroCleanupTimer);
  metroCleanupTimer = window.setTimeout(() => {
    delete root.dataset.metroNavigating;
    delete root.dataset.metroExiting;
    delete root.dataset.metroEntering;
    delete root.dataset.metroViewTransition;
  }, delay);
}

export function launchRoute({
  target,
  navigate,
  sourceEl = null,
  label = '',
  color = '',
  meta = {},
} = {}) {
  if (!target || typeof window === 'undefined') return;

  const normalizedTarget = String(target);
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (window.location.hash === normalizedTarget) return;
  if (pendingTarget === normalizedTarget && now - pendingStartedAt < 1600) return;

  const go = typeof navigate === 'function'
    ? navigate
    : () => { window.location.hash = normalizedTarget; };

  pendingTarget = normalizedTarget;
  pendingStartedAt = now;

  const root = document.documentElement;
  const currentTarget = window.location.hash || '#/home';
  const direction = metroDirection(currentTarget, normalizedTarget);

  window.clearTimeout(metroNavigationTimer);
  window.clearTimeout(metroCleanupTimer);

  root.dataset.metroDirection = direction;
  root.dataset.metroFrom = routeName(currentTarget);
  root.dataset.metroTo = routeName(normalizedTarget);
  root.dataset.metroNavigating = 'true';
  delete root.dataset.metroViewTransition;

  const extra = meta && typeof meta === 'object' && !Array.isArray(meta) ? meta : {};
  const navigationEvent = new CustomEvent('bes-navigation-start', {
    cancelable: true,
    detail: {
      ...extra,
      target: normalizedTarget,
      from: currentTarget,
      direction,
      sourceEl,
      label: String(label || ''),
      color: String(color || ''),
    },
  });
  window.dispatchEvent(navigationEvent);

  // GlobalPageLaunchEffect cancels this event when it owns the complete
  // cube -> Windows 8 transition and performs the route change itself.
  if (navigationEvent.defaultPrevented) {
    clearPendingTarget(normalizedTarget);
    clearMetroNavigationState(root, 760);
    return;
  }

  if (!windows8MotionActive()) {
    try {
      go();
    } finally {
      clearPendingTarget(normalizedTarget);
      clearMetroNavigationState(root, 180);
    }
    return;
  }

  // Compatibility fallback for Metro mode if the global launch runtime is not
  // mounted for any reason. The legacy route transition still remains usable.
  root.dataset.metroExiting = 'true';
  metroNavigationTimer = window.setTimeout(() => {
    delete root.dataset.metroExiting;
    root.dataset.metroEntering = 'true';
    try {
      go();
    } finally {
      clearPendingTarget(normalizedTarget);
      clearMetroNavigationState(root, 620);
    }
  }, 92);
}

export { DEFAULT_COLOR };
