import { getRuntimeClient, subscribeTable } from '../services/runtime/core.js';
import { getAccessToken } from './resourceLibrary.js';

export const WORK_HUB_DELIVERY_EVENT = 'bes-work-hub-delivery-updated';
export const WORK_HUB_BUCKET = 'work-hub-submissions';
export const WORK_HUB_DRIVE_PROVIDER = 'google-drive';
export const WORK_HUB_MAX_FILE_BYTES = 10 * 1024 * 1024;

const NOTIFICATION_CACHE_MAX_AGE = 30 * 60 * 1000;
const SIGNED_URL_CACHE_MAX_AGE = 50 * 60 * 1000;
const notificationCache = new Map();
const notificationPromises = new Map();
const signedUrlCache = new Map();

const ALLOWED_EXTENSIONS = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf',
  'jpg', 'jpeg', 'png', 'webp', 'zip', 'rar', '7z', 'mp3', 'wav', 'mp4',
]);

function cleanText(value) {
  return String(value || '').trim();
}

function fileExtension(name) {
  const normalized = cleanText(name).toLowerCase();
  const index = normalized.lastIndexOf('.');
  return index >= 0 ? normalized.slice(index + 1) : '';
}

function safeFileName(name) {
  const ext = fileExtension(name);
  const base = cleanText(name)
    .replace(/\.[^.]+$/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'submission';
  return ext ? `${base}.${ext}` : base;
}

function isDriveFileId(value) {
  const raw = cleanText(value);
  return raw.length >= 10 && !raw.includes('/') && /^[A-Za-z0-9_-]+$/.test(raw);
}

function driveFileId(attachment = {}) {
  return cleanText(attachment.drive_file_id || attachment.fileId || (
    attachment.provider === WORK_HUB_DRIVE_PROVIDER || attachment.bucket === WORK_HUB_DRIVE_PROVIDER
      ? attachment.path
      : ''
  ));
}

function isDriveAttachment(attachment = {}) {
  const fileId = driveFileId(attachment);
  return Boolean(fileId && isDriveFileId(fileId));
}

function signedUrlCacheKey(bucket, path) {
  return `${bucket}:${path}`;
}

function attachmentCacheKey(attachment = {}) {
  if (isDriveAttachment(attachment)) return signedUrlCacheKey(WORK_HUB_DRIVE_PROVIDER, driveFileId(attachment));
  return signedUrlCacheKey(attachment.bucket || WORK_HUB_BUCKET, attachment.path || '');
}

function invalidateSignedUrl(bucket, path) {
  if (!path) return;
  signedUrlCache.delete(signedUrlCacheKey(bucket || WORK_HUB_BUCKET, path));
}

async function authenticatedJson(url, options = {}) {
  const token = await getAccessToken();
  if (!token) throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body && !(options.body instanceof Blob) && !(options.body instanceof File)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(options.headers || {}),
    },
  });
  let data = {};
  try { data = await response.json(); } catch { /* keep fallback */ }
  if (!response.ok) throw new Error(data.error || 'Không thể kết nối kho tệp Google Drive.');
  return data;
}

export function validateWorkHubFile(file) {
  if (!file) return { ok: false, message: 'Vui lòng chọn một tệp để tải lên.' };
  if (Number(file.size || 0) <= 0) return { ok: false, message: 'Tệp đã chọn không có dữ liệu.' };
  if (Number(file.size || 0) > WORK_HUB_MAX_FILE_BYTES) {
    return { ok: false, message: 'Tệp vượt quá giới hạn 10 MB.' };
  }
  const ext = fileExtension(file.name);
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    return { ok: false, message: 'Định dạng tệp chưa được hỗ trợ.' };
  }
  return { ok: true };
}

export async function uploadWorkHubSubmissionFile({ file, itemId, userId }) {
  const validation = validateWorkHubFile(file);
  if (!validation.ok) return validation;
  if (!itemId || !userId) return { ok: false, message: 'Thiếu thông tin công việc hoặc người nộp.' };

  try {
    const token = await getAccessToken();
    if (!token) return { ok: false, message: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.' };
    const response = await fetch('/api/work-hub-file-upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': file.type || 'application/octet-stream',
        'X-File-Name': encodeURIComponent(safeFileName(file.name)),
        'X-Original-File-Name': encodeURIComponent(file.name),
        'X-Work-Hub-Item-Id': String(itemId),
      },
      body: file,
    });
    let data = {};
    try { data = await response.json(); } catch { /* keep fallback */ }
    if (!response.ok || !data.fileId) {
      return { ok: false, message: data.error || 'Không thể tải tệp lên Google Drive.' };
    }

    const attachment = {
      provider: WORK_HUB_DRIVE_PROVIDER,
      bucket: WORK_HUB_DRIVE_PROVIDER,
      path: data.fileId,
      drive_file_id: data.fileId,
      item_id: itemId,
      name: file.name,
      mime: file.type || data.mimeType || 'application/octet-stream',
      size: Number(file.size || data.size || 0),
      uploaded_at: new Date().toISOString(),
      uploaded_by: userId,
    };
    return { ok: true, attachment };
  } catch (error) {
    return { ok: false, message: error?.message || 'Không thể tải tệp lên Google Drive.' };
  }
}

