export const RUNTIME_ERROR_EVENT = 'bes-runtime-error';
const ERROR_LOG_KEY = 'bes-runtime-errors-v1084';
const MAX_ERRORS = 40;

function safeRead() {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(ERROR_LOG_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWrite(items) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(items.slice(0, MAX_ERRORS))); } catch { /* optional */ }
}

export function recordRuntimeError(input = {}) {
  const record = {
    id: `err-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    route: String(input.route || (typeof window !== 'undefined' ? window.location.hash : '') || ''),
    scope: String(input.scope || 'runtime'),
    message: String(input.message || input.error?.message || input.error || 'Unknown error').slice(0, 800),
    stack: String(input.stack || input.error?.stack || '').slice(0, 4000),
    componentStack: String(input.componentStack || '').slice(0, 4000),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  };
  safeWrite([record, ...safeRead().filter((item) => item?.id !== record.id)]);
  if (typeof window !== 'undefined') {
    window.__besLastRenderError = record;
    try { window.dispatchEvent(new CustomEvent(RUNTIME_ERROR_EVENT, { detail: record })); } catch { /* optional */ }
  }
  return record;
}

export function getRuntimeErrors() {
  return safeRead();
}

export function clearRuntimeErrors() {
  safeWrite([]);
  if (typeof window !== 'undefined') {
    try { window.dispatchEvent(new CustomEvent(RUNTIME_ERROR_EVENT, { detail: { cleared: true } })); } catch { /* optional */ }
  }
}

export function downloadRuntimeReport(extra = {}) {
  const report = {
    version: '10.95.0',
    exportedAt: new Date().toISOString(),
    location: typeof window !== 'undefined' ? window.location.href : '',
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    errors: getRuntimeErrors(),
    ...extra,
  };
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `brian-english-system-report-${Date.now()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
