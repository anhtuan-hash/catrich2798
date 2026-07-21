export const SYNC_QUEUE_EVENT = 'bes-sync-queue-updated';
const PREFIX = 'bes-sync-queue-v1085';
const MAX_ITEMS = 80;

function scope(user) {
  return String(user?.id || user?.email || 'guest').trim().toLowerCase().replace(/[^a-z0-9@._-]+/g, '-') || 'guest';
}
function key(user) { return `${PREFIX}:${scope(user)}`; }
function id() { return `sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

function read(user) {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key(user)) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
function write(user, items) {
  const safe = items.slice(0, MAX_ITEMS);
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(key(user), JSON.stringify(safe)); } catch { /* optional */ }
    try { window.dispatchEvent(new CustomEvent(SYNC_QUEUE_EVENT, { detail: safe })); } catch { /* optional */ }
  }
  return safe;
}

export function listSyncQueue(user) { return read(user); }

export function enqueueSync(user, task) {
  const item = {
    id: String(task?.id || id()),
    type: String(task?.type || 'local-change'),
    label: String(task?.label || 'Pending change').slice(0, 120),
    payload: task?.payload ?? null,
    status: navigator.onLine ? 'ready' : 'offline',
    attempts: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  write(user, [item, ...read(user).filter((existing) => existing?.id !== item.id)]);
  return item;
}

export function removeSyncItem(user, itemId) {
  return write(user, read(user).filter((item) => item?.id !== itemId));
}

export function clearCompletedSyncItems(user) {
  return write(user, read(user).filter((item) => item?.status !== 'completed'));
}

export async function processSyncQueue(user, handlers = {}) {
  const items = read(user);
  if (!navigator.onLine) return items;
  const next = [];
  for (const item of items) {
    if (item.status === 'completed') { next.push(item); continue; }
    const handler = handlers[item.type];
    if (!handler) {
      next.push({ ...item, status: 'ready', updatedAt: Date.now() });
      continue;
    }
    try {
      await handler(item);
      next.push({ ...item, status: 'completed', attempts: Number(item.attempts || 0) + 1, updatedAt: Date.now(), completedAt: Date.now() });
    } catch (error) {
      next.push({ ...item, status: 'failed', attempts: Number(item.attempts || 0) + 1, updatedAt: Date.now(), error: String(error?.message || error) });
    }
  }
  return write(user, next);
}
