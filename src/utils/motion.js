const DEFAULT_COLOR = '#0078d4';
const RETIRED_MOTION_KEYS = [
  'bes-route-transition-style',
  'bes-motion-mode',
  'motion-effects',
  'brian.ui.motion',
];

function purgeRetiredMotionState() {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.removeAttribute('data-motion');
    root.removeAttribute('data-motion-effects');
    root.removeAttribute('data-route-transition');
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
