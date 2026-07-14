export const WORKSPACE_EVENT = 'bes-workspace-updated';
const PREFIX = 'bes-workspace-tabs';
const MAX_TABS = 12;

function scope(user) {
  return String(user?.id || user?.email || 'guest').trim().toLowerCase().replace(/[^a-z0-9@._-]+/g, '-') || 'guest';
}

function key(user) { return `${PREFIX}:${scope(user)}`; }

function safeRead(user) {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(window.localStorage.getItem(key(user)) || 'null'); } catch { return null; }
}

function normalizeTab(tab) {
  if (!tab || typeof tab !== 'object') return null;
  const target = String(tab.target || '').trim();
  if (!target.startsWith('#/')) return null;
  const id = String(tab.id || target).trim();
  if (!id) return null;
  return {
    id,
    target,
    title: String(tab.title || tab.titleVi || id).slice(0, 80),
    titleVi: String(tab.titleVi || tab.title || id).slice(0, 80),
    icon: String(tab.icon || 'AP').slice(0, 4),
    accent: /^#[0-9a-f]{6}$/i.test(String(tab.accent || '')) ? String(tab.accent) : '#3B4CCA',
    pinned: Boolean(tab.pinned),
    openedAt: Number(tab.openedAt) || Date.now(),
    lastActiveAt: Number(tab.lastActiveAt) || Date.now(),
  };
}

export function normalizeWorkspace(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const seen = new Set();
  const tabs = (Array.isArray(source.tabs) ? source.tabs : []).map(normalizeTab).filter((tab) => {
    if (!tab || seen.has(tab.id)) return false;
    seen.add(tab.id);
    return true;
  }).slice(0, MAX_TABS);
  const activeId = tabs.some((tab) => tab.id === source.activeId) ? String(source.activeId) : (tabs[0]?.id || '');
  return { schemaVersion: 1, tabs, activeId, updatedAt: Number(source.updatedAt) || Date.now() };
}

export function loadWorkspace(user) {
  return normalizeWorkspace(safeRead(user));
}

export function saveWorkspace(user, workspace) {
  const normalized = normalizeWorkspace({ ...workspace, updatedAt: Date.now() });
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(key(user), JSON.stringify(normalized)); } catch { /* optional */ }
    try { window.dispatchEvent(new CustomEvent(WORKSPACE_EVENT, { detail: normalized })); } catch { /* optional */ }
    try {
      const channel = new BroadcastChannel('bes-workspace-v1085');
      channel.postMessage({ user: scope(user), workspace: normalized });
      channel.close();
    } catch { /* BroadcastChannel is optional */ }
  }
  return normalized;
}

export function openWorkspaceTab(user, tab, { activate = true } = {}) {
  const workspace = loadWorkspace(user);
  const normalized = normalizeTab(tab);
  if (!normalized) return workspace;
  const existing = workspace.tabs.find((item) => item.id === normalized.id);
  const tabs = existing
    ? workspace.tabs.map((item) => item.id === normalized.id ? { ...item, ...normalized, pinned: item.pinned || normalized.pinned, lastActiveAt: Date.now() } : item)
    : [...workspace.tabs, normalized];
  while (tabs.length > MAX_TABS) {
    const removable = tabs.findIndex((item) => !item.pinned && item.id !== normalized.id);
    if (removable < 0) break;
    tabs.splice(removable, 1);
  }
  return saveWorkspace(user, { ...workspace, tabs, activeId: activate ? normalized.id : workspace.activeId });
}

export function closeWorkspaceTab(user, tabId) {
  const workspace = loadWorkspace(user);
  const tab = workspace.tabs.find((item) => item.id === tabId);
  if (tab?.pinned) return workspace;
  const index = workspace.tabs.findIndex((item) => item.id === tabId);
  const tabs = workspace.tabs.filter((item) => item.id !== tabId);
  const next = tabs[Math.max(0, index - 1)] || tabs[0] || null;
  return saveWorkspace(user, { ...workspace, tabs, activeId: workspace.activeId === tabId ? (next?.id || '') : workspace.activeId });
}

export function toggleWorkspacePin(user, tabId) {
  const workspace = loadWorkspace(user);
  const tabs = workspace.tabs.map((item) => item.id === tabId ? { ...item, pinned: !item.pinned } : item);
  return saveWorkspace(user, { ...workspace, tabs });
}

export function reorderWorkspaceTabs(user, fromId, toId) {
  const workspace = loadWorkspace(user);
  const from = workspace.tabs.findIndex((item) => item.id === fromId);
  const to = workspace.tabs.findIndex((item) => item.id === toId);
  if (from < 0 || to < 0 || from === to) return workspace;
  const tabs = [...workspace.tabs];
  const [moved] = tabs.splice(from, 1);
  tabs.splice(to, 0, moved);
  return saveWorkspace(user, { ...workspace, tabs });
}

export function setWorkspaceActive(user, tabId) {
  const workspace = loadWorkspace(user);
  if (!workspace.tabs.some((tab) => tab.id === tabId)) return workspace;
  const tabs = workspace.tabs.map((item) => item.id === tabId ? { ...item, lastActiveAt: Date.now() } : item);
  return saveWorkspace(user, { ...workspace, tabs, activeId: tabId });
}