export async function removeWorkHubSubmissionFile(attachment) {
  if (!attachment?.path && !driveFileId(attachment)) return { ok: false };
  if (isDriveAttachment(attachment)) {
    try {
      await authenticatedJson('/api/work-hub-file-action', {
        method: 'POST',
        body: JSON.stringify({
          action: 'archive',
          itemId: attachment.item_id || attachment.itemId || '',
          fileId: driveFileId(attachment),
        }),
      });
      invalidateSignedUrl(WORK_HUB_DRIVE_PROVIDER, driveFileId(attachment));
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error?.message || 'Không thể lưu trữ tệp Google Drive.' };
    }
  }

  const client = getRuntimeClient();
  if (!client) return { ok: false, message: 'Supabase chưa được cấu hình.' };
  const bucket = attachment.bucket || WORK_HUB_BUCKET;
  const { error } = await client.storage.from(bucket).remove([attachment.path]);
  if (!error) invalidateSignedUrl(bucket, attachment.path);
  return error ? { ok: false, message: error.message } : { ok: true };
}

export async function removeWorkHubSubmissionFiles(attachments = []) {
  const driveAttachments = (attachments || []).filter(isDriveAttachment);
  for (const attachment of driveAttachments) {
    const result = await removeWorkHubSubmissionFile(attachment);
    if (!result.ok) return result;
  }

  const legacyAttachments = (attachments || []).filter((attachment) => !isDriveAttachment(attachment));
  if (!legacyAttachments.length) return { ok: true, removed: driveAttachments.length };
  const client = getRuntimeClient();
  if (!client) return { ok: false, message: 'Supabase chưa được cấu hình.' };
  const grouped = new Map();
  for (const attachment of legacyAttachments) {
    if (!attachment?.path) continue;
    const bucket = attachment.bucket || WORK_HUB_BUCKET;
    const paths = grouped.get(bucket) || new Set();
    paths.add(attachment.path);
    grouped.set(bucket, paths);
  }
  for (const [bucket, paths] of grouped.entries()) {
    if (!paths.size) continue;
    const pathList = [...paths];
    const { error } = await client.storage.from(bucket).remove(pathList);
    if (error) return { ok: false, message: error.message || 'Không thể xoá tệp công việc.' };
    pathList.forEach((path) => invalidateSignedUrl(bucket, path));
  }
  return {
    ok: true,
    removed: driveAttachments.length + [...grouped.values()].reduce((sum, paths) => sum + paths.size, 0),
  };
}

export async function createWorkHubAttachmentUrl(attachment, expiresIn = 3600) {
  if (!attachment) return '';
  if (attachment.url) return attachment.url;
  if (!attachment.path && !driveFileId(attachment)) return '';
  const key = attachmentCacheKey(attachment);
  const cached = signedUrlCache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.url;
  if (cached) signedUrlCache.delete(key);

  if (isDriveAttachment(attachment)) {
    try {
      const data = await authenticatedJson('/api/work-hub-file-access', {
        method: 'POST',
        body: JSON.stringify({
          itemId: attachment.item_id || attachment.itemId || '',
          fileId: driveFileId(attachment),
          fileName: attachment.name || '',
          mimeType: attachment.mime || '',
          size: Number(attachment.size || 0),
        }),
      });
      const url = data.signedUrl || '';
      if (url) {
        const signedUntil = Date.parse(data.signedUntil || '');
        const expiresAt = Number.isFinite(signedUntil)
          ? Math.max(Date.now() + 60_000, signedUntil - 60_000)
          : Date.now() + SIGNED_URL_CACHE_MAX_AGE;
        signedUrlCache.set(key, { url, expiresAt });
      }
      return url;
    } catch {
      return '';
    }
  }

  const client = getRuntimeClient();
  if (!client) return '';
  const bucket = attachment.bucket || WORK_HUB_BUCKET;
  const { data, error } = await client.storage.from(bucket).createSignedUrl(attachment.path, expiresIn);
  if (error) return '';
  const url = data?.signedUrl || '';
  if (url) {
    const safeLifetime = Math.min(SIGNED_URL_CACHE_MAX_AGE, Math.max(60_000, Number(expiresIn || 3600) * 800));
    signedUrlCache.set(key, { url, expiresAt: Date.now() + safeLifetime });
  }
  return url;
}

