import { canPublishDepartment } from './permissions.js';
import { isSupabaseConfigured, supabase } from './supabase.js';
import {
  getAccessToken,
  loadResourceLibrary,
  syncResourceViaServer,
  updateResourceLibrary,
} from './resourceLibrary.js';

export const THPT_LESSON_EVENT = 'bes-thpt-practice-lessons-updated';
export const THPT_LESSON_TABLE = 'thpt_html_lessons';
// Legacy bucket: retained only to read/migrate/remove historical files. New uploads never use it.
export const THPT_LESSON_BUCKET = 'thpt-html-lessons';
export const THPT_MAX_HTML_BYTES = 20 * 1024 * 1024;
export const THPT_DIRECT_RESOURCE_TAG = 'thpt-practice-direct';

const THPT_BRIDGE_HIDDEN_TAG = 'thpt-hub-hidden';
const DB_NAME = 'bes-thpt-practice-hub-v1';
const STORE_NAME = 'lessons';
const DB_VERSION = 1;
const CHANNEL_NAME = 'bes-thpt-practice-hub-channel';
let databasePromise = null;
let broadcastChannel = null;

function nowIso() { return new Date().toISOString(); }
function clean(value, limit = 500) { return String(value || '').trim().slice(0, limit); }
function normalizeStatus(value) { return ['pending', 'approved', 'revision', 'rejected'].includes(value) ? value : 'pending'; }
function normalizeVisibility(value) { return ['private', 'department'].includes(value) ? value : 'department'; }
function isUuid(value) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '')); }
function isDriveFileId(value) {
  const raw = String(value || '').trim();
  return raw.length >= 10 && !raw.includes('/') && /^[A-Za-z0-9_-]+$/.test(raw);
}
function identity(user) {
  return {
    id: String(user?.id || user?.authId || ''),
    email: clean(user?.email, 200).toLowerCase(),
    name: clean(user?.name || user?.fullName || user?.email || 'Teacher', 160),
  };
}

function openDatabase() {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB không được hỗ trợ.'));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error || new Error('Không thể mở kho bài luyện THPT.'));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt');
        store.createIndex('status', 'status');
        store.createIndex('ownerEmail', 'ownerEmail');
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
  return databasePromise;
}

async function withStore(mode, runner) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    let output;
    try { output = runner(store); } catch (error) { reject(error); return; }
    transaction.oncomplete = () => resolve(output);
    transaction.onerror = () => reject(transaction.error || new Error('Không thể cập nhật kho bài.'));
    transaction.onabort = () => reject(transaction.error || new Error('Cập nhật kho bài đã bị huỷ.'));
  });
}

async function localList() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve((request.result || []).map(normalizeLesson));
    request.onerror = () => reject(request.error || new Error('Không thể đọc kho bài.'));
  });
}

async function localGet(id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result ? normalizeLesson(request.result) : null);
    request.onerror = () => reject(request.error || new Error('Không thể đọc bài học.'));
  });
}

async function localPut(item, announce = true) {
  const normalized = normalizeLesson(item);
  await withStore('readwrite', (store) => store.put(normalized));
  if (announce) emitUpdate({ type: 'saved', id: normalized.id });
  return normalized;
}

async function localDelete(id) {
  await withStore('readwrite', (store) => store.delete(id));
  emitUpdate({ type: 'deleted', id });
}

function getChannel() {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!broadcastChannel) broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  return broadcastChannel;
}

function emitUpdate(detail = {}) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(THPT_LESSON_EVENT, { detail }));
  try { getChannel()?.postMessage({ ...detail, at: Date.now() }); } catch { /* optional */ }
}

