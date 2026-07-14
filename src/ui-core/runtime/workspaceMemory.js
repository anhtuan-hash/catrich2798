import { getWorkspaceById } from './workspaceRegistry.js';

export const WORKSPACE_MEMORY_EVENT = 'brian:workspace-memory-updated';
const PREFIX = 'brian-workspace-memory-v12';
const MAX_RECENT = 16;

function scope(user) {
  return String(user?.id || user?.email || 'guest').trim().toLowerCase().replace(/[^a-z0-9@._-]+/g, '-') || 'guest';
}

function storageKey(user) { return `${PREFIX}:${scope(user)}`; }

function normalizeVisit(value) {
  if (!value || typeof value !== 'object') return null;
  const target = String(value.target || '').trim();
  if (!target.startsWith('#/')) return null;
  const workspaceId = getWorkspaceById(value.workspaceId).id;
  return {
    workspaceId,
    target,
    title: String(value.title || value.titleVi || target).slice(0, 90),
    titleVi: String(value.titleVi || value.title || target).slice(0, 90),
    icon: String(value.icon || getWorkspaceById(workspaceId).icon).slice(0, 4),
    accent: /^#[0-9a-f]{6}$/i.test(String(value.accent || '')) ? String(value.accent) : getWorkspaceById(workspaceId).accent,
    lastVisitedAt: Number(value.lastVisitedAt) || Date.now(),
  };
}

export function normalizeWorkspaceMemory(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const byWorkspace = {};
  Object.entries(source.byWorkspace || {}).forEach(([id, value]) => {
    const visit = normalizeVisit({ ...value, workspaceId: id });
    if (visit) byWorkspace[visit.workspaceId] = visit;
  });
  const recent = (Array.isArray(source.recent) ? source.recent : [])
    .map(normalizeVisit)
    .filter(Boolean)
    .filter((visit, index, list) => list.findIndex((item) => item.target === visit.target) === index)
    .sort((a, b) => b.lastVisitedAt - a.lastVisitedAt)
    .slice(0, MAX_RECENT);
  const lastGlobal = normalizeVisit(source.lastGlobal);
  return { schemaVersion: 1, byWorkspace, recent, lastGlobal, updatedAt: Number(source.updatedAt) || Date.now() };
}

export function loadWorkspaceMemory(user) {
  if (typeof window === 'undefined') return normalizeWorkspaceMemory(null);
  try { return normalizeWorkspaceMemory(JSON.parse(window.localStorage.getItem(storageKey(user)) || 'null')); }
  catch { return normalizeWorkspaceMemory(null); }
}

export function saveWorkspaceMemory(user, memory) {
  const normalized = normalizeWorkspaceMemory({ ...memory, updatedAt: Date.now() });
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(storageKey(user), JSON.stringify(normalized)); } catch { /* optional */ }
    try { window.dispatchEvent(new CustomEvent(WORKSPACE_MEMORY_EVENT, { detail: normalized })); } catch { /* optional */ }
    try {
      const channel = new BroadcastChannel('brian-workspace-memory-v12');
      channel.postMessage({ scope: scope(user), memory: normalized });
      channel.close();
    } catch { /* optional */ }
  }
  return normalized;
}

export function rememberWorkspaceVisit(user, visit) {
  const normalizedVisit = normalizeVisit(visit);
  if (!normalizedVisit) return loadWorkspaceMemory(user);
  const memory = loadWorkspaceMemory(user);
  const recent = [normalizedVisit, ...memory.recent.filter((item) => item.target !== normalizedVisit.target)].slice(0, MAX_RECENT);
  return saveWorkspaceMemory(user, {
    ...memory,
    byWorkspace: { ...memory.byWorkspace, [normalizedVisit.workspaceId]: normalizedVisit },
    recent,
    lastGlobal: normalizedVisit,
  });
}

export function getWorkspaceResumeVisit(user, workspaceId) {
  const memory = loadWorkspaceMemory(user);
  return memory.byWorkspace[getWorkspaceById(workspaceId).id] || null;
}

export function clearWorkspaceMemory(user) {
  if (typeof window !== 'undefined') {
    try { window.localStorage.removeItem(storageKey(user)); } catch { /* optional */ }
  }
  return saveWorkspaceMemory(user, normalizeWorkspaceMemory(null));
}
