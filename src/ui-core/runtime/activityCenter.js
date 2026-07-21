export const ACTIVITY_CENTER_EVENT = 'brian:activity-center-updated';
export const ACTIVITY_CENTER_OPEN_EVENT = 'brian:activity-center-open';

const PREFIX = 'brian-activity-center-v12.10';
const MAX_ITEMS = 120;
const RETIRED_TARGETS = new Set(['#/content-ecosystem', '#/collaboration-hub', '#/automation-center']);
const RETIRED_LABELS = ['Hệ sinh thái nội dung dạy học', 'Teaching Content Ecosystem', 'Không gian cộng tác', 'Collaboration Hub', 'Trung tâm tự động hóa', 'Automation Center'];

function scope(user) {
  return String(user?.id || user?.email || 'guest')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._-]+/g, '-') || 'guest';
}

function storageKey(user) {
  return `${PREFIX}:${scope(user)}`;
}

function safeCategory(value) {
  return ['notification', 'work', 'sync', 'history', 'ai', 'system'].includes(value) ? value : 'system';
}

function normalizeItem(value) {
  if (!value || typeof value !== 'object') return null;
  const createdAt = Number(value.createdAt || value.created_at || Date.now());
  const category = safeCategory(String(value.category || 'system'));
  const id = String(value.id || `${category}-${createdAt}-${Math.random().toString(36).slice(2, 7)}`);
  return {
    id,
    category,
    title: String(value.title || value.label || category).slice(0, 120),
    body: String(value.body || value.message || value.description || '').slice(0, 500),
    target: String(value.target || value.route || '').slice(0, 240),
    status: String(value.status || '').slice(0, 40),
    tone: ['success', 'warning', 'danger', 'info'].includes(value.tone) ? value.tone : 'info',
    icon: String(value.icon || '').slice(0, 4),
    source: String(value.source || '').slice(0, 80),
    meta: value.meta && typeof value.meta === 'object' ? value.meta : {},
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
    read: Boolean(value.read),
  };
}

export function normalizeActivityState(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const items = (Array.isArray(source.items) ? source.items : [])
    .map(normalizeItem)
    .filter(Boolean)
    .filter((item) => !RETIRED_TARGETS.has(item.target) && !RETIRED_LABELS.some((label) => item.title.includes(label) || item.body.includes(label)))
    .filter((item, index, list) => list.findIndex((candidate) => candidate.id === item.id) === index)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, MAX_ITEMS);
  return {
    schemaVersion: 1,
    items,
    updatedAt: Number(source.updatedAt) || Date.now(),
  };
}

export function loadActivityState(user) {
  if (typeof window === 'undefined') return normalizeActivityState(null);
  try {
    return normalizeActivityState(JSON.parse(window.localStorage.getItem(storageKey(user)) || 'null'));
  } catch {
    return normalizeActivityState(null);
  }
}

export function saveActivityState(user, state) {
  const normalized = normalizeActivityState({ ...state, updatedAt: Date.now() });
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(storageKey(user), JSON.stringify(normalized)); } catch { /* optional */ }
    try { window.dispatchEvent(new CustomEvent(ACTIVITY_CENTER_EVENT, { detail: normalized })); } catch { /* optional */ }
    try {
      const channel = new BroadcastChannel('brian-activity-center-v12.10');
      channel.postMessage({ scope: scope(user), state: normalized });
      channel.close();
    } catch { /* optional */ }
  }
  return normalized;
}

export function recordActivity(user, item, { replace = false } = {}) {
  const normalized = normalizeItem(item);
  if (!normalized) return loadActivityState(user);
  const current = loadActivityState(user);
  const items = replace
    ? [normalized, ...current.items.filter((candidate) => candidate.id !== normalized.id)]
    : [normalized, ...current.items.filter((candidate) => candidate.id !== normalized.id)];
  return saveActivityState(user, { ...current, items });
}

export function markActivityRead(user, itemId) {
  const current = loadActivityState(user);
  return saveActivityState(user, {
    ...current,
    items: current.items.map((item) => item.id === itemId ? { ...item, read: true } : item),
  });
}

export function markAllActivitiesRead(user, category = '') {
  const current = loadActivityState(user);
  return saveActivityState(user, {
    ...current,
    items: current.items.map((item) => (!category || item.category === category) ? { ...item, read: true } : item),
  });
}

export function clearActivityState(user, category = '') {
  const current = loadActivityState(user);
  return saveActivityState(user, {
    ...current,
    items: category ? current.items.filter((item) => item.category !== category) : [],
  });
}

export function openActivityCenter(tab = 'overview') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ACTIVITY_CENTER_OPEN_EVENT, { detail: { tab } }));
}