function safeFileName(name = 'bai-luyen-thpt.html') {
  const raw = clean(name, 160) || 'bai-luyen-thpt.html';
  const ext = raw.toLowerCase().endsWith('.htm') ? '.htm' : '.html';
  const base = raw.replace(/\.html?$/i, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || 'bai-luyen-thpt';
  return `${base}${ext}`;
}

function encodeMetadata(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

export function normalizeLesson(item = {}) {
  const createdAt = item.created_at || item.createdAt || nowIso();
  const filePath = clean(item.file_path || item.filePath || item.drive_file_id || item.driveFileId, 500);
  return {
    id: String(item.id || `thpt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`),
    resourceId: String(item.resource_id || item.resourceId || ''),
    title: clean(item.title || item.file_name || item.fileName || 'Bài luyện THPT', 140),
    description: clean(item.description, 1200),
    topic: clean(item.topic || item.unit_name || item.unitName, 120),
    grade: clean(item.grade || '12', 20),
    cefr: clean(item.cefr || 'B2–C1', 30),
    status: normalizeStatus(item.status),
    visibility: normalizeVisibility(item.visibility),
    ownerId: String(item.owner_id || item.ownerId || item.uploader_id || item.uploaderId || ''),
    ownerEmail: clean(item.owner_email || item.ownerEmail, 200).toLowerCase(),
    ownerName: clean(item.owner_name || item.ownerName || item.uploader_name || item.uploaderName || item.ownerEmail || 'Teacher', 160),
    fileName: clean(item.file_name || item.fileName || 'bai-luyen-thpt.html', 180),
    filePath,
    driveFileId: clean(item.drive_file_id || item.driveFileId || (isDriveFileId(filePath) ? filePath : ''), 500),
    driveWebViewLink: clean(item.drive_web_view_link || item.driveWebViewLink, 1000),
    driveDownloadLink: clean(item.drive_download_link || item.driveDownloadLink, 1000),
    fileSize: Number(item.file_size || item.fileSize || item.size || 0),
    fileMime: clean(item.file_mime || item.fileMime || item.mime_type || item.mimeType || 'text/html', 120),
    html: typeof item.html === 'string' ? item.html : '',
    checksum: clean(item.checksum, 160),
    version: Math.max(1, Number(item.version_number || item.version || 1)),
    reviewNote: clean(item.review_note || item.reviewNote, 1000),
    reviewedBy: clean(item.reviewed_by || item.reviewedBy, 200),
    reviewedAt: item.reviewed_at || item.reviewedAt || '',
    approvedAt: item.approved_at || item.approvedAt || '',
    createdAt,
    updatedAt: item.updated_at || item.updatedAt || createdAt,
    cloud: Boolean(item.cloud || filePath || item.driveFileId),
  };
}

export function isLessonOwner(user, lesson) {
  const me = identity(user);
  return Boolean((me.id && lesson?.ownerId === me.id) || (me.email && lesson?.ownerEmail === me.email));
}

function visibleToUser(user, lesson) {
  if (canPublishDepartment(user)) return true;
  if (isLessonOwner(user, lesson)) return true;
  return lesson.status === 'approved' && lesson.visibility === 'department';
}

export function validateHtmlFile(file) {
  if (!file) return { ok: false, message: 'Vui lòng chọn file HTML.' };
  const name = String(file.name || '').toLowerCase();
  if (!name.endsWith('.html') && !name.endsWith('.htm')) return { ok: false, message: 'Chỉ chấp nhận file .html hoặc .htm.' };
  if (!Number(file.size || 0)) return { ok: false, message: 'File HTML đang rỗng.' };
  if (Number(file.size || 0) > THPT_MAX_HTML_BYTES) return { ok: false, message: 'File vượt quá giới hạn 20 MB.' };
  return { ok: true };
}

export async function readHtmlFile(file) {
  const validation = validateHtmlFile(file);
  if (!validation.ok) return validation;
  try {
    const html = await file.text();
    if (!html.trim()) return { ok: false, message: 'File HTML không có nội dung.' };
    return { ok: true, html, fileName: file.name, fileSize: file.size, fileMime: file.type || 'text/html' };
  } catch (error) {
    return { ok: false, message: error.message || 'Không thể đọc file HTML.' };
  }
}

function fromCloudRow(row) { return normalizeLesson({ ...row, cloud: true }); }
function cloudEnabled(user) { return Boolean(isSupabaseConfigured && supabase && user?.id); }

function resourceForLesson(lesson) {
  const items = loadResourceLibrary().items || [];
  return items.find((item) => (
    (lesson.resourceId && (item.cloudId === lesson.resourceId || item.id === lesson.resourceId))
    || (isUuid(lesson.id) && (item.cloudId === lesson.id || item.id === lesson.id))
    || (lesson.driveFileId && item.driveFileId === lesson.driveFileId)
    || (isDriveFileId(lesson.filePath) && item.driveFileId === lesson.filePath)
  ));
}

function enrichFromResource(lesson) {
  const resource = resourceForLesson(lesson);
  if (!resource) return lesson;
  return normalizeLesson({
    ...lesson,
    resourceId: resource.cloudId || resource.id || lesson.resourceId,
    driveFileId: resource.driveFileId || lesson.driveFileId || lesson.filePath,
    filePath: resource.driveFileId || lesson.filePath,
    driveWebViewLink: resource.driveWebViewLink || lesson.driveWebViewLink,
    driveDownloadLink: resource.driveDownloadLink || lesson.driveDownloadLink,
    checksum: resource.checksum || lesson.checksum,
  });
}

async function cloudList(user) {
  if (!cloudEnabled(user)) return { ok: false, offline: true, rows: [] };
  const { data, error } = await supabase.from(THPT_LESSON_TABLE).select('*').order('updated_at', { ascending: false });
  if (error) return { ok: false, reason: error.message, rows: [] };
  return { ok: true, rows: (data || []).map((row) => enrichFromResource(fromCloudRow(row))) };
}

function cloudPayload(lesson) {
  return {
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    topic: lesson.topic,
    grade: lesson.grade,
    cefr: lesson.cefr,
    status: lesson.status,
    visibility: lesson.visibility,
    owner_id: lesson.ownerId || null,
    owner_email: lesson.ownerEmail || null,
    owner_name: lesson.ownerName || null,
    file_name: lesson.fileName,
    // New rows store the Google Drive file ID here. Historical rows may still contain a Supabase Storage path.
    file_path: lesson.driveFileId || lesson.filePath || null,
    file_size: lesson.fileSize,
    file_mime: lesson.fileMime || 'text/html',
    version_number: lesson.version,
    review_note: lesson.reviewNote || null,
    reviewed_by: lesson.reviewedBy || null,
    reviewed_at: lesson.reviewedAt || null,
    approved_at: lesson.approvedAt || null,
    updated_at: lesson.updatedAt,
  };
}

async function uploadDriveHtml(user, lesson, html) {
  const token = await getAccessToken();
  if (!token) throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để lưu file lên Google Drive.');
  const file = new File([html], safeFileName(lesson.fileName), { type: 'text/html;charset=utf-8' });
  const checksum = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  const checksumHex = [...new Uint8Array(checksum)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  const metadata = {
    title: lesson.title,
    description: lesson.description,
    category: 'thpt-exam',
    grade: lesson.grade,
    unitName: lesson.topic,
    cefr: lesson.cefr,
    status: lesson.status,
    visibility: lesson.visibility,
    uploaderId: lesson.ownerId,
    uploaderName: lesson.ownerName,
    fileName: file.name,
    mimeType: 'text/html',
    size: file.size,
    checksum: checksumHex,
  };
  const response = await fetch('/api/google-drive-upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/html',
      'X-File-Name': encodeURIComponent(file.name),
      'X-Resource-Metadata': encodeMetadata(metadata),
    },
    body: file,
  });
  let data = {};
  try { data = await response.json(); } catch { /* keep fallback */ }
  if (!response.ok) throw new Error(data.error || 'Không thể tải bài HTML lên Google Drive.');
  if (!data.fileId) throw new Error('Google Drive không trả về mã file.');
  return {
    fileId: data.fileId,
    webViewLink: data.webViewLink || '',
    downloadLink: data.downloadLink || '',
    checksum: checksumHex,
    fileSize: file.size,
  };
}

function resourcePayload(lesson) {
  return {
    id: lesson.resourceId || lesson.id,
    cloudId: lesson.resourceId || (isUuid(lesson.id) ? lesson.id : undefined),
    title: lesson.title,
    description: lesson.description,
    category: 'thpt-exam',
    grade: lesson.grade,
    schoolYear: '',
    unitName: lesson.topic,
    cefr: lesson.cefr,
    skills: [],
    tags: ['interactive-html', 'thpt-exam', THPT_DIRECT_RESOURCE_TAG, THPT_BRIDGE_HIDDEN_TAG],
    source: 'Luyện thi THPT · HTML tương tác',
    copyright: 'self',
    visibility: lesson.visibility,
    allowDownload: false,
    status: lesson.status,
    featured: false,
    uploaderId: lesson.ownerId,
    uploaderName: lesson.ownerName,
    mimeType: 'text/html',
    fileName: lesson.fileName,
    size: lesson.fileSize,
    driveFileId: lesson.driveFileId || lesson.filePath,
    driveWebViewLink: lesson.driveWebViewLink || '',
    driveDownloadLink: lesson.driveDownloadLink || '',
    aiSummary: lesson.description,
    aiUses: ['Chạy trực tiếp trong Luyện thi THPT.', 'File gốc được lưu trên Google Drive.'],
    extractedText: '',
    checksum: lesson.checksum || '',
    version: lesson.version,
    parentResourceId: null,
    createdAt: lesson.createdAt,
    updatedAt: lesson.updatedAt,
    approvedAt: lesson.approvedAt || null,
    approvedBy: lesson.reviewedBy || null,
    storageMode: 'google-drive',
  };
}

function cacheResource(item) {
  if (!item) return;
  updateResourceLibrary((store) => {
    const index = store.items.findIndex((entry) => (
      entry.id === item.id
      || (item.cloudId && entry.cloudId === item.cloudId)
      || (item.driveFileId && entry.driveFileId === item.driveFileId)
    ));
    if (index >= 0) store.items[index] = item;
    else store.items.unshift(item);
  });
}

async function syncResourceRecord(lesson) {
  if (!isDriveFileId(lesson.driveFileId || lesson.filePath)) return { ok: false, reason: 'Bài chưa có file trên Google Drive' };
  const result = await syncResourceViaServer(resourcePayload(lesson));
  if (result.ok) cacheResource(result.item);
  return result;
}

async function moveDriveFile(user, lesson, status = lesson.status) {
  const fileId = lesson.driveFileId || (isDriveFileId(lesson.filePath) ? lesson.filePath : '');
  if (!fileId || !canPublishDepartment(user)) return { ok: true, skipped: true };
  const token = await getAccessToken();
  if (!token) return { ok: false, reason: 'Phiên đăng nhập đã hết hạn' };
  const response = await fetch('/api/google-drive-move', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId, category: 'thpt-exam', status }),
  });
  let data = {};
  try { data = await response.json(); } catch { /* keep fallback */ }
  return response.ok ? { ok: true, data } : { ok: false, reason: data.error || 'Không thể chuyển thư mục Google Drive' };
}

