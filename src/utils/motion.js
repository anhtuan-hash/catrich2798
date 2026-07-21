const DEFAULT_COLOR = '#0078d4';

export const ROUTE_MOTION = Object.freeze({
  navigateDelay: 260,
  sourceReleaseDelay: 420,
  overlayLifetime: 520,
});

let activeSource = null;
let navigateTimer = 0;
let releaseTimer = 0;

function getMotionPreference() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 'off';
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 'off';
  const htmlMotion = document.documentElement.dataset.motion;
  const shell = document.querySelector('.metro-clean-system');
  if (shell?.dataset.performance === 'low' || document.documentElement.dataset.performance === 'low') return 'off';
  const shellMotion = shell?.dataset.motion;
  return shellMotion || htmlMotion || 'lite';
}

export function shouldAnimateRoute() {
  return getMotionPreference() !== 'off';
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

function clearActiveLaunch() {
  window.clearTimeout(navigateTimer);
  window.clearTimeout(releaseTimer);
  activeSource?.classList.remove('is-launching');
  activeSource = null;
}

export function launchRoute({ target, label = 'GO', color = DEFAULT_COLOR, sourceEl = null, navigate } = {}) {
  if (!target || typeof window === 'undefined') return;
  const go = typeof navigate === 'function'
    ? navigate
    : () => { window.location.hash = target; };

  clearActiveLaunch();

  if (window.location.hash === target) {
    sourceEl?.classList.add('is-launching');
    releaseTimer = window.setTimeout(() => sourceEl?.classList.remove('is-launching'), 140);
    return;
  }

  if (!shouldAnimateRoute()) {
    go();
    return;
  }

  activeSource = sourceEl;
  sourceEl?.classList.add('is-launching');
  const detail = {
    color: color || DEFAULT_COLOR,
    label: String(label || 'GO').slice(0, 3).toUpperCase(),
    rect: elementRect(sourceEl),
    duration: ROUTE_MOTION.overlayLifetime,
  };

  window.requestAnimationFrame(() => {
    window.dispatchEvent(new CustomEvent('bes-tile-launch', { detail }));
  });

  navigateTimer = window.setTimeout(go, ROUTE_MOTION.navigateDelay);
  releaseTimer = window.setTimeout(() => {
    sourceEl?.classList.remove('is-launching');
    if (activeSource === sourceEl) activeSource = null;
  }, ROUTE_MOTION.sourceReleaseDelay);
}
