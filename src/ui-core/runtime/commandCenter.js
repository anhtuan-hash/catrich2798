export const COMMAND_CENTER_OPEN_EVENT = 'brian:command-center-open';
export const COMMAND_CENTER_UPDATED_EVENT = 'brian:command-center-updated';
export const LEGACY_COMMAND_PALETTE_OPEN_EVENT = 'bes-command-palette-open';

const PREFIX = 'brian-command-center-v12.11';
const MAX_HISTORY = 10;
const MAX_PINNED = 24;

function scope(user) {
  return String(user?.id || user?.email || 'guest')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._-]+/g, '-') || 'guest';
}

function storageKey(user) {
  return `${PREFIX}:${scope(user)}`;
}

export function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s@>#/_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseCommandQuery(value, fallbackMode = 'all') {
  const raw = String(value || '');
  const trimmed = raw.trimStart();
  const prefix = trimmed.slice(0, 1);
  const modeByPrefix = {
    '>': 'actions',
    '@': 'workspaces',
    '/': 'pages',
    '#': 'apps',
  };
  const mode = modeByPrefix[prefix] || fallbackMode || 'all';
  const query = modeByPrefix[prefix] ? trimmed.slice(1).trim() : trimmed.trim();
  return { raw, query, normalized: normalizeSearchText(query), mode, prefix: modeByPrefix[prefix] ? prefix : '' };
}

function normalizeHistoryItem(value) {
  if (!value || typeof value !== 'object') return null;
  const query = String(value.query || '').trim().slice(0, 100);
  if (!query) return null;
  return {
    query,
    mode: ['all', 'apps', 'pages', 'workspaces', 'actions'].includes(value.mode) ? value.mode : 'all',
    count: Math.max(1, Number(value.count) || 1),
    lastUsedAt: Number(value.lastUsedAt) || Date.now(),
  };
}

export function normalizeCommandCenterState(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const history = (Array.isArray(source.history) ? source.history : [])
    .map(normalizeHistoryItem)
    .filter(Boolean)
    .filter((item, index, list) => list.findIndex((candidate) => candidate.query.toLowerCase() === item.query.toLowerCase() && candidate.mode === item.mode) === index)
    .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
    .slice(0, MAX_HISTORY);
  const pinnedIds = [...new Set((Array.isArray(source.pinnedIds) ? source.pinnedIds : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean))]
    .slice(0, MAX_PINNED);
  return {
    schemaVersion: 1,
    history,
    pinnedIds,
    lastMode: ['all', 'apps', 'pages', 'workspaces', 'actions'].includes(source.lastMode) ? source.lastMode : 'all',
    updatedAt: Number(source.updatedAt) || Date.now(),
  };
}

export function loadCommandCenterState(user) {
  if (typeof window === 'undefined') return normalizeCommandCenterState(null);
  try {
    return normalizeCommandCenterState(JSON.parse(window.localStorage.getItem(storageKey(user)) || 'null'));
  } catch {
    return normalizeCommandCenterState(null);
  }
}

export function saveCommandCenterState(user, state) {
  const normalized = normalizeCommandCenterState({ ...state, updatedAt: Date.now() });
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(storageKey(user), JSON.stringify(normalized)); } catch { /* optional */ }
    try { window.dispatchEvent(new CustomEvent(COMMAND_CENTER_UPDATED_EVENT, { detail: normalized })); } catch { /* optional */ }
    try {
      const channel = new BroadcastChannel('brian-command-center-v12.11');
      channel.postMessage({ scope: scope(user), state: normalized });
      channel.close();
    } catch { /* optional */ }
  }
  return normalized;
}

export function recordCommandQuery(user, query, mode = 'all') {
  const value = String(query || '').trim();
  if (!value) return loadCommandCenterState(user);
  const current = loadCommandCenterState(user);
  const existing = current.history.find((item) => item.query.toLowerCase() === value.toLowerCase() && item.mode === mode);
  const next = {
    query: value.slice(0, 100),
    mode: ['all', 'apps', 'pages', 'workspaces', 'actions'].includes(mode) ? mode : 'all',
    count: (existing?.count || 0) + 1,
    lastUsedAt: Date.now(),
  };
  return saveCommandCenterState(user, {
    ...current,
    lastMode: next.mode,
    history: [next, ...current.history.filter((item) => !(item.query.toLowerCase() === value.toLowerCase() && item.mode === next.mode))],
  });
}

export function clearCommandHistory(user) {
  const current = loadCommandCenterState(user);
  return saveCommandCenterState(user, { ...current, history: [] });
}

export function setCommandCenterMode(user, mode) {
  const current = loadCommandCenterState(user);
  return saveCommandCenterState(user, { ...current, lastMode: mode });
}

export function toggleCommandPinned(user, entryId) {
  const id = String(entryId || '').trim();
  if (!id) return loadCommandCenterState(user);
  const current = loadCommandCenterState(user);
  const pinnedIds = current.pinnedIds.includes(id)
    ? current.pinnedIds.filter((item) => item !== id)
    : [id, ...current.pinnedIds];
  return saveCommandCenterState(user, { ...current, pinnedIds });
}

export function isCommandPinned(state, entryId) {
  return Boolean(state?.pinnedIds?.includes(String(entryId || '').trim()));
}

export function scoreCommandEntry(entry, normalizedQuery) {
  const query = normalizeSearchText(normalizedQuery);
  if (!query) return Number(entry?.priority || 1);
  const title = normalizeSearchText(entry?.title);
  const subtitle = normalizeSearchText(entry?.subtitle);
  const keywords = normalizeSearchText(entry?.keywords);
  const tokens = query.split(' ').filter(Boolean);
  let score = Number(entry?.priority || 0);
  if (title === query) score += 140;
  if (title.startsWith(query)) score += 90;
  if (title.includes(query)) score += 60;
  if (subtitle.includes(query)) score += 24;
  if (keywords.includes(query)) score += 30;
  for (const token of tokens) {
    if (title === token) score += 36;
    else if (title.startsWith(token)) score += 24;
    else if (title.includes(token)) score += 16;
    else if (keywords.includes(token)) score += 7;
  }
  return score;
}

export function openCommandCenter(detail = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(COMMAND_CENTER_OPEN_EVENT, { detail }));
}
