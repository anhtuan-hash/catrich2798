const MAX_MESSAGE_LENGTH = 600;
const MAX_STACK_LENGTH = 1800;
const MAX_ROUTE_LENGTH = 220;
const MAX_VERSION_LENGTH = 80;
const MAX_REPORTS_PER_MINUTE = 20;
const buckets = new Map();

const REDACT = [
  [/Bearer\s+[A-Za-z0-9._~+\/-]+/gi, 'Bearer [redacted]'],
  [/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, '[jwt-redacted]'],
  [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email-redacted]'],
  [/([?&#](?:access_token|refresh_token|token|code|apikey|api_key)=)[^&#\s]+/gi, '$1[redacted]'],
];

function text(value, maxLength) {
  let output = String(value || '');
  for (const [pattern, replacement] of REDACT) output = output.replace(pattern, replacement);
  return output.slice(0, maxLength);
}

function bodyObject(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(String(req.body || '{}')); } catch { return {}; }
}

function browserOrigin(req) {
  const rawOrigin = String(req.headers?.origin || '').trim();
  const forwardedHost = String(req.headers?.['x-forwarded-host'] || req.headers?.host || '').split(',')[0].trim().toLowerCase();
  if (!rawOrigin || !forwardedHost) return '';
  try {
    const parsed = new URL(rawOrigin);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.host.toLowerCase() === forwardedHost ? parsed.origin : '';
  } catch {
    return '';
  }
}

function clientKey(req, origin) {
  const forwarded = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  return `${origin}|${forwarded || 'unknown'}`;
}

function rateLimited(key) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || now - current.startedAt >= 60_000) {
    buckets.set(key, { startedAt: now, count: 1 });
    return false;
  }
  current.count += 1;
  if (buckets.size > 500) {
    for (const [bucketKey, value] of buckets) {
      if (now - value.startedAt >= 60_000) buckets.delete(bucketKey);
    }
  }
  return current.count > MAX_REPORTS_PER_MINUTE;
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

  const origin = browserOrigin(req);
  if (!origin) return sendJson(res, 403, { error: 'Origin not allowed' });
  if (rateLimited(clientKey(req, origin))) return sendJson(res, 429, { error: 'Too many reports' });

  const body = bodyObject(req);
  const payload = {
    kind: text(body.kind, 40),
    name: text(body.name, 80),
    message: text(body.message, MAX_MESSAGE_LENGTH),
    stack: text(body.stack, MAX_STACK_LENGTH),
    route: text(body.route, MAX_ROUTE_LENGTH),
    version: text(body.version, MAX_VERSION_LENGTH),
    occurredAt: text(body.occurredAt, 40),
  };

  if (!payload.message) return sendJson(res, 400, { error: 'Missing error message' });

  console.error('[client-error]', JSON.stringify(payload));
  return sendJson(res, 202, { ok: true });
}
