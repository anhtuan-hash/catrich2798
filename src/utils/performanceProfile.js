const VALID_PERFORMANCE = new Set(['auto', 'low', 'balanced', 'high']);

// Temporary compatibility helpers for legacy imports. Brian no longer stores,
// configures, or applies a motion mode.
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

  const isMobile = Boolean(window.matchMedia?.('(max-width: 900px)').matches);
  const coarsePointer = Boolean(window.matchMedia?.('(pointer: coarse)').matches);
  const memory = Number(navigator.deviceMemory || 0);
  const cores = Number(navigator.hardwareConcurrency || 0);
  const lowMemory = memory > 0 && memory <= 4;
  const lowCores = cores > 0 && cores <= 4;
  const lowNetwork = ['slow-2g', '2g'].includes(navigator.connection?.effectiveType || '');

  if (lowNetwork || (isMobile && (lowMemory || lowCores))) {
    return { tier: 'low', reason: lowNetwork ? 'slow-network' : 'mobile-hardware', isMobile, reduceMotion: false };
  }

  return { tier: 'balanced', reason: isMobile || coarsePointer ? 'touch-balanced' : 'desktop-balanced', isMobile, reduceMotion: false };
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
    delete document.documentElement.dataset.motion;
  }
  if (typeof window !== 'undefined') {
    try { window.localStorage?.removeItem('bes-motion-mode'); } catch { /* optional */ }
  }
  return { motion: 'off', performance };
}
