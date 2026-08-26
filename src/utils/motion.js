const DEFAULT_COLOR = '#0078d4';

/**
 * Legacy import path retained for compatibility.
 * Route changes are immediate; no transition state, timers, classes or motion
 * preferences are created or consulted here.
 */
export function launchRoute({ target, navigate } = {}) {
  if (!target || typeof window === 'undefined') return;

  const go = typeof navigate === 'function'
    ? navigate
    : () => { window.location.hash = target; };

  if (window.location.hash !== target) go();
}

export { DEFAULT_COLOR };
