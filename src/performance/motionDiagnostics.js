/**
 * Brian Motion & Performance Engine — opt-in, session-only laboratory sampler.
 * Not Core Web Vitals, not a GPU compositor trace, and not an FPS certification.
 * No network requests, persistent storage, route query strings or student data.
 */
const MAX_SAMPLE_MS = 20_000;
const MAX_INTERVALS = 2400;

function round(value, precision = 1) {
  const multiplier = 10 ** precision;
  return Math.round(Number(value || 0) * multiplier) / multiplier;
}

function percentile(sorted, fraction) {
  if (!sorted.length) return null;
  const position = Math.min(sorted.length - 1, Math.max(0, (sorted.length - 1) * fraction));
  const lo = Math.floor(position);
  const hi = Math.ceil(position);
  return round(sorted[lo] + (sorted[hi] - sorted[lo]) * (position - lo), 2);
}

export function summarizeFrameIntervals(intervals, observedMs, longTasks = [], context = {}) {
  const samples = intervals.filter((v) => Number.isFinite(v) && v > 0 && v < 1000).sort((a, b) => a - b);
  const median = percentile(samples, 0.5);
  // rAF timing on a busy main thread is only a proxy for perceived fluidity.
  // Median is not a reliable display refresh estimate on idle throttled tabs.
  const referenceMs = median && median < 10 ? 8.33 : median && median < 20 ? 16.67 : 33.33;
  const missedFramesApprox = samples.reduce((sum, delta) => sum + Math.max(0, Math.round(delta / referenceMs) - 1), 0);
  return Object.freeze({
    schema: 'bmpe-motion-lab-v1',
    method: 'requestAnimationFrame-main-thread-estimate',
    certifiedFps: false,
    webVitalsCertified: false,
    sampledDurationMs: round(observedMs),
    visibleFrameSamples: samples.length,
    frameIntervalP50Ms: median,
    frameIntervalP95Ms: percentile(samples, 0.95),
    frameIntervalP99Ms: percentile(samples, 0.99),
    missedFramesApprox,
    longTaskSupported: Boolean(context.longTaskSupported),
    longTaskCount: longTasks.length,
    longTaskTotalMs: round(longTasks.reduce((sum, duration) => sum + duration, 0)),
    routeGroup: context.routeGroup || 'unknown',
    pageWasHidden: Boolean(context.pageWasHidden),
    note: 'Browser-local diagnostic only. Use controlled DevTools tracing and official web-vitals p75 for release certification.',
  });
}

function currentRouteGroup() {
  if (typeof window === 'undefined') return 'unknown';
  const route = String(window.location.hash || '').match(/^#\/([a-z][a-z0-9-]{0,32})(?:\/|\?|$)/i);
  return route ? route[1].toLowerCase() : 'unknown';
}

/** Starts only from an explicit user interaction. Stop returns the captured report. */
export function startMotionDiagnosticCapture({ durationMs = 8500, onComplete } = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { stop: () => null, running: () => false };
  }
  const duration = Math.min(MAX_SAMPLE_MS, Math.max(1000, Number(durationMs) || 8500));
  const frameIntervals = [];
  const longTasks = [];
  const start = performance.now();
  let lastFrame = null;
  let frame = null;
  let timeout = null;
  let done = false;
  let report = null;
  let pageWasHidden = document.hidden;
  let longTaskSupported = false;
  let longTaskObserver = null;

  const handleVisibility = () => {
    lastFrame = null;
    if (document.hidden) pageWasHidden = true;
  };
  document.addEventListener('visibilitychange', handleVisibility);

  const onFrame = (now) => {
    if (done) return;
    if (!document.hidden) {
      if (lastFrame !== null && frameIntervals.length < MAX_INTERVALS) {
        frameIntervals.push(now - lastFrame);
      }
      lastFrame = now;
    } else lastFrame = null;
    if (frameIntervals.length < MAX_INTERVALS) frame = window.requestAnimationFrame(onFrame);
    else stop();
  };

  try {
    const supported = PerformanceObserver?.supportedEntryTypes || [];
    longTaskSupported = supported.includes('longtask');
    if (longTaskSupported) {
      longTaskObserver = new PerformanceObserver((list) => {
        if (!done) list.getEntries().forEach((entry) => longTasks.push(entry.duration));
      });
      longTaskObserver.observe({ type: 'longtask', buffered: false });
    }
  } catch {
    longTaskSupported = false;
    longTaskObserver = null;
  }

  function stop() {
    if (done) return report;
    done = true;
    if (frame !== null) window.cancelAnimationFrame(frame);
    if (timeout !== null) window.clearTimeout(timeout);
    document.removeEventListener('visibilitychange', handleVisibility);
    longTaskObserver?.disconnect();
    report = summarizeFrameIntervals(frameIntervals, performance.now() - start, longTasks, {
      routeGroup: currentRouteGroup(),
      pageWasHidden,
      longTaskSupported,
    });
    try { onComplete?.(report); } catch { /* Diagnostics must never break the UI. */ }
    return report;
  }

  frame = window.requestAnimationFrame(onFrame);
  timeout = window.setTimeout(stop, duration);
  return { stop, running: () => !done };
}
