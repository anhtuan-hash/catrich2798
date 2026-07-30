import { getAccessToken } from './resourceLibrary.js';
import { invalidateSupabaseReadCacheForTable, isSupabaseConfigured, supabase } from './supabase.js';

export const WEEKLY_PRACTICE_BUCKET = 'weekly-practice';
export const WEEKLY_PRACTICE_DRIVE_STORAGE = 'google-drive';
export const WEEKLY_PRACTICE_PROOF_BUCKET = 'weekly-practice-proofs';
export const WEEKLY_PRACTICE_MAX_BYTES = 10 * 1024 * 1024;
export const WEEKLY_PRACTICE_MINIMUM_SECONDS = 45 * 60;
export const WEEKLY_PRACTICE_TABLE = 'weekly_practice_items';

export const WEEKLY_PRACTICE_CLASSES = [
  ...Array.from({ length: 12 }, (_, index) => `10.${index + 1}`),
  ...Array.from({ length: 6 }, (_, index) => `11.${index + 1}`),
  ...Array.from({ length: 9 }, (_, index) => `12.${index + 1}`),
];

const ITEM_COLUMNS = [
  'id',
  'title',
  'description',
  'week_key',
  'school_year',
  'grade',
  'category',
  'cefr',
  'question_count',
  'duration_minutes',
  'opens_at',
  'closes_at',
  'status',
  'allow_retake',
  'max_attempts',
  'collect_results',
  'show_answers',
  'storage_bucket',
  'storage_path',
  'file_name',
  'file_size',
  'created_by',
  'created_at',
  'updated_at',
  'published_at',
  'is_featured',
].join(',');

const WEEKLY_HTML_CACHE_NAME = 'bes-weekly-practice-html-v1';
const DRIVE_ACTION_ENDPOINT = '/api/weekly-practice-drive-action';
let managedMigrationPromise = null;

function requireClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase chưa được cấu hình cho website Brian.');
  }
  return supabase;
}

function cleanText(value, fallback = '') {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  return normalized || fallback;
}

function toInteger(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function escapeScriptJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/-->/g, '--\\u003e');
}

function safeJsonObject(value, maxChars = 40000) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  try {
    const json = JSON.stringify(value);
    if (json.length > maxChars) return { truncated: true };
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function isDriveFileId(value) {
  const raw = cleanText(value);
  return raw.length >= 10 && !raw.includes('/') && /^[A-Za-z0-9_-]+$/.test(raw);
}

export function isGoogleDriveWeeklyPractice(item) {
  return cleanText(item?.storage_bucket).toLowerCase() === WEEKLY_PRACTICE_DRIVE_STORAGE
    || isDriveFileId(item?.storage_path);
}

function encodeMetadata(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

async function uploadWeeklyPracticeDriveFile(file, form = {}) {
  const token = await getAccessToken();
  if (!token) throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để tải file lên Google Drive.');
  const metadata = {
    title: cleanText(form.title, file.name),
    description: cleanText(form.description),
    category: 'worksheet',
    grade: cleanText(form.grade, 'Tất cả'),
    unitName: cleanText(form.week_key),
    cefr: cleanText(form.cefr),
    status: cleanText(form.status, 'draft'),
    visibility: 'department',
    fileName: file.name,
    mimeType: 'text/html',
    size: file.size,
    source: 'weekly-practice',
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
  try { data = await response.json(); } catch { /* retain fallback message */ }
  if (!response.ok) throw new Error(data.error || 'Không thể tải bài HTML lên Google Drive.');
  if (!data.fileId) throw new Error('Google Drive không trả về mã file.');
  return data;
}

async function driveAction(action, item, status = item?.status) {
  if (!item?.id) return null;
  const token = await getAccessToken();
  if (!token) return null;
  const response = await fetch(DRIVE_ACTION_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, practiceId: item.id, status }),
  });
  let data = {};
  try { data = await response.json(); } catch { /* retain fallback */ }
  if (!response.ok) throw new Error(data.error || 'Không thể cập nhật file Google Drive.');
  return data;
}

