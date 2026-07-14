const STORAGE_KEY = 'bes-web-vitals-v1095';
const METRICS_EVENT = 'bes-performance-metrics';
const metrics = {
  lcp: null,
  cls: 0,
  inp: null,
  longTasks: 0,
  longTaskTime: 0,
  navigation: null,
  resources: null,
  updatedAt: '',
};

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(Number(value || 0) * factor) / factor;
}

function publish() {
  metrics.updatedAt = new Date().toISOString();
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(metrics)); } catch { /* optional */ }
    try { window.dispatchEvent(new CustomEvent(METRICS_EVENT, { detail: { ...metrics } })); } catch { /* optional */ }
  }
}

function observe(type, callback, options = {}) {
  if (typeof PerformanceObserver === 'undefined') return null;
  try {
    const observer = new PerformanceObserver((list) => callback(list.getEntries()));
    observer.observe({ type, buffered: true, ...options });
    return observer;
  } catch {
    return null;
  }
}

export function collectWebVitals() {
  if (typeof window === 'undefined' || window.__besWebVitalsStarted) return;
  window.__besWebVitalsStarted = true;

  observe('largest-contentful-paint', (entries) => {
    const last = entries.at(-1);
    if (last) metrics.lcp = round(last.startTime);
    publish();
  });

  observe('layout-shift', (entries) => {
    entries.forEach((entry) => { if (!entry.hadRecentInput) metrics.cls += entry.value; });
    metrics.cls = round(metrics.cls, 3);
    publish();
  });

  observe('event', (entries) => {
    const candidates = entries.filter((entry) => Number(entry.duration || 0) > 0);
    if (!candidates.length) return;
    metrics.inp = round(Math.max(metrics.inp || 0, ...candidates.map((entry) => entry.duration)));
    publish();
  }, { durationThreshold: 40 });

  observe('longtask', (entries) => {
    metrics.longTasks += entries.length;
    metrics.longTaskTime = round(metrics.longTaskTime + entries.reduce((sum, entry) => sum + entry.duration, 0));
    publish();
  });

  const updateNavigation = () => {
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav) {
      metrics.navigation = {
        ttfb: round(nav.responseStart),
        domInteractive: round(nav.domInteractive),
        domComplete: round(nav.domComplete),
        transferSize: Number(nav.transferSize || 0),
      };
    }
    const resources = performance.getEntriesByType('resource');
    metrics.resources = {
      count: resources.length,
      transferSize: resources.reduce((sum, entry) => sum + Number(entry.transferSize || 0), 0),
      duration: round(resources.reduce((sum, entry) => sum + Number(entry.duration || 0), 0)),
    };
    publish();
  };

  if (document.readyState === 'complete') updateNavigation();
  else window.addEventListener('load', updateNavigation, { once: true });
  window.setTimeout(updateNavigation, 5000);
}

export function getWebVitalsSnapshot() {
  if (typeof window === 'undefined') return { ...metrics };
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    return { ...metrics, ...(saved || {}) };
  } catch {
    return { ...metrics };
  }
}

export function subscribeWebVitals(listener) {
  if (typeof window === 'undefined') return () => {};
  const handler = (event) => listener?.(event.detail || getWebVitalsSnapshot());
  window.addEventListener(METRICS_EVENT, handler);
  listener?.(getWebVitalsSnapshot());
  return () => window.removeEventListener(METRICS_EVENT, handler);
}
