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

function clearMetroNavigationState(root) {
  window.setTimeout(() => {
    delete root.dataset.metroNavigating;
    delete root.dataset.metroViewTransition;
  }, 420);
}

/**
 * Shared route launcher.
 *
 * Windows 8 motion is implemented by Brian's CSS choreography and traveling
 * indicator. We intentionally do not use document.startViewTransition here.
 * Heavy routes (notably Homeroom) can take longer than the browser's DOM-update
 * window and Chrome aborts the native transition with
 * "Transition was aborted because of timeout in DOM update". That rejection
 * can surface as a system error even though navigation itself is healthy.
 *
 * Keeping navigation synchronous makes route changes deterministic while the
 * existing metroDirection/metroNavigating data attributes still drive the
 * Windows 8 entrance/exit motion language.
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
  delete root.dataset.metroViewTransition;

  window.dispatchEvent(new CustomEvent('bes-navigation-start', {
    detail: { target, from: currentTarget, direction },
  }));

  try {
    go();
  } finally {
    clearMetroNavigationState(root);
  }
}

export { DEFAULT_COLOR };
