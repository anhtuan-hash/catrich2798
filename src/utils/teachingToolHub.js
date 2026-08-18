const STORAGE_KEY = 'brian-teaching-tool-hub-v1';

function uid(prefix = 'site') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.toString();
  } catch {
    return '';
  }
}

export function domainFromUrl(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function normalizeSite(site = {}, index = 0) {
  const url = normalizeUrl(site.url);
  const parsedOrder = Number(site.order);
  return {
    id: String(site.id || uid('site')),
    title: String(site.title || domainFromUrl(url) || `Website ${index + 1}`).trim(),
    url,
    description: String(site.description || '').trim(),
    category: String(site.category || 'Công cụ dạy học').trim(),
    icon: String(site.icon || '↗').trim().slice(0, 4) || '↗',
    isActive: site.isActive !== false,
    isPinned: site.isPinned === true,
    order: Number.isFinite(parsedOrder) ? parsedOrder : index,
    createdAt: String(site.createdAt || new Date().toISOString()),
    updatedAt: String(site.updatedAt || new Date().toISOString()),
  };
}

function sortSites(items) {
  return [...items].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    if (a.order !== b.order) return a.order - b.order;
    return a.title.localeCompare(b.title, 'vi', { sensitivity: 'base' });
  });
}

function readRaw() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeRaw(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('brian:teaching-tools-updated', { detail: items }));
    return true;
  } catch {
    return false;
  }
}

export function listTeachingToolSites({ includeInactive = false } = {}) {
  const items = sortSites(readRaw().map(normalizeSite).filter((item) => item.url));
  return includeInactive ? items : items.filter((item) => item.isActive);
}

export function createTeachingToolSite(input = {}) {
  const url = normalizeUrl(input.url);
  if (!url) throw new Error('URL website không hợp lệ.');
  const current = readRaw().map(normalizeSite);
  const maxOrder = current.reduce((max, item) => Math.max(max, Number(item.order) || 0), -1);
  const item = normalizeSite({ ...input, id: uid('site'), url, order: maxOrder + 1 }, current.length);
  const next = [...current, item];
  if (!writeRaw(next)) throw new Error('Không thể lưu website trên trình duyệt này.');
  return item;
}

export function updateTeachingToolSite(id, input = {}) {
  const url = normalizeUrl(input.url);
  if (!url) throw new Error('URL website không hợp lệ.');
  const current = readRaw().map(normalizeSite);
  const index = current.findIndex((item) => item.id === id);
  if (index < 0) throw new Error('Không tìm thấy website cần cập nhật.');
  const nextItem = normalizeSite({
    ...current[index],
    ...input,
    id: current[index].id,
    url,
    createdAt: current[index].createdAt,
    updatedAt: new Date().toISOString(),
  }, index);
  const next = current.map((item, itemIndex) => itemIndex === index ? nextItem : item);
  if (!writeRaw(next)) throw new Error('Không thể lưu thay đổi.');
  return nextItem;
}

export function moveTeachingToolSite(sourceId, targetId) {
  if (!sourceId || !targetId || sourceId === targetId) return false;
  const ordered = sortSites(readRaw().map(normalizeSite));
  const sourceIndex = ordered.findIndex((item) => item.id === sourceId);
  const targetIndex = ordered.findIndex((item) => item.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return false;
  const [source] = ordered.splice(sourceIndex, 1);
  const adjustedTarget = ordered.findIndex((item) => item.id === targetId);
  source.isPinned = ordered[adjustedTarget]?.isPinned ?? source.isPinned;
  ordered.splice(Math.max(0, adjustedTarget), 0, source);
  const next = ordered.map((item, index) => ({ ...item, order: index, updatedAt: new Date().toISOString() }));
  if (!writeRaw(next)) throw new Error('Không thể thay đổi thứ tự website.');
  return true;
}

export function deleteTeachingToolSite(id) {
  const current = readRaw().map(normalizeSite);
  const next = current.filter((item) => item.id !== id);
  if (next.length === current.length) return false;
  if (!writeRaw(next)) throw new Error('Không thể xóa website.');
  return true;
}

export function teachingToolHubStorageInfo() {
  return {
    mode: 'local',
    label: 'Lưu trên trình duyệt hiện tại',
    shared: false,
  };
}
