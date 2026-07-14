export const WORKSPACE_LAYOUT_EVENT = 'brian:workspace-layout-updated';
export const WORKSPACE_LAYOUT_OPEN_EVENT = 'brian:workspace-layout-open';
const PREFIX = 'brian-workspace-layout-v12.13';

function scope(user) {
  return String(user?.id || user?.email || 'guest').trim().toLowerCase().replace(/[^a-z0-9@._-]+/g, '-') || 'guest';
}
function key(user) { return `${PREFIX}:${scope(user)}`; }

export function normalizeWorkspaceLayout(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const secondaryTarget = String(source.secondaryTarget || '').trim();
  return {
    schemaVersion: 1,
    mode: ['single', 'split'].includes(source.mode) ? source.mode : 'single',
    side: source.side === 'left' ? 'left' : 'right',
    ratio: Math.min(70, Math.max(30, Number(source.ratio) || 42)),
    secondaryTarget: secondaryTarget.startsWith('#/') ? secondaryTarget : '',
    secondaryTitle: String(source.secondaryTitle || '').slice(0, 90),
    focusMode: Boolean(source.focusMode),
    updatedAt: Number(source.updatedAt) || Date.now(),
  };
}

export function loadWorkspaceLayout(user) {
  if (typeof window === 'undefined') return normalizeWorkspaceLayout(null);
  try { return normalizeWorkspaceLayout(JSON.parse(window.localStorage.getItem(key(user)) || 'null')); }
  catch { return normalizeWorkspaceLayout(null); }
}

export function saveWorkspaceLayout(user, value) {
  const normalized = normalizeWorkspaceLayout({ ...value, updatedAt: Date.now() });
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(key(user), JSON.stringify(normalized)); } catch { /* optional */ }
    try { window.dispatchEvent(new CustomEvent(WORKSPACE_LAYOUT_EVENT, { detail: normalized })); } catch { /* optional */ }
    try {
      const channel = new BroadcastChannel('brian-workspace-layout-v12.13');
      channel.postMessage({ scope: scope(user), layout: normalized });
      channel.close();
    } catch { /* optional */ }
  }
  return normalized;
}

export function openWorkspaceLayoutManager(detail = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(WORKSPACE_LAYOUT_OPEN_EVENT, { detail }));
}
