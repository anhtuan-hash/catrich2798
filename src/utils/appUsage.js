export const APP_USAGE_EVENT = 'bes-app-usage-updated';
const APP_USAGE_PREFIX = 'bes-app-usage-v1:';

function scopeFor(user) {
  return String(user?.id || user?.email || 'guest')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._-]+/g, '-') || 'guest';
}

function keyFor(user) {
  return `${APP_USAGE_PREFIX}${scopeFor(user)}`;
}

function safeRead(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const parsed = JSON.parse(window.localStorage?.getItem(key) || 'null');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key, value) {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function normalizeEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const id = String(entry.id || '').trim();
  const target = String(entry.target || '').trim();
  if (!id || !target) return null;
  return {
    id,
    target,
    title: String(entry.title || id).trim().slice(0, 90),
    titleVi: String(entry.titleVi || entry.title || id).trim().slice(0, 90),
    icon: String(entry.icon || '').trim().slice(0, 6),
    color: /^#[0-9a-f]{6}$/i.test(String(entry.color || '')) ? String(entry.color) : '#191515',
    kind: entry.kind === 'route' ? 'route' : 'tool',
    lastUsedAt: Number(entry.lastUsedAt) || Date.now(),
    count: Math.max(1, Number(entry.count) || 1),
  };
}

export function getAppUsage(user) {
  const raw = safeRead(keyFor(user), []);
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeEntry).filter(Boolean).sort((a, b) => b.lastUsedAt - a.lastUsedAt).slice(0, 40);
}

export function recordAppUsage(user, entry) {
  const normalized = normalizeEntry({ ...entry, lastUsedAt: Date.now() });
  if (!normalized) return getAppUsage(user);
  const current = getAppUsage(user);
  const existing = current.find((item) => item.id === normalized.id);
  const nextEntry = {
    ...existing,
    ...normalized,
    count: (existing?.count || 0) + 1,
    lastUsedAt: Date.now(),
  };
  const next = [nextEntry, ...current.filter((item) => item.id !== normalized.id)]
    .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
    .slice(0, 40);
  safeWrite(keyFor(user), next);
  if (typeof window !== 'undefined') {
    try { window.dispatchEvent(new CustomEvent(APP_USAGE_EVENT, { detail: next })); } catch { /* optional */ }
  }
  return next;
}

export function getRecentAppUsage(user, limit = 6) {
  return getAppUsage(user).slice(0, Math.max(1, Number(limit) || 6));
}

export function clearAppUsage(user) {
  safeWrite(keyFor(user), []);
  if (typeof window !== 'undefined') {
    try { window.dispatchEvent(new CustomEvent(APP_USAGE_EVENT, { detail: [] })); } catch { /* optional */ }
  }
}

export function subscribeAppUsage(user, callback) {
  if (typeof window === 'undefined') return () => {};
  const handler = (event) => callback?.(Array.isArray(event?.detail) ? event.detail : getAppUsage(user));
  const storageHandler = (event) => {
    if (event?.key && event.key !== keyFor(user)) return;
    callback?.(getAppUsage(user));
  };
  window.addEventListener(APP_USAGE_EVENT, handler);
  window.addEventListener('storage', storageHandler);
  return () => {
    window.removeEventListener(APP_USAGE_EVENT, handler);
    window.removeEventListener('storage', storageHandler);
  };
}
