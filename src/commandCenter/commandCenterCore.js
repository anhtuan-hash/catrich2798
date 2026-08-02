const PREFS_PREFIX = 'bes-command-center-v2';
export const PENDING_HOMEROOM_ACTION_KEY = 'bes-command-center-homeroom-action-v1';

function safeStorage(storageName) {
  try {
    return typeof window !== 'undefined' ? window[storageName] : null;
  } catch {
    return null;
  }
}

export function commandUserKey(user) {
  return String(user?.id || user?.authId || user?.email || 'guest').trim().toLowerCase();
}

function prefsKey(user) {
  return `${PREFS_PREFIX}:${commandUserKey(user)}`;
}

export function normalizeCommandText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseCommandQuery(rawValue) {
  const raw = String(rawValue || '').trimStart();
  const prefix = raw.charAt(0);
  const modes = { '>': 'command', '@': 'person', '#': 'class', '/': 'app', '?': 'help' };
  const mode = modes[prefix] || 'all';
  const value = mode === 'all' ? raw : raw.slice(1).trimStart();
  return {
    raw,
    value,
    normalized: normalizeCommandText(value),
    mode,
    prefix: mode === 'all' ? '' : prefix,
  };
}

function modeMatches(entry, mode) {
  if (mode === 'all') return true;
  if (mode === 'command') return entry.kind === 'command';
  if (mode === 'person') return entry.kind === 'student' || entry.kind === 'teacher';
  if (mode === 'class') return entry.kind === 'class';
  if (mode === 'app') return entry.kind === 'route' || entry.kind === 'tool';
  if (mode === 'help') return entry.kind === 'help';
  return true;
}

export function scoreCommandEntry(entry, parsedQuery) {
  if (!entry || !modeMatches(entry, parsedQuery.mode)) return 0;
  const query = parsedQuery.normalized;
  if (!query) return Number(entry.priority || 1);
  const title = entry.normalizedTitle || normalizeCommandText(entry.title);
  const keywords = entry.normalizedKeywords || normalizeCommandText(`${entry.keywords || ''} ${entry.subtitle || ''}`);
  const tokens = query.split(' ').filter(Boolean);
  let score = Number(entry.priority || 0);
  if (title === query) score += 160;
  if (title.startsWith(query)) score += 90;
  if (title.includes(query)) score += 55;
  if (keywords.includes(query)) score += 28;
  tokens.forEach((token) => {
    if (title.startsWith(token)) score += 22;
    else if (title.includes(token)) score += 14;
    else if (keywords.includes(token)) score += 6;
  });
  return score;
}

function defaultPreferences() {
  return { pinned: [], history: [], shortcuts: {}, updatedAt: 0 };
}

export function readCommandPreferences(user) {
  const storage = safeStorage('localStorage');
  if (!storage) return defaultPreferences();
  try {
    const parsed = JSON.parse(storage.getItem(prefsKey(user)) || 'null');
    if (!parsed || typeof parsed !== 'object') return defaultPreferences();
    return {
      pinned: Array.isArray(parsed.pinned) ? parsed.pinned.filter(Boolean).slice(0, 24) : [],
      history: Array.isArray(parsed.history) ? parsed.history.filter((item) => item?.id).slice(0, 30) : [],
      shortcuts: parsed.shortcuts && typeof parsed.shortcuts === 'object' ? parsed.shortcuts : {},
      updatedAt: Number(parsed.updatedAt || 0),
    };
  } catch {
    return defaultPreferences();
  }
}

export function writeCommandPreferences(user, next) {
  const storage = safeStorage('localStorage');
  const normalized = {
    ...defaultPreferences(),
    ...(next || {}),
    pinned: Array.isArray(next?.pinned) ? [...new Set(next.pinned.filter(Boolean))].slice(0, 24) : [],
    history: Array.isArray(next?.history) ? next.history.filter((item) => item?.id).slice(0, 30) : [],
    shortcuts: next?.shortcuts && typeof next.shortcuts === 'object' ? next.shortcuts : {},
    updatedAt: Date.now(),
  };
  try { storage?.setItem(prefsKey(user), JSON.stringify(normalized)); } catch { /* local preferences are optional */ }
  return normalized;
}

export function recordCommandRun(user, entry) {
  if (!entry?.id) return readCommandPreferences(user);
  const current = readCommandPreferences(user);
  const item = {
    id: entry.id,
    title: String(entry.title || ''),
    icon: String(entry.icon || '•'),
    color: String(entry.color || '#0b57d0'),
    kind: String(entry.kind || 'command'),
    lastUsedAt: Date.now(),
  };
  return writeCommandPreferences(user, {
    ...current,
    history: [item, ...current.history.filter((historyItem) => historyItem.id !== item.id)].slice(0, 30),
  });
}

export function queueHomeroomAction(action) {
  const payload = { ...action, type: 'homeroom.navigate', createdAt: Date.now() };
  const storage = safeStorage('sessionStorage');
  try { storage?.setItem(PENDING_HOMEROOM_ACTION_KEY, JSON.stringify(payload)); } catch { /* same-tab event remains available */ }
  if (typeof window === 'undefined') return;
  const onHomeroom = /#\/?homeroom(?:[?&/]|$)/i.test(window.location.hash || '');
  if (onHomeroom) {
    window.dispatchEvent(new CustomEvent('bes-homeroom-command', { detail: payload }));
  } else {
    window.location.hash = '#/homeroom';
  }
}

export function consumePendingHomeroomAction() {
  const storage = safeStorage('sessionStorage');
  if (!storage) return null;
  try {
    const parsed = JSON.parse(storage.getItem(PENDING_HOMEROOM_ACTION_KEY) || 'null');
    storage.removeItem(PENDING_HOMEROOM_ACTION_KEY);
    if (!parsed || parsed.type !== 'homeroom.navigate') return null;
    if (Date.now() - Number(parsed.createdAt || 0) > 120000) return null;
    return parsed;
  } catch {
    try { storage.removeItem(PENDING_HOMEROOM_ACTION_KEY); } catch { /* optional */ }
    return null;
  }
}

export function requestIdleTask(callback, timeout = 500) {
  if (typeof window === 'undefined') return () => {};
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(callback, { timeout });
    return () => window.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(callback, Math.min(timeout, 120));
  return () => window.clearTimeout(id);
}
