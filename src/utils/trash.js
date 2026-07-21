export const TRASH_EVENT = 'bes-trash-updated';
export const TRASH_RETENTION_DAYS = 30;

let ownerToken = 'guest';

function safeToken(value) {
  return String(value || 'guest').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 120) || 'guest';
}

function storageKey() {
  return `bes-trash-v1084:${ownerToken}`;
}

function emit(detail = {}) {
  if (typeof window === 'undefined') return;
  try { window.dispatchEvent(new CustomEvent(TRASH_EVENT, { detail })); } catch { /* optional */ }
}

function readRaw() {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey()) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRaw(items) {
  if (typeof window === 'undefined') return;
  const clean = Array.isArray(items) ? items : [];
  try { window.localStorage.setItem(storageKey(), JSON.stringify(clean)); } catch { /* storage can be full */ }
  emit({ count: clean.length });
}

export function setTrashStorageUser(user) {
  ownerToken = safeToken(user?.id || user?.email || 'guest');
  purgeExpiredTrash();
  emit({ owner: ownerToken, count: listTrash().length });
}

export function listTrash() {
  purgeExpiredTrash(false);
  return readRaw().sort((a, b) => Number(b.deletedAt || 0) - Number(a.deletedAt || 0));
}

export function moveToTrash({ title = 'Untitled', kind = 'item', source = 'system', payload = null, restoreData = null, metadata = {} } = {}) {
  const now = Date.now();
  const record = {
    id: `trash-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    title: String(title || 'Untitled').slice(0, 220),
    kind: String(kind || 'item').slice(0, 80),
    source: String(source || 'system').slice(0, 100),
    payload,
    restoreData,
    metadata: metadata && typeof metadata === 'object' ? metadata : {},
    deletedAt: now,
    expiresAt: now + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  };
  const next = [record, ...readRaw().filter((item) => item?.id !== record.id)].slice(0, 1000);
  writeRaw(next);
  return record;
}

export function removeTrashRecord(id) {
  const before = readRaw();
  const next = before.filter((item) => item?.id !== id);
  writeRaw(next);
  return next.length !== before.length;
}

export function clearTrash() {
  writeRaw([]);
}

export function purgeExpiredTrash(emitUpdate = true) {
  const now = Date.now();
  const before = readRaw();
  const next = before.filter((item) => Number(item?.expiresAt || 0) > now);
  if (next.length !== before.length) {
    if (emitUpdate) writeRaw(next);
    else {
      try { window.localStorage.setItem(storageKey(), JSON.stringify(next)); } catch { /* optional */ }
    }
  }
  return before.length - next.length;
}

export function getTrashStats() {
  const items = listTrash();
  const bytes = (() => {
    try { return new Blob([JSON.stringify(items)]).size; } catch { return 0; }
  })();
  return {
    count: items.length,
    bytes,
    oldestDeletedAt: items.length ? Math.min(...items.map((item) => Number(item.deletedAt || Date.now()))) : null,
    retentionDays: TRASH_RETENTION_DAYS,
  };
}
