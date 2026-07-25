const VALID_MOTION = new Set(['lite', 'full', 'off']);
const VALID_PERFORMANCE = new Set(['auto', 'low', 'balanced', 'high']);

export function getStoredMotionMode() {
  try {
    const stored = localStorage.getItem('bes-motion-mode');
    if (VALID_MOTION.has(stored)) return stored;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const mobile = window.matchMedia?.('(max-width: 900px)').matches;
    return reduce || mobile ? 'lite' : 'lite';
  } catch {
    return 'lite';
  }
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

  // Desktop hardware information is often incomplete or optimistic. Treating
  // every Mac/PC with several cores as "high" enabled the heaviest animation
  // profile by default, even when the integrated GPU or browser was struggling.
  // Auto mode now prefers balanced; users can still select High explicitly.
  return { tier: 'balanced', reason: isMobile || coarsePointer ? 'touch-balanced' : 'desktop-balanced', isMobile, reduceMotion };
}

export function resolvePerformanceMode(mode = getStoredPerformanceMode()) {
  if (mode && mode !== 'auto' && VALID_PERFORMANCE.has(mode)) return mode;
  return detectDeviceProfile().tier;
}

export function resolveMotionMode(motionMode = getStoredMotionMode(), performanceMode = getStoredPerformanceMode()) {
  const profile = detectDeviceProfile();
  const resolvedPerformance = resolvePerformanceMode(performanceMode);
  if (profile.reduceMotion || resolvedPerformance === 'low') return motionMode === 'off' ? 'off' : 'lite';
  if (motionMode === 'full' && resolvedPerformance !== 'high') return 'lite';
  return VALID_MOTION.has(motionMode) ? motionMode : 'lite';
}

export function applyPerformanceAttributes({ motionMode = getStoredMotionMode(), performanceMode = getStoredPerformanceMode() } = {}) {
  if (typeof document === 'undefined') return { motion: motionMode, performance: performanceMode };
  const performance = resolvePerformanceMode(performanceMode);
  const motion = resolveMotionMode(motionMode, performanceMode);
  document.documentElement.dataset.performance = performance;
  document.documentElement.dataset.motion = motion;
  return { motion, performance };
}
