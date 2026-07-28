import { invalidateSupabaseReadCacheForTable, isSupabaseConfigured, supabase } from './supabase.js';

export const WEEKLY_PRACTICE_BUCKET = 'weekly-practice';
export const WEEKLY_PRACTICE_MAX_BYTES = 10 * 1024 * 1024;
export const WEEKLY_PRACTICE_TABLE = 'weekly_practice_items';

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

export function normalizeWeeklyPracticeItem(item) {
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
    duration_minutes: toInteger(item?.duration_minutes, 0),
    file_size: Number(item?.file_size || 0),
    storage_bucket: cleanText(item?.storage_bucket, WEEKLY_PRACTICE_BUCKET),
    storage_path: cleanText(item?.storage_path),
    allow_retake: item?.allow_retake !== false,
    collect_results: item?.collect_results === true,
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
  return (data || []).map(normalizeWeeklyPracticeItem);
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

  const extension = file.name.toLowerCase().endsWith('.htm') ? 'htm' : 'html';
  const safeWeek = weekKey.replace(/[^a-zA-Z0-9_-]/g, '-');
  const path = `${cleanText(form?.school_year, 'unspecified')}/${safeWeek}/${randomId()}.${extension}`;
  const { error: uploadError } = await client.storage
    .from(WEEKLY_PRACTICE_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      contentType: 'text/html; charset=utf-8',
      upsert: false,
    });
  if (uploadError) throw uploadError;

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
    duration_minutes: Math.max(0, toInteger(form?.duration_minutes, 0)),
    opens_at: opensAt,
    closes_at: closesAt,
    status,
    allow_retake: form?.allow_retake !== false,
    max_attempts: form?.max_attempts ? Math.max(1, toInteger(form.max_attempts, 1)) : null,
    collect_results: form?.collect_results === true,
    show_answers: form?.show_answers !== false,
    storage_bucket: WEEKLY_PRACTICE_BUCKET,
    storage_path: path,
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

  if (error) {
    try { await client.storage.from(WEEKLY_PRACTICE_BUCKET).remove([path]); } catch { /* cleanup best effort */ }
    throw error;
  }
  invalidateSupabaseReadCacheForTable(WEEKLY_PRACTICE_TABLE);
  return normalizeWeeklyPracticeItem(data);
}

export async function updateWeeklyPracticeStatus(item, status) {
  const client = requireClient();
  const nextStatus = cleanText(status, 'draft');
  const patch = {
    status: nextStatus,
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
  return normalizeWeeklyPracticeItem(data);
}

export async function deleteWeeklyPractice(item) {
  const client = requireClient();
  const { error } = await client.from(WEEKLY_PRACTICE_TABLE).delete().eq('id', item.id);
  if (error) throw error;
  if (item?.storage_path) {
    try { await client.storage.from(item.storage_bucket || WEEKLY_PRACTICE_BUCKET).remove([item.storage_path]); } catch { /* cleanup best effort */ }
  }
  invalidateSupabaseReadCacheForTable(WEEKLY_PRACTICE_TABLE);
}

function progressKey(practiceId) {
  return `bes-weekly-practice-progress-v1:${practiceId}`;
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
    startedAt: new Date().toISOString(),
    completed: false,
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

function deviceId() {
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
      device_id: deviceId(),
      metadata: safeJsonObject(metadata, 4000),
    });
  } catch { /* analytics are non-blocking */ }
}

export async function submitWeeklyPracticeResult(practiceId, identity, result = {}) {
  if (!supabase || !practiceId) return null;
  const payload = {
    practice_id: practiceId,
    device_id: deviceId(),
    student_name: cleanText(identity?.student_name).slice(0, 120),
    class_code: cleanText(identity?.class_code).slice(0, 80),
    student_code: cleanText(identity?.student_code).slice(0, 80),
    score: Number.isFinite(Number(result?.score)) ? Number(result.score) : null,
    max_score: Number.isFinite(Number(result?.maxScore ?? result?.max_score)) ? Number(result.maxScore ?? result.max_score) : null,
    correct_count: Number.isFinite(Number(result?.correctCount ?? result?.correct_count)) ? toInteger(result.correctCount ?? result.correct_count) : null,
    question_count: Number.isFinite(Number(result?.questionCount ?? result?.question_count)) ? toInteger(result.questionCount ?? result.question_count) : null,
    duration_seconds: Number.isFinite(Number(result?.durationSeconds ?? result?.duration_seconds)) ? toInteger(result.durationSeconds ?? result.duration_seconds) : null,
    answers: safeJsonObject(result?.answers, 60000),
    metadata: safeJsonObject(result?.metadata, 12000),
  };
  const { data, error } = await supabase.from('weekly_practice_results').insert(payload).select('id').single();
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

export async function downloadWeeklyPracticeHtml(item) {
  const client = requireClient();
  if (!item?.storage_path) throw new Error('Bài luyện tập chưa có file HTML.');
  const { data, error } = await client.storage
    .from(item.storage_bucket || WEEKLY_PRACTICE_BUCKET)
    .download(item.storage_path);
  if (error) throw error;
  const html = await data.text();
  const bridge = runtimeBridgeScript(item.id, readWeeklyPracticeProgress(item.id));
  const safeBridge = bridge.split('</script').join('<\\/script');
  const bridgeTag = `<script>${safeBridge}</script>`;
  const hydrated = /<head[^>]*>/i.test(html)
    ? html.replace(/<head([^>]*)>/i, `<head$1>${bridgeTag}`)
    : `${bridgeTag}${html}`;
  return new Blob([hydrated], { type: 'text/html;charset=utf-8' });
}
