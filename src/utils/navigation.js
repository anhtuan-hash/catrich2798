const DEFAULT_COLOR = '#0078d4';

/** Immediate route navigation helper. Presentation motion is intentionally absent. */
export function launchRoute({ target, navigate } = {}) {
  if (!target || typeof window === 'undefined') return;

  const go = typeof navigate === 'function'
    ? navigate
    : () => { window.location.hash = target; };

  if (window.location.hash !== target) go();
}

export { DEFAULT_COLOR };
