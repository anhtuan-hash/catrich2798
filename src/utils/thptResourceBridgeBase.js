import { canPublishDepartment } from './permissions.js';
import {
  getAccessToken,
  loadResourceLibrary,
  RESOURCE_EVENT,
  syncResourcesFromCloud,
  syncResourceViaServer,
  updateResourceLibrary,
} from './resourceLibrary.js';
import { normaliseResourceCategory } from '../features/resource-library/resourceCategories.js';
import { isSupabaseConfigured, supabase } from './supabase.js';

export const THPT_RESOURCE_SOURCE = 'resource-library';
export const THPT_RESOURCE_LINK_TAG = 'thpt-hub';
export const THPT_RESOURCE_HIDDEN_TAG = 'thpt-hub-hidden';

const HTML_EXTENSIONS = new Set(['html', 'htm']);

function clean(value, limit = 500) {
  return String(value || '').trim().slice(0, limit);
}

function extensionOf(item = {}) {
  const name = String(item.fileName || item.file_name || '').toLowerCase();
  const pieces = name.split('.');
  return pieces.length > 1 ? pieces.pop() : '';
}

function tagsOf(item = {}) {
  return Array.isArray(item.tags)
    ? item.tags.map((tag) => String(tag || '').trim().toLowerCase()).filter(Boolean)
    : [];
}

export function isHtmlResource(item = {}) {
  const mime = String(item.mimeType || item.mime_type || '').toLowerCase();
  return HTML_EXTENSIONS.has(extensionOf(item)) || mime.includes('text/html');
}

export function isApprovedHtmlResource(item = {}) {
  if (!item || item.deletedAt || item.deleted_at) return false;
  if (String(item.status || '').toLowerCase() !== 'approved') return false;
  return isHtmlResource(item);
}

export function isResourceLinkedToThpt(item = {}) {
  if (!isApprovedHtmlResource(item)) return false;
  const tags = tagsOf(item);
  if (tags.includes(THPT_RESOURCE_HIDDEN_TAG)) return false;
  return normaliseResourceCategory(item.category || item.categoryId || item.category_id) === 'thpt-exam'
    || tags.includes(THPT_RESOURCE_LINK_TAG);
}

export function resourceToThptLesson(item = {}) {
  const resourceId = String(item.cloudId || item.id || item.driveFileId || 'resource');
  return {
    id: `resource:${resourceId}`,
    sourceType: THPT_RESOURCE_SOURCE,
    sourceLabel: 'Kho học liệu',
    resourceId,
    resourceCloudId: item.cloudId || '',
    resourceLocalId: item.id || '',
    driveFileId: item.driveFileId || '',
    driveWebViewLink: item.driveWebViewLink || '',
    title: clean(item.title || item.fileName || 'Bài luyện THPT', 220),
    description: clean(item.aiSummary || item.description || 'Bài học HTML đã duyệt trong Kho học liệu.', 1200),
    topic: clean(item.unitName || item.category || 'Tài liệu ôn thi THPT', 220),
    grade: clean(item.grade || '12', 40),
    cefr: clean(item.cefr || 'B2–C1', 40),
    status: 'approved',
    visibility: item.visibility || 'department',
    ownerId: item.uploaderId || '',
    ownerEmail: '',
    ownerName: clean(item.uploaderName || 'Giáo viên', 180),
    fileName: item.fileName || '',
    fileSize: Number(item.size || 0),
    fileMime: item.mimeType || 'text/html',
    version: Number(item.version || 1),
    reviewNote: '',
    updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
    createdAt: item.createdAt || item.updatedAt || new Date().toISOString(),
    resourceItem: item,
  };
}