async function removeCachedResource(lesson) {
  updateResourceLibrary((store) => {
    store.items = store.items.filter((item) => (
      item.id !== lesson.resourceId
      && item.cloudId !== lesson.resourceId
      && item.id !== lesson.id
      && item.cloudId !== lesson.id
      && (!lesson.driveFileId || item.driveFileId !== lesson.driveFileId)
    ));
  });
}

export async function listThptLessons(user) {
  let local = [];
  try { local = await localList(); } catch (error) { console.warn('[THPT Hub] Local read failed:', error); }
  const cloud = await cloudList(user);
  if (!cloud.ok) return local.filter((item) => visibleToUser(user, item)).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));

  const merged = new Map();
  local.forEach((item) => merged.set(item.id, item));
  cloud.rows.forEach((item) => {
    const cached = merged.get(item.id);
    merged.set(item.id, normalizeLesson({ ...cached, ...item, html: cached?.html || '' }));
  });
  const rows = [...merged.values()].filter((item) => visibleToUser(user, item)).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  await Promise.all(rows.map((item) => localPut(item, false).catch(() => null)));
  return rows;
}

export async function saveThptLesson(user, draft = {}, file = null) {
  const me = identity(user);
  if (!me.id && !me.email) return { ok: false, message: 'Bạn cần đăng nhập trước khi lưu bài.' };
  const leader = canPublishDepartment(user);
  const existing = draft.id ? await localGet(String(draft.id)).catch(() => null) : null;
  if (existing && !leader && !isLessonOwner(user, existing)) return { ok: false, message: 'Bạn không có quyền sửa bài này.' };
  if (existing && !leader && existing.status === 'approved') return { ok: false, message: 'Bài đã duyệt chỉ TTCM/Admin có thể chỉnh sửa.' };

  let fileData = null;
  if (file) {
    fileData = await readHtmlFile(file);
    if (!fileData.ok) return fileData;
  }
  if (!existing && !fileData) return { ok: false, message: 'Vui lòng chọn file HTML.' };

  const timestamp = nowIso();
  const status = leader ? normalizeStatus(draft.status || existing?.status || 'approved') : 'pending';
  let lesson = normalizeLesson({
    ...existing,
    ...draft,
    id: existing?.id || (crypto?.randomUUID?.() || `thpt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`),
    resourceId: existing?.resourceId || '',
    ownerId: existing?.ownerId || me.id,
    ownerEmail: existing?.ownerEmail || me.email,
    ownerName: existing?.ownerName || me.name,
    html: fileData?.html ?? existing?.html ?? '',
    fileName: fileData?.fileName ?? existing?.fileName,
    fileSize: fileData?.fileSize ?? existing?.fileSize,
    fileMime: fileData?.fileMime ?? existing?.fileMime,
    version: fileData ? Number(existing?.version || 0) + 1 : Number(existing?.version || 1),
    status,
    visibility: leader ? normalizeVisibility(draft.visibility || existing?.visibility || 'department') : 'department',
    reviewNote: leader ? clean(draft.reviewNote || existing?.reviewNote, 1000) : '',
    approvedAt: status === 'approved' ? (existing?.approvedAt || timestamp) : '',
    createdAt: existing?.createdAt || timestamp,
    updatedAt: timestamp,
  });

  await localPut(lesson);
  if (!cloudEnabled(user)) return { ok: true, lesson, cloud: false, warning: 'Đã lưu trên thiết bị. Chưa có đồng bộ cloud.' };

  const previousPath = existing?.filePath || '';
  const previousDriveId = isDriveFileId(previousPath) ? previousPath : '';
  const legacyStoragePath = previousPath && !previousDriveId ? previousPath : '';

  try {
    if (fileData || (!isDriveFileId(lesson.filePath) && lesson.html)) {
      const uploaded = await uploadDriveHtml(user, lesson, lesson.html);
      lesson = normalizeLesson({
        ...lesson,
        filePath: uploaded.fileId,
        driveFileId: uploaded.fileId,
        driveWebViewLink: uploaded.webViewLink,
        driveDownloadLink: uploaded.downloadLink,
        checksum: uploaded.checksum,
        fileSize: uploaded.fileSize,
        cloud: true,
      });
    }

    if (isDriveFileId(lesson.driveFileId || lesson.filePath)) {
      const resourceResult = await syncResourceRecord(lesson);
      if (!resourceResult.ok) throw new Error(resourceResult.reason || 'Không thể đồng bộ metadata Kho học liệu.');
      lesson = normalizeLesson({
        ...lesson,
        resourceId: resourceResult.item?.cloudId || resourceResult.item?.id || lesson.resourceId || lesson.id,
        driveFileId: resourceResult.item?.driveFileId || lesson.driveFileId || lesson.filePath,
        filePath: resourceResult.item?.driveFileId || lesson.driveFileId || lesson.filePath,
        driveWebViewLink: resourceResult.item?.driveWebViewLink || lesson.driveWebViewLink,
        driveDownloadLink: resourceResult.item?.driveDownloadLink || lesson.driveDownloadLink,
      });
    }

    const { data, error } = await supabase.from(THPT_LESSON_TABLE).upsert(cloudPayload(lesson)).select('*').single();
    if (error) throw new Error(error.message);
    lesson = normalizeLesson({ ...lesson, ...fromCloudRow(data), html: lesson.html });

    if (isDriveFileId(lesson.driveFileId || lesson.filePath)) {
      const moved = await moveDriveFile(user, lesson, lesson.status);
      if (!moved.ok) throw new Error(moved.reason);
    }

    if (previousDriveId && previousDriveId !== lesson.driveFileId && leader) {
      await moveDriveFile(user, { ...lesson, driveFileId: previousDriveId, filePath: previousDriveId }, 'archived').catch(() => null);
    }
    if (legacyStoragePath && legacyStoragePath !== lesson.filePath) {
      await supabase.storage.from(THPT_LESSON_BUCKET).remove([legacyStoragePath]).catch(() => null);
    }

    await localPut(lesson);
    return { ok: true, lesson, cloud: true };
  } catch (error) {
    return { ok: true, lesson, cloud: false, warning: `Đã lưu cục bộ; Google Drive/cloud chưa sẵn sàng: ${error.message}` };
  }
}

