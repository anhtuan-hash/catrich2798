const VALID_PERFORMANCE = new Set(['auto', 'low', 'balanced', 'high']);

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
    return { tier: 'balanced', reason: 'server', isMobile: false };
  }

  const isMobile = Boolean(window.matchMedia?.('(max-width: 900px)').matches);
  const coarsePointer = Boolean(window.matchMedia?.('(pointer: coarse)').matches);
  const memory = Number(navigator.deviceMemory || 0);
  const cores = Number(navigator.hardwareConcurrency || 0);
  const lowMemory = memory > 0 && memory <= 4;
  const lowCores = cores > 0 && cores <= 4;
  const lowNetwork = ['slow-2g', '2g'].includes(navigator.connection?.effectiveType || '');

  if (lowNetwork || (isMobile && (lowMemory || lowCores))) {
    return { tier: 'low', reason: lowNetwork ? 'slow-network' : 'mobile-hardware', isMobile };
  }

  return { tier: 'balanced', reason: isMobile || coarsePointer ? 'touch-balanced' : 'desktop-balanced', isMobile };
}

export function resolvePerformanceMode(mode = getStoredPerformanceMode()) {
  if (mode && mode !== 'auto' && VALID_PERFORMANCE.has(mode)) return mode;
  return detectDeviceProfile().tier;
}

export function applyPerformanceAttributes({ performanceMode = getStoredPerformanceMode() } = {}) {
  const performance = resolvePerformanceMode(performanceMode);
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.performance = performance;
  }
  return { performance };
}
