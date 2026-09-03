const MAX_REPORTS_PER_SESSION = 10;
const DEDUPE_WINDOW_MS = 30_000;
const MAX_MESSAGE_LENGTH = 600;
const MAX_STACK_LENGTH = 1800;
const MAX_ROUTE_LENGTH = 220;

const REDACT = [
  [/Bearer\s+[A-Za-z0-9._~+\/-]+/gi, 'Bearer [redacted]'],
  [/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, '[jwt-redacted]'],
  [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email-redacted]'],
  [/([?&#](?:access_token|refresh_token|token|code|apikey|api_key)=)[^&#\s]+/gi, '$1[redacted]'],
];

let installed = false;
let reportsSent = 0;
const recentSignatures = new Map();

function clean(value, maxLength) {
  let output = String(value || '');
  for (const [pattern, replacement] of REDACT) output = output.replace(pattern, replacement);
  return output.slice(0, maxLength);
}

function currentRoute() {
  if (typeof window === 'undefined') return '';
  return clean(`${window.location.pathname || '/'}${window.location.hash || ''}`, MAX_ROUTE_LENGTH);
}

function signatureFor(payload) {
  return `${payload.kind}|${payload.name}|${payload.message}|${payload.route}`.slice(0, 900);
}

function shouldReport(signature) {
  if (reportsSent >= MAX_REPORTS_PER_SESSION) return false;
  const now = Date.now();
  const previous = recentSignatures.get(signature) || 0;
  if (previous && now - previous < DEDUPE_WINDOW_MS) return false;
  recentSignatures.set(signature, now);
  if (recentSignatures.size > 40) {
    for (const [key, timestamp] of recentSignatures) {
      if (now - timestamp > DEDUPE_WINDOW_MS) recentSignatures.delete(key);
    }
  }
  return true;
}

function normalizeError(kind, errorLike, fallbackMessage = '') {
  const error = errorLike instanceof Error ? errorLike : null;
  const message = error?.message || fallbackMessage || String(errorLike || 'Unknown browser error');
  return {
    kind: clean(kind, 40),
    name: clean(error?.name || 'Error', 80),
    message: clean(message, MAX_MESSAGE_LENGTH),
    stack: clean(error?.stack || '', MAX_STACK_LENGTH),
    route: currentRoute(),
    version: clean(globalThis.__BES_APP_VERSION__ || '', 80),
    occurredAt: new Date().toISOString(),
  };
}

function send(payload) {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  const signature = signatureFor(payload);
  if (!shouldReport(signature)) return;
  reportsSent += 1;
  Promise.resolve(window.fetch('/api/client-error-report', {
    method: 'POST',
    credentials: 'same-origin',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })).catch(() => {});
}

export function installClientErrorTelemetry({ appVersion = '' } = {}) {
  if (typeof window === 'undefined' || installed) return;
  installed = true;
  if (appVersion) globalThis.__BES_APP_VERSION__ = clean(appVersion, 80);

  window.addEventListener('error', (event) => {
    send(normalizeError('window.error', event?.error, event?.message || 'Browser runtime error'));
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    send(normalizeError('unhandledrejection', reason, typeof reason === 'string' ? reason : 'Unhandled promise rejection'));
  });
}

export const CLIENT_ERROR_TELEMETRY_LIMITS = Object.freeze({
  maxReportsPerSession: MAX_REPORTS_PER_SESSION,
  dedupeWindowMs: DEDUPE_WINDOW_MS,
  maxMessageLength: MAX_MESSAGE_LENGTH,
  maxStackLength: MAX_STACK_LENGTH,
});
