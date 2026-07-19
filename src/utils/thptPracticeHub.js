import { canPublishDepartment } from './permissions.js';
import { isSupabaseConfigured, supabase } from './supabase.js';

export const THPT_LESSON_EVENT = 'bes-thpt-practice-lessons-updated';
export const THPT_LESSON_TABLE = 'thpt_html_lessons';
export const THPT_LESSON_BUCKET = 'thpt-html-lessons';
export const THPT_MAX_HTML_BYTES = 20 * 1024 * 1024;

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

export function normalizeLesson(item = {}) {
  const createdAt = item.created_at || item.createdAt || nowIso();
  return {
    id: String(item.id || `thpt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`),
    title: clean(item.title || item.file_name || item.fileName || 'Bài luyện THPT', 140),
    description: clean(item.description, 1200),
    topic: clean(item.topic, 120),
    grade: clean(item.grade || '12', 20),
    cefr: clean(item.cefr || 'B2–C1', 30),
    status: normalizeStatus(item.status),
    visibility: normalizeVisibility(item.visibility),
    ownerId: String(item.owner_id || item.ownerId || ''),
    ownerEmail: clean(item.owner_email || item.ownerEmail, 200).toLowerCase(),
    ownerName: clean(item.owner_name || item.ownerName || item.ownerEmail || 'Teacher', 160),
    fileName: clean(item.file_name || item.fileName || 'bai-luyen-thpt.html', 180),
    filePath: clean(item.file_path || item.filePath, 500),
    fileSize: Number(item.file_size || item.fileSize || 0),
    fileMime: clean(item.file_mime || item.fileMime || 'text/html', 120),
    html: typeof item.html === 'string' ? item.html : '',
    version: Math.max(1, Number(item.version_number || item.version || 1)),
    reviewNote: clean(item.review_note || item.reviewNote, 1000),
    reviewedBy: clean(item.reviewed_by || item.reviewedBy, 200),
    reviewedAt: item.reviewed_at || item.reviewedAt || '',
    approvedAt: item.approved_at || item.approvedAt || '',
    createdAt,
    updatedAt: item.updated_at || item.updatedAt || createdAt,
    cloud: Boolean(item.cloud || item.file_path || item.filePath),
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

async function cloudList(user) {
  if (!cloudEnabled(user)) return { ok: false, offline: true, rows: [] };
  const { data, error } = await supabase.from(THPT_LESSON_TABLE).select('*').order('updated_at', { ascending: false });
  if (error) return { ok: false, reason: error.message, rows: [] };
  return { ok: true, rows: (data || []).map(fromCloudRow) };
}

async function uploadCloudHtml(user, lesson) {
  const path = `${identity(user).id}/${lesson.id}/v${lesson.version}-${safeFileName(lesson.fileName)}`;
  const blob = new Blob([lesson.html], { type: 'text/html;charset=utf-8' });
  const { error } = await supabase.storage.from(THPT_LESSON_BUCKET).upload(path, blob, {
    cacheControl: '3600', upsert: true, contentType: 'text/html;charset=utf-8',
  });
  if (error) throw new Error(error.message);
  return path;
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
    file_path: lesson.filePath || null,
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
  const lesson = normalizeLesson({
    ...existing,
    ...draft,
    id: existing?.id || (crypto?.randomUUID?.() || `thpt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`),
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

  try {
    if (fileData || !lesson.filePath) lesson.filePath = await uploadCloudHtml(user, lesson);
    const { data, error } = await supabase.from(THPT_LESSON_TABLE).upsert(cloudPayload(lesson)).select('*').single();
    if (error) throw new Error(error.message);
    const saved = normalizeLesson({ ...lesson, ...fromCloudRow(data), html: lesson.html });
    await localPut(saved);
    return { ok: true, lesson: saved, cloud: true };
  } catch (error) {
    return { ok: true, lesson, cloud: false, warning: `Đã lưu cục bộ; cloud chưa sẵn sàng: ${error.message}` };
  }
}

export async function reviewThptLesson(user, id, status, reviewNote = '') {
  if (!canPublishDepartment(user)) return { ok: false, message: 'Chỉ TTCM/Admin được duyệt bài.' };
  const existing = await localGet(id).catch(() => null) || (await listThptLessons(user)).find((item) => item.id === id);
  if (!existing) return { ok: false, message: 'Không tìm thấy bài luyện.' };
  const nextStatus = normalizeStatus(status);
  const timestamp = nowIso();
  const next = normalizeLesson({
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
  const { data, error } = await supabase.from(THPT_LESSON_TABLE).update(cloudPayload(next)).eq('id', id).select('*').single();
  if (error) return { ok: true, lesson: next, cloud: false, warning: error.message };
  const saved = normalizeLesson({ ...next, ...fromCloudRow(data), html: next.html });
  await localPut(saved);
  return { ok: true, lesson: saved, cloud: true };
}

export async function deleteThptLesson(user, id) {
  const rows = await listThptLessons(user);
  const lesson = rows.find((item) => item.id === id) || await localGet(id).catch(() => null);
  if (!lesson) return { ok: false, message: 'Không tìm thấy bài luyện.' };
  const leader = canPublishDepartment(user);
  if (!leader && (!isLessonOwner(user, lesson) || lesson.status === 'approved')) return { ok: false, message: 'Bạn không có quyền xoá bài này.' };

  await localDelete(id);
  if (!cloudEnabled(user)) return { ok: true, cloud: false };
  try {
    if (lesson.filePath) await supabase.storage.from(THPT_LESSON_BUCKET).remove([lesson.filePath]);
    const { error } = await supabase.from(THPT_LESSON_TABLE).delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { ok: true, cloud: true };
  } catch (error) {
    return { ok: true, cloud: false, warning: error.message };
  }
}

export async function loadThptLessonHtml(user, lesson) {
  const cached = await localGet(lesson.id).catch(() => null);
  if (cached?.html) return { ok: true, html: cached.html, lesson: cached, source: 'local' };
  if (!cloudEnabled(user) || !lesson.filePath) return { ok: false, message: 'Không tìm thấy nội dung HTML trên thiết bị này.' };
  const { data, error } = await supabase.storage.from(THPT_LESSON_BUCKET).download(lesson.filePath);
  if (error || !data) return { ok: false, message: error?.message || 'Không thể tải file HTML từ cloud.' };
  const html = await data.text();
  const next = normalizeLesson({ ...lesson, html });
  await localPut(next);
  return { ok: true, html, lesson: next, source: 'cloud' };
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
