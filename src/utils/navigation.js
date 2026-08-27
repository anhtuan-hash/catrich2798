const DEFAULT_COLOR = '#0078d4';

const ROUTE_ORDER = [
  'home', 'apps', 'news', 'games', 'tools', 'homeroom', 'homeroom-portal',
  'resources', 'library', 'resource-library', 'knowledge-hub', 'dashboard',
  'practice', 'reports', 'ttcm', 'settings', 'admin',
];

let metroNavigationTimer = 0;
let metroCleanupTimer = 0;

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
  return root?.dataset?.motionMode === 'windows8'
    && root?.dataset?.motionEnabled === 'true'
    && !window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
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

/**
 * Shared route launcher.
 *
 * Windows 8 deliberately uses a short two-stage WinRT-style choreography:
 * current content retreats for ~90 ms, then React changes route and the new
 * content enters in staggered groups. The shell/navigation never moves.
 *
 * Native View Transitions are intentionally not used: heavy Brian routes can
 * exceed Chrome's DOM-update deadline and abort the transition.
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

  window.clearTimeout(metroNavigationTimer);
  window.clearTimeout(metroCleanupTimer);

  root.dataset.metroDirection = direction;
  root.dataset.metroFrom = routeName(currentTarget);
  root.dataset.metroTo = routeName(target);
  root.dataset.metroNavigating = 'true';
  delete root.dataset.metroViewTransition;

  window.dispatchEvent(new CustomEvent('bes-navigation-start', {
    detail: { target, from: currentTarget, direction },
  }));

  if (!windows8MotionActive()) {
    try {
      go();
    } finally {
      clearMetroNavigationState(root, 180);
    }
    return;
  }

  // WinRT exit is intentionally very short. It creates direction without
  // making the whole website feel like a slide deck.
  root.dataset.metroExiting = 'true';
  metroNavigationTimer = window.setTimeout(() => {
    delete root.dataset.metroExiting;
    root.dataset.metroEntering = 'true';
    try {
      go();
    } finally {
      clearMetroNavigationState(root, 560);
    }
  }, 92);
}

export { DEFAULT_COLOR };
