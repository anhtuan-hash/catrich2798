const PREFIX = 'bes-version-history-v1085';
const MAX_VERSIONS = 20;
const MAX_VERSION_CHARS = 280000;
const MAX_TOTAL_CHARS = 2800000;

function safeToken(value) {
  return String(value || 'guest').trim().toLowerCase().replace(/[^a-z0-9@._/-]+/g, '-') || 'guest';
}
function key(user, routeKey) { return `${PREFIX}:${safeToken(user?.id || user?.email || 'guest')}:${safeToken(routeKey || 'home')}`; }

export function listVersions(user, routeKey) {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key(user, routeKey)) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function compactSnapshot(snapshot) {
  const fields = [];
  let used = 0;
  for (const field of Array.isArray(snapshot?.fields) ? snapshot.fields : []) {
    const value = String(field?.value ?? '').slice(0, 45000);
    const next = { ...field, value };
    const size = JSON.stringify(next).length;
    if (used + size > MAX_VERSION_CHARS) break;
    fields.push(next);
    used += size;
  }
  return {
    savedAt: Number(snapshot?.savedAt) || Date.now(),
    url: String(snapshot?.url || ''),
    title: String(snapshot?.title || '').slice(0, 120),
    scrollY: Number(snapshot?.scrollY) || 0,
    fields,
    truncated: fields.length < Number(snapshot?.fields?.length || 0),
  };
}

function fitStorage(items) {
  const next = [];
  let total = 2;
  for (const item of items.slice(0, MAX_VERSIONS)) {
    const size = JSON.stringify(item).length;
    if (total + size > MAX_TOTAL_CHARS) break;
    next.push(item);
    total += size;
  }
  return next;
}

export function addVersion(user, routeKey, snapshot, reason = 'autosave') {
  if (!snapshot || typeof snapshot !== 'object') return [];
  const compact = compactSnapshot(snapshot);
  const fingerprint = JSON.stringify(compact.fields);
  const current = listVersions(user, routeKey);
  if (current[0]?.fingerprint === fingerprint) return current;
  const item = {
    id: `version-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    savedAt: compact.savedAt,
    title: compact.title || String(routeKey || 'Draft').slice(0, 120),
    reason,
    fieldCount: compact.fields.length,
    fingerprint,
    snapshot: compact,
  };
  const next = fitStorage([item, ...current]);
  try { window.localStorage.setItem(key(user, routeKey), JSON.stringify(next)); } catch {
    const reduced = fitStorage([item, ...current.slice(0, 4)]);
    try { window.localStorage.setItem(key(user, routeKey), JSON.stringify(reduced)); return reduced; } catch { return current; }
  }
  return next;
}

export function removeVersion(user, routeKey, versionId) {
  const next = listVersions(user, routeKey).filter((item) => item?.id !== versionId);
  try { window.localStorage.setItem(key(user, routeKey), JSON.stringify(next)); } catch { /* optional */ }
  return next;
}

export function clearVersions(user, routeKey) {
  try { window.localStorage.removeItem(key(user, routeKey)); } catch { /* optional */ }
}