export async function reviewThptLesson(user, id, status, reviewNote = '') {
  if (!canPublishDepartment(user)) return { ok: false, message: 'Chỉ TTCM/Admin được duyệt bài.' };
  const existing = await localGet(id).catch(() => null) || (await listThptLessons(user)).find((item) => item.id === id);
  if (!existing) return { ok: false, message: 'Không tìm thấy bài luyện.' };
  const nextStatus = normalizeStatus(status);
  const timestamp = nowIso();
  let next = normalizeLesson({
    ...existing,
    status: nextStatus,
    reviewNote,
    reviewedBy: identity(user).email || identity(user).id,
    reviewedAt: timestamp,
    approvedAt: nextStatus === 'approved' ? timestamp : '',
    updatedAt: timestamp,
  });
  await localPut(next);
  if (!cloudEnabled(user)) return { ok: true, lesson: next, cloud: false };

  try {
    if (isDriveFileId(next.driveFileId || next.filePath)) {
      const resource = await syncResourceRecord(next);
      if (!resource.ok) throw new Error(resource.reason || 'Không thể cập nhật Kho học liệu.');
      next = normalizeLesson({
        ...next,
        resourceId: resource.item?.cloudId || resource.item?.id || next.resourceId || next.id,
        driveWebViewLink: resource.item?.driveWebViewLink || next.driveWebViewLink,
        driveDownloadLink: resource.item?.driveDownloadLink || next.driveDownloadLink,
      });
      const moved = await moveDriveFile(user, next, nextStatus);
      if (!moved.ok) throw new Error(moved.reason);
    }
    const { data, error } = await supabase.from(THPT_LESSON_TABLE).update(cloudPayload(next)).eq('id', id).select('*').single();
    if (error) throw new Error(error.message);
    const saved = normalizeLesson({ ...next, ...fromCloudRow(data), html: next.html });
    await localPut(saved);
    return { ok: true, lesson: saved, cloud: true };
  } catch (error) {
    return { ok: true, lesson: next, cloud: false, warning: error.message };
  }
}

