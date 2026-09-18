
import { isSupabaseConfigured, supabase } from './supabase.js';

export const STUDENT_RECORD_BUCKET = 'student-records-private';
const MAX_IMAGE_EDGE = 2200;
const WEBP_QUALITY = 0.9;

function safeSegment(value, fallback = 'unknown') {
  const clean = String(value ?? '').trim().replace(/[\/\\]+/g, '-').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return clean || fallback;
}

function extensionFor(type, name = '') {
  const mime = String(type || '').toLowerCase();
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('png')) return 'png';
  if (mime.includes('heic')) return 'heic';
  if (mime.includes('heif')) return 'heif';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  const ext = String(name || '').toLowerCase().match(/\.([a-z0-9]{2,5})$/)?.[1];
  return ext || 'jpg';
}

async function authUser() {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data?.user || null;
}

async function canvasBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function optimizeStudentRecordImage(file) {
  if (!file || typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;
  const type = String(file.type || '');
  if (!type.startsWith('image/') || /heic|heif/i.test(type)) return file;

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    const largest = Math.max(bitmap.width, bitmap.height);
    const scale = largest > MAX_IMAGE_EDGE ? MAX_IMAGE_EDGE / largest : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    if (scale === 1 && file.size <= 2.5 * 1024 * 1024) return file;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await canvasBlob(canvas, 'image/webp', WEBP_QUALITY);
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], (String(file.name || 'scan').replace(/\.[^.]+$/, '') || 'scan') + '.webp', {
      type: 'image/webp',
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    bitmap?.close?.();
  }
}

export async function uploadStudentRecordCloudMedia({ workspaceId, studentId, captureId, file }) {
  if (!isSupabaseConfigured || !supabase) return { ok: false, offline: true, message: 'Cloud chưa được cấu hình.' };
  const user = await authUser();
  if (!user?.id) return { ok: false, offline: true, message: 'Cần đăng nhập để đồng bộ ảnh.' };
  const optimized = await optimizeStudentRecordImage(file);
  const ext = extensionFor(optimized?.type, optimized?.name);
  const path = [
    user.id,
    safeSegment(workspaceId, 'default'),
    safeSegment(studentId, 'student'),
    safeSegment(captureId, 'capture') + '.' + ext,
  ].join('/');
  const { error } = await supabase.storage.from(STUDENT_RECORD_BUCKET).upload(path, optimized, {
    cacheControl: '3600',
    contentType: optimized?.type || file?.type || 'image/jpeg',
    upsert: false,
  });
  if (error) return { ok: false, message: error.message };
  return {
    ok: true,
    path,
    size: Number(optimized?.size || 0),
    contentType: optimized?.type || file?.type || '',
  };
}

export async function downloadStudentRecordCloudMedia(path) {
  if (!path || !isSupabaseConfigured || !supabase) return { ok: false, message: 'Cloud chưa sẵn sàng.' };
  const { data, error } = await supabase.storage.from(STUDENT_RECORD_BUCKET).download(path);
  if (error) return { ok: false, message: error.message };
  return { ok: true, blob: data };
}

export async function deleteStudentRecordCloudMedia(path) {
  if (!path || !isSupabaseConfigured || !supabase) return { ok: true };
  const { error } = await supabase.storage.from(STUDENT_RECORD_BUCKET).remove([path]);
  return error ? { ok: false, message: error.message } : { ok: true };
}

export async function cleanupStudentRecordCloudOrphans({ workspaceId, studentId, keepPaths = [] }) {
  if (!isSupabaseConfigured || !supabase) return { ok: false, offline: true, removed: 0 };
  const user = await authUser();
  if (!user?.id) return { ok: false, offline: true, removed: 0 };
  const prefix = [
    user.id,
    safeSegment(workspaceId, 'default'),
    safeSegment(studentId, 'student'),
  ].join('/');
  const keep = new Set((keepPaths || []).filter(Boolean));
  const stale = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.storage.from(STUDENT_RECORD_BUCKET).list(prefix, {
      limit: 100,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) return { ok: false, message: error.message, removed: 0 };
    const items = data || [];
    items.forEach((item) => {
      const fullPath = prefix + '/' + item.name;
      if (!keep.has(fullPath)) stale.push(fullPath);
    });
    if (items.length < 100) break;
    offset += items.length;
  }
  if (!stale.length) return { ok: true, removed: 0 };
  const { error: removeError } = await supabase.storage.from(STUDENT_RECORD_BUCKET).remove(stale);
  return removeError
    ? { ok: false, message: removeError.message, removed: 0 }
    : { ok: true, removed: stale.length };
}

export function studentRecordCloudEnabled() {
  return Boolean(isSupabaseConfigured && supabase);
}
