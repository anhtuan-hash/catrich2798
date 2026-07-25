import { canPublishDepartment } from './permissions.js';
import { isSupabaseConfigured, supabase } from './supabase.js';
import * as base from './thptPracticeHubDrive.js';

export {
  THPT_LESSON_EVENT,
  THPT_LESSON_TABLE,
  THPT_LESSON_BUCKET,
  THPT_MAX_HTML_BYTES,
  THPT_DIRECT_RESOURCE_TAG,
  normalizeLesson,
  isLessonOwner,
  validateHtmlFile,
  readHtmlFile,
  loadThptLessonHtml,
} from './thptPracticeHubDrive.js';

const THPT_LIST_CACHE_TTL = 60 * 60 * 1000;
const listCache = new Map();
const listPromises = new Map();
const pendingMutations = new Set();

function userKey(user) {
  return String(user?.id || user?.authId || user?.email || 'guest').trim().toLowerCase();
}

function readCache(user) {
  const cached = listCache.get(userKey(user));
  if (!cached || Date.now() - cached.storedAt >= THPT_LIST_CACHE_TTL) return null;
  return cached.rows;
}

function writeCache(user, rows) {
  const normalized = (rows || [])
    .map(base.normalizeLesson)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  listCache.set(userKey(user), { rows: normalized, storedAt: Date.now() });
  return normalized;
}

function visibleToUser(user, lesson) {
  if (canPublishDepartment(user)) return true;
  if (base.isLessonOwner(user, lesson)) return true;
  return lesson.status === 'approved' && lesson.visibility === 'department';
}

function updateCachedLesson(user, lesson) {
  const key = userKey(user);
  const cached = listCache.get(key);
  if (!cached || !lesson?.id) return false;
  const normalized = base.normalizeLesson(lesson);
  const existing = cached.rows.find((item) => item.id === normalized.id);
  const merged = base.normalizeLesson({
    ...existing,
    ...normalized,
    resourceId: normalized.resourceId || existing?.resourceId || '',
    driveFileId: normalized.driveFileId || existing?.driveFileId || '',
    driveWebViewLink: normalized.driveWebViewLink || existing?.driveWebViewLink || '',
    driveDownloadLink: normalized.driveDownloadLink || existing?.driveDownloadLink || '',
    checksum: normalized.checksum || existing?.checksum || '',
    html: existing?.html || normalized.html || '',
  });
  const rows = visibleToUser(user, merged)
    ? [merged, ...cached.rows.filter((item) => item.id !== merged.id)]
    : cached.rows.filter((item) => item.id !== merged.id);
  listCache.set(key, {
    rows: rows.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))),
    storedAt: Date.now(),
  });
  return true;
}

function removeCachedLesson(user, id) {
  const key = userKey(user);
  const cached = listCache.get(key);
  if (!cached) return false;
  listCache.set(key, {
    rows: cached.rows.filter((item) => item.id !== String(id)),
    storedAt: Date.now(),
  });
  return true;
}

function applyRealtimePayload(user, payload) {
  const row = payload?.new && Object.keys(payload.new).length ? payload.new : payload?.old;
  if (!row?.id) return false;
  if (payload?.eventType === 'DELETE') return removeCachedLesson(user, row.id);
  return updateCachedLesson(user, { ...row, cloud: true });
}

function announceOptimized(detail = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(base.THPT_LESSON_EVENT, {
    detail: { ...detail, source: 'optimized-cache' },
  }));
}

export async function listThptLessons(user, { force = false } = {}) {
  const key = userKey(user);
  const cached = force ? null : readCache(user);
  if (cached) return cached;
  if (!force && listPromises.has(key)) return listPromises.get(key);

  const task = base.listThptLessons(user)
    .then((rows) => writeCache(user, rows))
    .finally(() => {
      if (listPromises.get(key) === task) listPromises.delete(key);
    });
  listPromises.set(key, task);
  return task;
}

async function runMutation(user, operation, detail) {
  const key = userKey(user);
  pendingMutations.add(key);
  try {
    const result = await operation();
    if (result?.lesson) updateCachedLesson(user, result.lesson);
    if (detail?.type === 'deleted' && detail.id) removeCachedLesson(user, detail.id);
    return result;
  } finally {
    pendingMutations.delete(key);
    announceOptimized(detail);
  }
}

export function saveThptLesson(user, draft = {}, file = null) {
  return runMutation(user, () => base.saveThptLesson(user, draft, file), {
    type: 'saved',
    id: draft?.id || '',
  });
}

export function reviewThptLesson(user, id, status, reviewNote = '') {
  return runMutation(user, () => base.reviewThptLesson(user, id, status, reviewNote), {
    type: 'reviewed',
    id,
  });
}

export function deleteThptLesson(user, id) {
  return runMutation(user, () => base.deleteThptLesson(user, id), {
    type: 'deleted',
    id,
  });
}

export function subscribeThptLessons(user, callback) {
  if (typeof window === 'undefined') return () => {};
  let active = true;
  const key = userKey(user);

  const publish = async ({ force = false } = {}) => {
    const rows = await listThptLessons(user, { force }).catch(() => []);
    if (active) callback?.(rows);
  };

  const localHandler = () => {
    if (pendingMutations.has(key)) return;
    publish();
  };
  window.addEventListener(base.THPT_LESSON_EVENT, localHandler);

  let realtime = null;
  if (isSupabaseConfigured && supabase && user?.id) {
    realtime = supabase
      .channel(`bes-thpt-practice-optimized-${String(user.id).slice(0, 8)}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: base.THPT_LESSON_TABLE,
      }, (payload) => {
        const updated = applyRealtimePayload(user, payload);
        publish({ force: !updated });
      })
      .subscribe();
  }

  publish();
  return () => {
    active = false;
    window.removeEventListener(base.THPT_LESSON_EVENT, localHandler);
    if (realtime) supabase.removeChannel(realtime);
  };
}