async function migrateLegacyManagedItems(items) {
  const legacy = (items || []).filter((item) => item?.storage_path && !isGoogleDriveWeeklyPractice(item));
  if (!legacy.length) return items;
  if (managedMigrationPromise) return managedMigrationPromise;

  managedMigrationPromise = (async () => {
    const replacements = new Map();
    const batch = legacy.slice(0, 24);
    for (const item of batch) {
      try {
        const result = await driveAction('migrate', item, item.status);
        if (result?.item?.id) replacements.set(result.item.id, normalizeWeeklyPracticeItem(result.item));
      } catch (error) {
        console.warn('[Weekly Practice] Legacy Storage migration deferred:', item.id, error);
      }
    }
    return (items || []).map((item) => replacements.get(item.id) || item);
  })();

  try {
    return await managedMigrationPromise;
  } finally {
    managedMigrationPromise = null;
  }
}

export function normalizeWeeklyPracticeItem(item) {
  const storagePath = cleanText(item?.storage_path);
  const inferredStorage = isDriveFileId(storagePath) ? WEEKLY_PRACTICE_DRIVE_STORAGE : WEEKLY_PRACTICE_BUCKET;
  return {
    ...item,
    title: cleanText(item?.title, 'Bài luyện tập tiếng Anh'),
    description: cleanText(item?.description),
    week_key: cleanText(item?.week_key),
    school_year: cleanText(item?.school_year),
    grade: cleanText(item?.grade),
    category: cleanText(item?.category),
    cefr: cleanText(item?.cefr),
    question_count: toInteger(item?.question_count, 0),
    duration_minutes: Math.max(45, toInteger(item?.duration_minutes, 45)),
    file_size: Number(item?.file_size || 0),
    storage_bucket: cleanText(item?.storage_bucket, inferredStorage),
    storage_path: storagePath,
    allow_retake: item?.allow_retake !== false,
    collect_results: item?.collect_results !== false,
    show_answers: item?.show_answers !== false,
    is_featured: item?.is_featured === true,
  };
}

export function getWeeklyPracticeAvailability(item, now = new Date()) {
  const opensAt = safeDate(item?.opens_at);
  const closesAt = safeDate(item?.closes_at);
  const status = cleanText(item?.status, 'draft').toLowerCase();

  if (status === 'maintenance') return { state: 'maintenance', canOpen: false, label: 'Đang bảo trì' };
  if (status !== 'published') return { state: status, canOpen: false, label: 'Chưa công bố' };
  if (opensAt && now < opensAt) return { state: 'upcoming', canOpen: false, label: 'Sắp mở' };
  if (closesAt && now > closesAt) return { state: 'closed', canOpen: false, label: 'Đã hết hạn' };
  return { state: 'open', canOpen: true, label: 'Đang mở' };
}

export async function listPublicWeeklyPractices() {
  const client = requireClient();
  const { data, error } = await client
    .from(WEEKLY_PRACTICE_TABLE)
    .select(ITEM_COLUMNS)
    .eq('status', 'published')
    .order('is_featured', { ascending: false })
    .order('opens_at', { ascending: false })
    .limit(80);
  if (error) throw error;
  return (data || []).map(normalizeWeeklyPracticeItem);
}

export async function listManagedWeeklyPractices() {
  const client = requireClient();
  const { data, error } = await client
    .from(WEEKLY_PRACTICE_TABLE)
    .select(ITEM_COLUMNS)
    .order('opens_at', { ascending: false })
    .limit(120);
  if (error) throw error;
  const rows = (data || []).map(normalizeWeeklyPracticeItem);
  return migrateLegacyManagedItems(rows);
}