export async function listApprovedThptResources({ linkedOnly = true } = {}) {
  try { await syncResourcesFromCloud(); } catch { /* local fallback */ }
  return loadResourceLibrary().items
    .filter((item) => linkedOnly ? isResourceLinkedToThpt(item) : isApprovedHtmlResource(item))
    .map(resourceToThptLesson)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

export function subscribeApprovedThptResources(callback, options = {}) {
  if (typeof window === 'undefined') return () => {};
  let active = true;
  let realtime = null;
  let timer = null;

  const refresh = async () => {
    const rows = await listApprovedThptResources(options).catch(() => []);
    if (active) callback?.(rows);
  };
  const schedule = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(refresh, 120);
  };

  window.addEventListener(RESOURCE_EVENT, schedule);
  if (isSupabaseConfigured && supabase) {
    realtime = supabase
      .channel(`bes-thpt-resource-bridge-v1167-${options.linkedOnly === false ? 'all' : 'linked'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_items' }, schedule)
      .subscribe();
  }
  refresh();

  return () => {
    active = false;
    window.clearTimeout(timer);
    window.removeEventListener(RESOURCE_EVENT, schedule);
    if (realtime) supabase.removeChannel(realtime);
  };
}

function resolveStoredResource(lesson = {}) {
  const items = loadResourceLibrary().items;
  return items.find((item) => (
    (lesson.resourceCloudId && item.cloudId === lesson.resourceCloudId)
    || (lesson.resourceLocalId && item.id === lesson.resourceLocalId)
    || (lesson.driveFileId && item.driveFileId === lesson.driveFileId)
    || String(item.cloudId || item.id) === String(lesson.resourceId || '')
  ));
}

export async function loadThptResourceHtml(lesson = {}) {
  const item = resolveStoredResource(lesson) || lesson.resourceItem;
  if (!item) return { ok: false, message: 'Không tìm thấy file trong Kho học liệu.' };
  if (!isResourceLinkedToThpt(item)) return { ok: false, message: 'File này chưa được duyệt hoặc không còn liên kết với Luyện thi THPT.' };

  if (typeof item.html === 'string' && item.html.trim()) {
    return { ok: true, html: item.html, lesson: resourceToThptLesson(item), source: 'resource-local' };
  }
  if (!item.driveFileId) {
    return { ok: false, message: 'File HTML chưa được đồng bộ lên Google Drive nên chưa thể chạy trên thiết bị này.' };
  }

  const token = await getAccessToken();
  if (!token) return { ok: false, message: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để mở file từ Kho học liệu.' };
  const params = new URLSearchParams({
    resourceId: item.cloudId || item.id,
    fileId: item.driveFileId,
    mode: 'inline',
  });
  const response = await fetch(`/api/google-drive-file?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    let message = 'Không thể đọc file HTML trong Kho học liệu.';
    try { message = (await response.json()).error || message; } catch { /* non-JSON */ }
    return { ok: false, message };
  }
  const html = await response.text();
  if (!html.trim()) return { ok: false, message: 'File HTML trong Kho học liệu đang rỗng.' };
  return { ok: true, html, lesson: resourceToThptLesson(item), source: 'resource-cloud' };
}

export async function setThptResourceLinked(user, lesson = {}, linked = true) {
  if (!canPublishDepartment(user)) return { ok: false, message: 'Chỉ TTCM/Admin được thay đổi liên kết Kho học liệu.' };
  const item = resolveStoredResource(lesson) || lesson.resourceItem;
  if (!item) return { ok: false, message: 'Không tìm thấy tài liệu cần cập nhật.' };

  const tags = new Set(tagsOf(item));
  if (linked) {
    tags.delete(THPT_RESOURCE_HIDDEN_TAG);
    tags.add(THPT_RESOURCE_LINK_TAG);
  } else {
    tags.delete(THPT_RESOURCE_LINK_TAG);
    tags.add(THPT_RESOURCE_HIDDEN_TAG);
  }
  const next = { ...item, tags: [...tags], updatedAt: new Date().toISOString() };

  updateResourceLibrary((store) => {
    const index = store.items.findIndex((entry) => (
      entry.id === item.id
      || (item.cloudId && entry.cloudId === item.cloudId)
      || (item.driveFileId && entry.driveFileId === item.driveFileId)
    ));
    if (index >= 0) store.items[index] = next;
  });

  const cloud = await syncResourceViaServer(next);
  if (!cloud.ok) {
    return { ok: true, item: next, cloud: false, warning: `Đã cập nhật trên thiết bị; cloud chưa đồng bộ: ${cloud.reason}` };
  }
  updateResourceLibrary((store) => {
    const index = store.items.findIndex((entry) => (
      entry.id === item.id
      || (item.cloudId && entry.cloudId === item.cloudId)
      || (item.driveFileId && entry.driveFileId === item.driveFileId)
    ));
    if (index >= 0) store.items[index] = cloud.item;
  });
  return { ok: true, item: cloud.item, cloud: true };
}
