export const TRANSFER_OPEN_EVENT = 'bes-content-transfer-open';
export const TRANSFER_UPDATED_EVENT = 'bes-content-transfer-updated';
export const TRANSFER_APPLY_EVENT = 'bes-content-transfer-apply';
const PREFIX = 'bes-content-transfer-inbox';
const MAX_ITEMS = 30;

function scope(user) {
  return String(user?.id || user?.email || 'guest').trim().toLowerCase().replace(/[^a-z0-9@._-]+/g, '-') || 'guest';
}
function key(user) { return `${PREFIX}:${scope(user)}`; }
function uid() { return `transfer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

function safeRead(user) {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key(user)) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function normalizeTransfer(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const target = String(raw.target || '').trim();
  if (!target) return null;
  const content = typeof raw.content === 'string' ? raw.content : JSON.stringify(raw.content ?? '');
  return {
    id: String(raw.id || uid()),
    type: String(raw.type || 'text'),
    title: String(raw.title || 'Untitled content').slice(0, 160),
    sourceApp: String(raw.sourceApp || 'unknown').slice(0, 80),
    sourceTitle: String(raw.sourceTitle || raw.sourceApp || 'Brian English Studio').slice(0, 120),
    target,
    content: content.slice(0, 180000),
    metadata: raw.metadata && typeof raw.metadata === 'object' && !Array.isArray(raw.metadata) ? raw.metadata : {},
    createdAt: Number(raw.createdAt) || Date.now(),
    status: ['pending', 'applied', 'dismissed'].includes(raw.status) ? raw.status : 'pending',
    appliedAt: Number(raw.appliedAt) || 0,
  };
}

export function listTransfers(user, target = '') {
  const items = safeRead(user).map(normalizeTransfer).filter(Boolean);
  return target ? items.filter((item) => item.target === target) : items;
}

function persist(user, items) {
  const normalized = items.map(normalizeTransfer).filter(Boolean).slice(0, MAX_ITEMS);
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(key(user), JSON.stringify(normalized)); } catch { /* optional */ }
    try { window.dispatchEvent(new CustomEvent(TRANSFER_UPDATED_EVENT, { detail: normalized })); } catch { /* optional */ }
    try {
      const channel = new BroadcastChannel('bes-transfer-v1085');
      channel.postMessage({ user: scope(user), items: normalized });
      channel.close();
    } catch { /* optional */ }
  }
  return normalized;
}

export function createTransfer(user, payload) {
  const item = normalizeTransfer(payload);
  if (!item) return null;
  const items = [item, ...safeRead(user).filter((existing) => existing?.id !== item.id)];
  persist(user, items);
  return item;
}

export function updateTransfer(user, id, patch) {
  const items = safeRead(user).map((item) => item?.id === id ? { ...item, ...patch } : item);
  return persist(user, items).find((item) => item.id === id) || null;
}

export function pendingTransferFor(user, target) {
  return listTransfers(user, target).find((item) => item.status === 'pending') || null;
}

export function captureCurrentPagePayload({ route, selectedTool, language = 'vi' }) {
  const root = document.querySelector('main.wp8-page-stage') || document.querySelector('main') || document.body;
  const heading = root.querySelector('h1, h2, [role="heading"]')?.textContent?.trim() || document.title;
  const selectedText = window.getSelection?.()?.toString()?.trim() || '';
  const formValues = [...root.querySelectorAll('textarea, input:not([type="password"]):not([type="file"]), select')]
    .slice(0, 30)
    .map((field) => String(field.value || '').trim())
    .filter(Boolean)
    .join('\n\n');
  const visibleText = String(root.innerText || '').replace(/\n{3,}/g, '\n\n').trim();
  const content = selectedText || formValues || visibleText;
  return {
    type: selectedText ? 'selection' : 'page-context',
    title: heading || (language === 'vi' ? 'Nội dung chưa đặt tên' : 'Untitled content'),
    sourceApp: selectedTool?.slug || route,
    sourceTitle: selectedTool?.titleVi || selectedTool?.title || heading || route,
    content: content.slice(0, 180000),
    metadata: {
      route,
      tool: selectedTool?.slug || '',
      url: window.location.href,
      selected: Boolean(selectedText),
      capturedAt: Date.now(),
    },
  };
}

export function openTransferHub(payload = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(TRANSFER_OPEN_EVENT, { detail: payload }));
}
