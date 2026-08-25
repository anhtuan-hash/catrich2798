const VALID_PERFORMANCE = new Set(['auto', 'low', 'balanced', 'high']);

/*
 * Global motion is intentionally retired while the site's animation system is
 * rebuilt. Keep this compatibility API because Settings and older lazy chunks
 * still import it. Vietnam Atmosphere owns its effects independently.
 */
export function getStoredMotionMode() {
  return 'off';
}

export function getStoredPerformanceMode() {
  try {
    const stored = localStorage.getItem('bes-performance-mode');
    return VALID_PERFORMANCE.has(stored) ? stored : 'auto';
  } catch {
    return 'auto';
  }
}

export function detectDeviceProfile() {
  if (typeof window === 'undefined') {
    return { tier: 'balanced', reason: 'server', isMobile: false, reduceMotion: false };
  }

  const reduceMotion = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const isMobile = Boolean(window.matchMedia?.('(max-width: 900px)').matches);
  const coarsePointer = Boolean(window.matchMedia?.('(pointer: coarse)').matches);
  const memory = Number(navigator.deviceMemory || 0);
  const cores = Number(navigator.hardwareConcurrency || 0);
  const lowMemory = memory > 0 && memory <= 4;
  const lowCores = cores > 0 && cores <= 4;
  const lowNetwork = ['slow-2g', '2g'].includes(navigator.connection?.effectiveType || '');

  if (reduceMotion || lowNetwork || (isMobile && (lowMemory || lowCores))) {
    return { tier: 'low', reason: reduceMotion ? 'reduced-motion' : lowNetwork ? 'slow-network' : 'mobile-hardware', isMobile, reduceMotion };
  }

  return { tier: 'balanced', reason: isMobile || coarsePointer ? 'touch-balanced' : 'desktop-balanced', isMobile, reduceMotion };
}

export function resolvePerformanceMode(mode = getStoredPerformanceMode()) {
  if (mode && mode !== 'auto' && VALID_PERFORMANCE.has(mode)) return mode;
  return detectDeviceProfile().tier;
}

export function resolveMotionMode() {
  return 'off';
}

export function applyPerformanceAttributes({ performanceMode = getStoredPerformanceMode() } = {}) {
  const performance = resolvePerformanceMode(performanceMode);
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.performance = performance;
    document.documentElement.dataset.motion = 'off';
    try { localStorage.setItem('bes-motion-mode', 'off'); } catch { /* optional */ }
  }
  return { motion: 'off', performance };
}