export function validateWeeklyPracticeFile(file) {
  if (!file) throw new Error('Hãy chọn một file HTML tự chứa.');
  const name = cleanText(file.name).toLowerCase();
  const type = cleanText(file.type).toLowerCase();
  if (!name.endsWith('.html') && !name.endsWith('.htm')) {
    throw new Error('Chỉ chấp nhận file .html hoặc .htm.');
  }
  if (type && !['text/html', 'application/xhtml+xml'].includes(type)) {
    throw new Error('File đã chọn không có định dạng HTML hợp lệ.');
  }
  if (!Number.isFinite(file.size) || file.size <= 0) throw new Error('File HTML đang trống.');
  if (file.size > WEEKLY_PRACTICE_MAX_BYTES) {
    throw new Error('File vượt quá giới hạn 10 MB. Hãy nén ảnh và âm thanh trước khi tải lên.');
  }
  return true;
}

export async function createWeeklyPractice({ form, file, currentUser }) {
  validateWeeklyPracticeFile(file);
  const client = requireClient();
  const weekKey = cleanText(form?.week_key);
  const title = cleanText(form?.title);
  if (!title) throw new Error('Tên bài luyện tập không được để trống.');
  if (!weekKey) throw new Error('Tuần học không được để trống.');

  const uploaded = await uploadWeeklyPracticeDriveFile(file, form);
  const opensAt = form?.opens_at ? new Date(form.opens_at).toISOString() : new Date().toISOString();
  const closesAt = form?.closes_at ? new Date(form.closes_at).toISOString() : null;
  const status = cleanText(form?.status, 'draft');
  const payload = {
    title,
    description: cleanText(form?.description),
    week_key: weekKey,
    school_year: cleanText(form?.school_year),
    grade: cleanText(form?.grade, 'Tất cả'),
    category: cleanText(form?.category, 'Tổng hợp'),
    cefr: cleanText(form?.cefr),
    question_count: Math.max(0, toInteger(form?.question_count, 0)),
    duration_minutes: Math.max(45, toInteger(form?.duration_minutes, 45)),
    opens_at: opensAt,
    closes_at: closesAt,
    status,
    allow_retake: form?.allow_retake !== false,
    max_attempts: form?.max_attempts ? Math.max(1, toInteger(form.max_attempts, 1)) : null,
    collect_results: true,
    show_answers: form?.show_answers !== false,
    storage_bucket: WEEKLY_PRACTICE_DRIVE_STORAGE,
    storage_path: uploaded.fileId,
    file_name: cleanText(file.name),
    file_size: file.size,
    created_by: currentUser?.id || null,
    published_at: status === 'published' ? new Date().toISOString() : null,
    is_featured: form?.is_featured === true,
  };

  const { data, error } = await client
    .from(WEEKLY_PRACTICE_TABLE)
    .insert(payload)
    .select(ITEM_COLUMNS)
    .single();

  if (error) throw error;
  invalidateSupabaseReadCacheForTable(WEEKLY_PRACTICE_TABLE);
  const item = normalizeWeeklyPracticeItem(data);
  driveAction('move', item, status).catch((moveError) => {
    console.warn('[Weekly Practice] Drive folder move deferred:', moveError);
  });
  return item;
}

export async function updateWeeklyPracticeStatus(item, status) {
  const client = requireClient();
  const nextStatus = cleanText(status, 'draft');
  const patch = {
    status: nextStatus,
    collect_results: true,
    duration_minutes: Math.max(45, toInteger(item?.duration_minutes, 45)),
    published_at: nextStatus === 'published' ? new Date().toISOString() : item?.published_at || null,
  };
  const { data, error } = await client
    .from(WEEKLY_PRACTICE_TABLE)
    .update(patch)
    .eq('id', item.id)
    .select(ITEM_COLUMNS)
    .single();
  if (error) throw error;
  invalidateSupabaseReadCacheForTable(WEEKLY_PRACTICE_TABLE);
  const updated = normalizeWeeklyPracticeItem(data);
  driveAction('move', updated, nextStatus).catch((moveError) => {
    console.warn('[Weekly Practice] Drive folder move deferred:', moveError);
  });
  return updated;
}