export async function deleteThptLesson(user, id) {
  const rows = await listThptLessons(user);
  const lesson = rows.find((item) => item.id === id) || await localGet(id).catch(() => null);
  if (!lesson) return { ok: false, message: 'Không tìm thấy bài luyện.' };
  const leader = canPublishDepartment(user);
  if (!leader && (!isLessonOwner(user, lesson) || lesson.status === 'approved')) return { ok: false, message: 'Bạn không có quyền xoá bài này.' };

  await localDelete(id);
  await removeCachedResource(lesson);
  if (!cloudEnabled(user)) return { ok: true, cloud: false };
  try {
    if (leader && isDriveFileId(lesson.driveFileId || lesson.filePath)) {
      await moveDriveFile(user, lesson, 'archived').catch(() => null);
    }
    const resourceId = lesson.resourceId || (isUuid(lesson.id) ? lesson.id : '');
    if (resourceId) {
      await supabase.from('resource_items').delete().eq('id', resourceId);
    } else if (lesson.driveFileId) {
      await supabase.from('resource_items').delete().eq('drive_file_id', lesson.driveFileId);
    }
    if (lesson.filePath && !isDriveFileId(lesson.filePath)) {
      await supabase.storage.from(THPT_LESSON_BUCKET).remove([lesson.filePath]);
    }
    const { error } = await supabase.from(THPT_LESSON_TABLE).delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { ok: true, cloud: true };
  } catch (error) {
    return { ok: true, cloud: false, warning: error.message };
  }
}