export async function resolveWorkHubCommentAttachments(comments = []) {
  return Promise.all((comments || []).map(async (comment) => {
    const attachments = Array.isArray(comment.attachments) ? comment.attachments : [];
    const resolved = await Promise.all(attachments.map(async (attachment) => ({
      ...attachment,
      signed_url: await createWorkHubAttachmentUrl(attachment),
    })));
    return { ...comment, attachments: resolved };
  }));
}

export async function listWorkHubNotifications(userId, limit = 30, { force = false } = {}) {
  const client = getRuntimeClient();
  if (!client || !userId) return [];
  const key = String(userId);
  const safeLimit = Math.max(1, Math.min(30, Number(limit) || 30));
  const cached = notificationCache.get(key);
  if (!force && cached && cached.limit >= safeLimit && Date.now() - cached.storedAt < NOTIFICATION_CACHE_MAX_AGE) {
    return cached.items.slice(0, safeLimit);
  }
  if (!force && notificationPromises.has(key)) {
    const items = await notificationPromises.get(key);
    return items.slice(0, safeLimit);
  }

  const task = (async () => {
    const { data, error } = await client
      .from('work_hub_notifications')
      .select('id,user_id,item_id,notification_type,title,body,read_at,created_at')
      .eq('user_id', userId)
      .is('read_at', null)
      .order('created_at', { ascending: false })
      .limit(safeLimit);
    if (error) return cached?.items || [];
    const items = data || [];
    notificationCache.set(key, { items, limit: safeLimit, storedAt: Date.now() });
    return items;
  })();
  notificationPromises.set(key, task);
  try { return (await task).slice(0, safeLimit); }
  finally { notificationPromises.delete(key); }
}

function updateNotificationCache(payload) {
  const row = payload?.new && Object.keys(payload.new).length ? payload.new : payload?.old;
  const userId = row?.user_id ? String(row.user_id) : '';
  if (!userId || !notificationCache.has(userId) || !row?.id) return;
  const cached = notificationCache.get(userId);
  const remove = payload?.eventType === 'DELETE' || Boolean(row.read_at);
  const items = remove
    ? cached.items.filter((item) => item.id !== row.id)
    : [row, ...cached.items.filter((item) => item.id !== row.id)]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, cached.limit);
  notificationCache.set(userId, { ...cached, items, storedAt: Date.now() });
}

export async function markWorkHubNotificationRead(notificationId) {
  const client = getRuntimeClient();
  if (!client || notificationId === undefined || notificationId === null) return { ok: false };
  const { error } = await client
    .from('work_hub_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);
  if (error) return { ok: false, message: error.message };
  notificationCache.forEach((cached, userId) => {
    notificationCache.set(userId, { ...cached, items: cached.items.filter((item) => item.id !== notificationId), storedAt: Date.now() });
  });
  return { ok: true };
}

export async function markAllWorkHubNotificationsRead(userId) {
  const client = getRuntimeClient();
  if (!client || !userId) return { ok: false };
  const { error } = await client
    .from('work_hub_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
  if (error) return { ok: false, message: error.message };
  notificationCache.set(String(userId), { items: [], limit: 30, storedAt: Date.now() });
  return { ok: true };
}

export function subscribeWorkHubNotifications(userId, onChange) {
  if (!userId) return () => {};
  return subscribeTable({
    key: `work-hub-notifications-${userId}`,
    table: 'work_hub_notifications',
    filter: `user_id=eq.${userId}`,
    onChange: (payload) => {
      updateNotificationCache(payload);
      onChange?.(payload);
    },
  });
}

export function rememberWorkHubItem(itemId) {
  if (!itemId || typeof window === 'undefined') return;
  try { window.sessionStorage.setItem('bes-work-hub-open-item', String(itemId)); } catch { /* optional */ }
}

export function consumeRememberedWorkHubItem() {
  if (typeof window === 'undefined') return '';
  try {
    const itemId = window.sessionStorage.getItem('bes-work-hub-open-item') || '';
    if (itemId) window.sessionStorage.removeItem('bes-work-hub-open-item');
    return itemId;
  } catch {
    return '';
  }
}

export function formatWorkHubFileSize(bytes) {
  const value = Number(bytes || 0);
  if (!value) return '0 KB';
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(value >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}