export async function deleteWeeklyPractice(item) {
  const client = requireClient();
  if (isGoogleDriveWeeklyPractice(item)) {
    await driveAction('archive', item, 'archived').catch((archiveError) => {
      console.warn('[Weekly Practice] Drive archive deferred:', archiveError);
    });
  }
  const { error } = await client.from(WEEKLY_PRACTICE_TABLE).delete().eq('id', item.id);
  if (error) throw error;
  if (item?.storage_path && !isGoogleDriveWeeklyPractice(item)) {
    try { await client.storage.from(item.storage_bucket || WEEKLY_PRACTICE_BUCKET).remove([item.storage_path]); } catch { /* cleanup best effort */ }
  }
  invalidateSupabaseReadCacheForTable(WEEKLY_PRACTICE_TABLE);
}

function progressKey(practiceId) {
  return `bes-weekly-practice-progress-v2:${practiceId}`;
}

export function readWeeklyPracticeProgress(practiceId) {
  if (typeof localStorage === 'undefined' || !practiceId) return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(progressKey(practiceId)) || 'null');
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function writeWeeklyPracticeProgress(practiceId, patch) {
  if (typeof localStorage === 'undefined' || !practiceId) return null;
  const current = readWeeklyPracticeProgress(practiceId) || {
    practiceId,
    storage: {},
    activeSeconds: 0,
    completed: false,
    submitted: false,
  };
  const next = {
    ...current,
    ...patch,
    storage: { ...(current.storage || {}), ...(patch?.storage || {}) },
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(progressKey(practiceId), JSON.stringify(next));
  return next;
}

export function clearWeeklyPracticeProgress(practiceId) {
  if (typeof localStorage !== 'undefined' && practiceId) localStorage.removeItem(progressKey(practiceId));
}

export function getWeeklyPracticeDeviceId() {
  const key = 'bes-weekly-practice-device-v1';
  try {
    let value = localStorage.getItem(key);
    if (!value) {
      value = randomId();
      localStorage.setItem(key, value);
    }
    return value;
  } catch {
    return randomId();
  }
}

export async function logWeeklyPracticeEvent(practiceId, eventType, metadata = {}) {
  if (!supabase || !practiceId) return;
  const event = cleanText(eventType, 'open');
  const dedupeKey = `bes-weekly-event:${practiceId}:${event}`;
  try {
    if (sessionStorage.getItem(dedupeKey)) return;
    sessionStorage.setItem(dedupeKey, '1');
  } catch { /* ignore */ }
  try {
    await supabase.from('weekly_practice_events').insert({
      practice_id: practiceId,
      event_type: event,
      device_id: getWeeklyPracticeDeviceId(),
      metadata: safeJsonObject(metadata, 4000),
    });
  } catch { /* analytics are non-blocking */ }
}

function canvasProofBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function optimizeWeeklyPracticeProof(proofBlob) {
  const originalType = cleanText(proofBlob?.type).toLowerCase();
  if (originalType === 'image/webp') return proofBlob;
  if (originalType !== 'image/png' || typeof document === 'undefined') return proofBlob;

  let source = null;
  let objectUrl = '';
  try {
    if (typeof createImageBitmap === 'function') {
      source = await createImageBitmap(proofBlob);
    } else {
      objectUrl = URL.createObjectURL(proofBlob);
      source = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Không thể đọc ảnh xác nhận.'));
        image.src = objectUrl;
      });
    }

    const width = Number(source?.width || source?.naturalWidth || 0);
    const height = Number(source?.height || source?.naturalHeight || 0);
    if (!width || !height) return proofBlob;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return proofBlob;
    context.drawImage(source, 0, 0, width, height);
    const webp = await canvasProofBlob(canvas, 'image/webp', 0.86);
    return webp?.type === 'image/webp' && webp.size > 0 && webp.size < proofBlob.size ? webp : proofBlob;
  } catch {
    return proofBlob;
  } finally {
    source?.close?.();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

export async function uploadWeeklyPracticeProof(practiceId, proofBlob) {
  const inputType = cleanText(proofBlob?.type).toLowerCase();
  if (!proofBlob || !['image/webp', 'image/png'].includes(inputType)) {
    throw new Error('Ảnh xác nhận chưa hợp lệ.');
  }
  const optimizedBlob = await optimizeWeeklyPracticeProof(proofBlob);
  const mimeType = cleanText(optimizedBlob?.type, inputType).toLowerCase();
  const client = requireClient();
  const extension = mimeType === 'image/webp' ? 'webp' : 'png';
  const path = `${practiceId}/${getWeeklyPracticeDeviceId()}/${Date.now()}-${randomId()}.${extension}`;
  const { error } = await client.storage
    .from(WEEKLY_PRACTICE_PROOF_BUCKET)
    .upload(path, optimizedBlob, {
      cacheControl: '31536000',
      contentType: mimeType,
      upsert: false,
    });
  if (error) throw error;
  return path;
}

export async function submitWeeklyPracticeResult(practiceId, identity, result = {}) {
  if (!supabase || !practiceId) return null;
  const studentName = cleanText(identity?.student_name).slice(0, 120);
  const classCode = cleanText(identity?.class_code).slice(0, 80);
  const durationSeconds = toInteger(result?.durationSeconds ?? result?.duration_seconds, 0);
  const proofPath = cleanText(result?.proofPath ?? result?.proof_path).slice(0, 500);

  if (!studentName) throw new Error('Họ và tên học sinh không được để trống.');
  if (!WEEKLY_PRACTICE_CLASSES.includes(classCode)) throw new Error('Lớp đã chọn không hợp lệ.');
  if (durationSeconds < WEEKLY_PRACTICE_MINIMUM_SECONDS) throw new Error('Chưa đủ 45 phút để gửi bài.');
  if (!proofPath) throw new Error('Chưa có ảnh xác nhận hoàn thành.');

  const payload = {
    practice_id: practiceId,
    device_id: getWeeklyPracticeDeviceId(),
    student_name: studentName,
    class_code: classCode,
    student_code: cleanText(identity?.student_code).slice(0, 80),
    score: Number.isFinite(Number(result?.score)) ? Number(result.score) : null,
    max_score: Number.isFinite(Number(result?.maxScore ?? result?.max_score)) ? Number(result.maxScore ?? result.max_score) : null,
    correct_count: Number.isFinite(Number(result?.correctCount ?? result?.correct_count)) ? toInteger(result.correctCount ?? result.correct_count) : null,
    question_count: Number.isFinite(Number(result?.questionCount ?? result?.question_count)) ? toInteger(result.questionCount ?? result.question_count) : null,
    duration_seconds: durationSeconds,
    proof_path: proofPath,
    answers: safeJsonObject(result?.answers, 60000),
    metadata: safeJsonObject(result?.metadata, 12000),
  };
  const { data, error } = await supabase
    .from('weekly_practice_results')
    .insert(payload)
    .select('id,created_at')
    .single();
  if (error) throw error;
  return data;
}

function runtimeBridgeScript(practiceId, initialProgress) {
  const initialStorage = initialProgress?.storage && typeof initialProgress.storage === 'object'
    ? initialProgress.storage
    : {};
  return `(() => {
    const SOURCE = 'brian-weekly-practice';
    const HOST_SOURCE = 'brian-weekly-host';
    const practiceId = ${escapeScriptJson(practiceId)};
    const values = ${escapeScriptJson(initialStorage)};
    const keys = () => Object.keys(values);
    const send = (type, payload = {}) => {
      try { window.parent.postMessage({ source: SOURCE, practiceId, type, payload }, '*'); } catch (_) {}
    };
    const storage = {
      get length() { return keys().length; },
      key(index) { return keys()[Number(index)] ?? null; },
      getItem(key) { key = String(key); return Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : null; },
      setItem(key, value) { key = String(key); values[key] = String(value); send('storage', { operation: 'set', key, value: String(value) }); },
      removeItem(key) { key = String(key); delete values[key]; send('storage', { operation: 'remove', key }); },
      clear() { Object.keys(values).forEach((key) => delete values[key]); send('storage', { operation: 'clear' }); },
    };
    try { Object.defineProperty(window, 'localStorage', { configurable: true, enumerable: true, value: storage }); } catch (_) {}
    window.BrianWeeklyPractice = Object.freeze({
      saveProgress(payload = {}) { send('progress', payload); },
      complete(payload = {}) { send('complete', payload); },
      getState() { return { ...values }; },
      reset() { storage.clear(); send('reset', {}); },
    });
    window.addEventListener('message', (event) => {
      const message = event.data || {};
      if (message.source !== HOST_SOURCE || message.practiceId !== practiceId) return;
      if (message.type === 'font-scale') {
        const scale = Math.min(1.5, Math.max(.8, Number(message.value) || 1));
        document.documentElement.style.fontSize = (16 * scale) + 'px';
      }
    });
    window.addEventListener('load', () => send('ready', { title: document.title || '' }), { once: true });
    window.addEventListener('beforeunload', () => send('progress', { pageUnloaded: true }));
  })();`;
}

function weeklyPracticeFileUrl(item) {
  const version = cleanText(item?.updated_at || item?.storage_path || item?.created_at);
  return `/api/weekly-practice-file?id=${encodeURIComponent(item.id)}&v=${encodeURIComponent(version)}`;
}

async function pruneOldWeeklyHtml(cache, item, keepUrl) {
  try {
    const keep = new URL(keepUrl, window.location.origin).href;
    const keys = await cache.keys();
    await Promise.all(keys.map((request) => {
      const url = new URL(request.url);
      return url.pathname === '/api/weekly-practice-file'
        && url.searchParams.get('id') === String(item.id)
        && request.url !== keep
        ? cache.delete(request)
        : null;
    }));
  } catch { /* optional cache cleanup */ }
}

async function loadWeeklyPracticeRawHtml(item) {
  const url = weeklyPracticeFileUrl(item);
  const canCache = typeof window !== 'undefined' && 'caches' in window;
  if (canCache) {
    try {
      const cache = await caches.open(WEEKLY_HTML_CACHE_NAME);
      const cached = await cache.match(url);
      if (cached) return cached.text();
      const response = await fetch(url, { credentials: 'omit', headers: { Accept: 'text/html' } });
      if (!response.ok) {
        let message = 'Không thể tải file HTML của bài luyện tập.';
        try { message = (await response.json()).error || message; } catch { /* non-JSON response */ }
        throw new Error(message);
      }
      await cache.put(url, response.clone());
      await pruneOldWeeklyHtml(cache, item, url);
      return response.text();
    } catch (error) {
      if (!navigator.onLine) throw error;
    }
  }

  const response = await fetch(url, { credentials: 'omit', headers: { Accept: 'text/html' } });
  if (!response.ok) {
    let message = 'Không thể tải file HTML của bài luyện tập.';
    try { message = (await response.json()).error || message; } catch { /* non-JSON response */ }
    throw new Error(message);
  }
  return response.text();
}

export async function downloadWeeklyPracticeHtml(item) {
  if (!item?.id || !item?.storage_path) throw new Error('Bài luyện tập chưa có file HTML.');
  const html = await loadWeeklyPracticeRawHtml(item);
  const bridge = runtimeBridgeScript(item.id, readWeeklyPracticeProgress(item.id));
  const safeBridge = bridge.split('</script').join('<\\/script');
  const bridgeTag = `<script>${safeBridge}</script>`;
  const hydrated = /<head[^>]*>/i.test(html)
    ? html.replace(/<head([^>]*)>/i, `<head$1>${bridgeTag}`)
    : `${bridgeTag}${html}`;
  return new Blob([hydrated], { type: 'text/html;charset=utf-8' });
}