async function fetchDriveHtml(lesson) {
  const token = await getAccessToken();
  if (!token) return { ok: false, message: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.' };
  const fileId = lesson.driveFileId || lesson.filePath;
  const params = new URLSearchParams({
    resourceId: lesson.resourceId || lesson.id,
    fileId,
    mode: 'inline',
  });
  const response = await fetch(`/api/google-drive-file?${params}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    let message = 'Không thể tải file HTML từ Google Drive.';
    try { message = (await response.json()).error || message; } catch { /* non-JSON */ }
    return { ok: false, message };
  }
  const html = await response.text();
  if (!html.trim()) return { ok: false, message: 'File HTML trên Google Drive đang rỗng.' };
  return { ok: true, html };
}

export async function loadThptLessonHtml(user, lesson) {
  const cached = await localGet(lesson.id).catch(() => null);
  if (cached?.html) return { ok: true, html: cached.html, lesson: cached, source: 'local' };

  const normalized = enrichFromResource(normalizeLesson(lesson));
  if (isDriveFileId(normalized.driveFileId || normalized.filePath)) {
    const result = await fetchDriveHtml(normalized);
    if (!result.ok) return result;
    const next = normalizeLesson({ ...normalized, html: result.html, driveFileId: normalized.driveFileId || normalized.filePath });
    await localPut(next);
    return { ok: true, html: result.html, lesson: next, source: 'google-drive' };
  }

  // Backward compatibility for historical rows. New uploads never enter this branch.
  if (!cloudEnabled(user) || !normalized.filePath) return { ok: false, message: 'Không tìm thấy nội dung HTML trên thiết bị này.' };
  const { data, error } = await supabase.storage.from(THPT_LESSON_BUCKET).download(normalized.filePath);
  if (error || !data) return { ok: false, message: error?.message || 'Không thể tải file HTML cũ từ cloud.' };
  const html = await data.text();
  let next = normalizeLesson({ ...normalized, html });
  await localPut(next);

  // The owner or TTCM can migrate a historical file to Drive on first open.
  if ((canPublishDepartment(user) || isLessonOwner(user, next)) && html.trim()) {
    const migrationFile = new File([html], safeFileName(next.fileName), { type: 'text/html;charset=utf-8' });
    const migrated = await saveThptLesson(user, next, migrationFile);
    if (migrated.ok && isDriveFileId(migrated.lesson?.filePath)) next = migrated.lesson;
  }
  return { ok: true, html, lesson: next, source: isDriveFileId(next.filePath) ? 'migrated-google-drive' : 'legacy-supabase-storage' };
}

export function subscribeThptLessons(user, callback) {
  if (typeof window === 'undefined') return () => {};
  let active = true;
  const refresh = async () => {
    const rows = await listThptLessons(user).catch(() => []);
    if (active) callback?.(rows);
  };
  const eventHandler = () => refresh();
  window.addEventListener(THPT_LESSON_EVENT, eventHandler);
  const channel = getChannel();
  if (channel) channel.addEventListener('message', eventHandler);
  let realtime = null;
  if (cloudEnabled(user)) {
    realtime = supabase.channel(`bes-thpt-practice-${String(user.id).slice(0, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: THPT_LESSON_TABLE }, refresh)
      .subscribe();
  }
  refresh();
  return () => {
    active = false;
    window.removeEventListener(THPT_LESSON_EVENT, eventHandler);
    if (channel) channel.removeEventListener('message', eventHandler);
    if (realtime) supabase.removeChannel(realtime);
  };
}
