const STORAGE_KEY = 'bes-global-audit-log-v1';
const USER_KEY = 'bes-global-audit-user-v1';
const EVENT_NAME = 'bes-audit-log-updated';
const MAX_ITEMS = 500;

function safeRead() {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function cleanMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return {};
  const blocked = /password|token|secret|api.?key|prompt|content|body|answer/i;
  const output = {};
  Object.entries(metadata).slice(0, 30).forEach(([key, value]) => {
    if (blocked.test(key)) return;
    if (typeof value === 'string') output[key] = value.slice(0, 240);
    else if (typeof value === 'number' || typeof value === 'boolean' || value === null) output[key] = value;
    else if (Array.isArray(value)) output[key] = value.slice(0, 20).map((item) => typeof item === 'string' ? item.slice(0, 100) : String(item).slice(0, 100));
    else output[key] = String(value).slice(0, 240);
  });
  return output;
}

export function setAuditUser(user = null) {
  if (typeof window === 'undefined') return;
  const safeUser = { id: String(user?.id || ''), email: String(user?.email || ''), role: String(user?.role || 'guest') };
  try { window.localStorage.setItem(USER_KEY, JSON.stringify(safeUser)); } catch { /* optional */ }
}

function getAuditUser() {
  if (typeof window === 'undefined') return { id: '', email: '', role: 'guest' };
  try { return JSON.parse(window.localStorage.getItem(USER_KEY) || '{}'); } catch { return { id: '', email: '', role: 'guest' }; }
}

export function writeAuditEvent({ action, category = 'system', status = 'success', route = '', app = '', metadata = {}, actor = null } = {}) {
  if (typeof window === 'undefined' || !action) return null;
  const user = actor || getAuditUser();
  const entry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    action: String(action).slice(0, 100),
    category: String(category).slice(0, 50),
    status: ['success', 'error', 'blocked', 'warning'].includes(status) ? status : 'success',
    route: String(route || window.location.hash || '').slice(0, 160),
    app: String(app || '').slice(0, 100),
    actor: { id: String(user?.id || ''), email: String(user?.email || ''), role: String(user?.role || 'guest') },
    metadata: cleanMetadata(metadata),
  };
  try {
    const next = [entry, ...safeRead()].slice(0, MAX_ITEMS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: entry }));
  } catch { /* audit must never break the app */ }
  return entry;
}

export function listAuditEvents({ category = '', status = '', limit = 200 } = {}) {
  return safeRead().filter((item) => (!category || item.category === category) && (!status || item.status === status)).slice(0, Math.max(1, Math.min(500, limit)));
}

export function clearAuditEvents() {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(STORAGE_KEY); window.dispatchEvent(new CustomEvent(EVENT_NAME)); } catch { /* optional */ }
}

export function downloadAuditLog() {
  if (typeof window === 'undefined') return;
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), events: safeRead() }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `brian-english-audit-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function installAuditBridge() {
  if (typeof window === 'undefined' || window.__besAuditBridgeInstalled) return;
  window.__besAuditBridgeInstalled = true;
  window.addEventListener('bes-audit', (event) => writeAuditEvent(event.detail || {}));
}
