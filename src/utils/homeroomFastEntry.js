// Small, account-scoped metadata cache used for instant Homeroom first paint.
// It deliberately never reads student rosters or full workspace JSON snapshots.
const SERVER_CACHE_PREFIX = 'bes-assigned-homeroom-entry-v1';
const INDEX_PREFIX = 'bes-homeroom-workspace-index-v3';
const TYPE_PREFIX = 'bes-homeroom-class-types-v1';

function text(value) { return String(value ?? '').trim(); }
function identity(user) { return text(user?.id || user?.authId || user?.email).toLowerCase(); }
function storageKey(prefix, user) {
  const id = identity(user);
  return id ? `${prefix}:${id}` : '';
}
function storageRead(key) {
  if (!key || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function safeSelection(value, source) {
  const id = text(value?.id);
  const className = text(value?.className);
  if (!id || !className || text(value?.status) === 'archived') return null;
  return { id, className, source };
}

// Never share the cached result between accounts or accept an unauthenticated
// cache key. A prior server confirmation is revalidated in the background.
export function readCachedAssignedHomeroom(user) {
  if (!user?.id) return null;
  return safeSelection(storageRead(storageKey(SERVER_CACHE_PREFIX, user)), 'cached-server-assignment');
}

export function rememberAssignedHomeroom(user, preferred) {
  if (!user?.id || !preferred?.id || !preferred?.className) return false;
  const key = storageKey(SERVER_CACHE_PREFIX, user);
  try {
    localStorage.setItem(key, JSON.stringify({
      id: text(preferred.id),
      className: text(preferred.className),
      verifiedAt: new Date().toISOString(),
    }));
    return true;
  } catch { return false; }
}

// Read only the short class index and type map, not 28 potentially huge payloads.
export function listFastHomeroomCatalog(user) {
  const index = storageRead(storageKey(INDEX_PREFIX, user));
  const types = storageRead(storageKey(TYPE_PREFIX, user)) || {};
  if (!Array.isArray(index)) return [];
  return index.filter((item) => item?.id && item.status !== 'archived').map((item) => ({
    ...item,
    classType: types[item.id] === 'homeroom' || types[item.id] === 'subject'
      ? types[item.id]
      : (item.classType === 'homeroom' ? 'homeroom' : 'subject'),
  }));
}

export function fastPreferredHomeroom(user) {
  const saved = readCachedAssignedHomeroom(user);
  if (saved) return saved;
  const homerooms = listFastHomeroomCatalog(user).filter((item) => item.classType === 'homeroom');
  return homerooms.length === 1
    ? safeSelection(homerooms[0], 'indexed-homeroom')
    : null;
}
