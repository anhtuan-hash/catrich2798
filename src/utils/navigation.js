const DEFAULT_COLOR = '#0078d4';

const ROUTE_ORDER = [
  'home', 'apps', 'news', 'games', 'tools', 'homeroom', 'homeroom-portal',
  'resources', 'library', 'resource-library', 'knowledge-hub', 'dashboard',
  'practice', 'reports', 'ttcm', 'settings', 'admin',
];

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
  if (root?.dataset?.motionMode !== 'windows8' || root?.dataset?.motionEnabled !== 'true') return false;
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
}

function waitForReactPaint() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
  });
}

function clearMetroNavigationState(root) {
  window.setTimeout(() => {
    delete root.dataset.metroNavigating;
    delete root.dataset.metroViewTransition;
  }, 80);
}

/**
 * Shared route launcher.
 * Windows 8 uses the browser View Transitions API when available so only the
 * page stage travels through space; the fixed Brian header remains anchored.
 * Every other preset keeps immediate navigation.
 */
export function launchRoute({ target, navigate } = {}) {
  if (!target || typeof window === 'undefined') return;

  const go = typeof navigate === 'function'
    ? navigate
    : () => { window.location.hash = target; };

  if (window.location.hash === target) return;

  const root = document.documentElement;
  const currentTarget = window.location.hash || '#/home';
  const direction = metroDirection(currentTarget, target);
  root.dataset.metroDirection = direction;
  root.dataset.metroFrom = routeName(currentTarget);
  root.dataset.metroTo = routeName(target);
  root.dataset.metroNavigating = 'true';

  window.dispatchEvent(new CustomEvent('bes-navigation-start', {
    detail: { target, from: currentTarget, direction },
  }));

  if (windows8MotionActive() && typeof document.startViewTransition === 'function') {
    root.dataset.metroViewTransition = 'true';
    let transition;
    try {
      transition = document.startViewTransition(async () => {
        go();
        await waitForReactPaint();
      });
    } catch {
      delete root.dataset.metroViewTransition;
      go();
      clearMetroNavigationState(root);
      return;
    }

    transition.finished
      .catch(() => {})
      .finally(() => clearMetroNavigationState(root));
    return;
  }

  go();
  clearMetroNavigationState(root);
}

export { DEFAULT_COLOR };
