// Brian Motion & Performance Engine — browser-session measurements.
// Core Web Vitals use Google's official web-vitals library, not max event
// duration or unwindowed layout-shift sums. No network telemetry is sent.
const STORAGE_KEY = 'bes-web-vitals-v1095';
const METRICS_EVENT = 'bes-performance-metrics';
const PAGE_TOKEN = `bmpe-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const metrics = {
  pageToken: PAGE_TOKEN,
  library: 'web-vitals/6.2.3',
  cwvStatus: 'pending',
  lcp: null,
  cls: null,
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

async function collectCertifiedAlgorithms() {
  try {
    // Defer until after app bootstrap: buffered PerformanceObserver entries
    // still cover the initial load. Each result is ONE PAGE, NOT site-wide p75.
    const { onLCP, onCLS, onINP } = await import('web-vitals');
    const record = (name) => (metric) => {
      if (!metric || !Number.isFinite(metric.value)) return;
      metrics[name] = round(metric.value, name === 'cls' ? 3 : 1);
      metrics.cwvStatus = 'active';
      publish();
    };
    onLCP(record('lcp'), { reportAllChanges: true });
    onCLS(record('cls'), { reportAllChanges: true });
    onINP(record('inp'), { reportAllChanges: true });
    metrics.cwvStatus = 'active';
    publish();
  } catch {
    // Do not impersonate official INP with a max EventTiming.duration proxy.
    metrics.cwvStatus = 'unavailable';
    publish();
  }
}

export function collectWebVitals() {
  if (typeof window === 'undefined' || window.__besWebVitalsStarted) return;
  window.__besWebVitalsStarted = true;

  void collectCertifiedAlgorithms();

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
    // Never show older sessions as if they were metrics for this page.
    return saved?.pageToken === PAGE_TOKEN ? { ...metrics, ...saved } : { ...metrics };
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
