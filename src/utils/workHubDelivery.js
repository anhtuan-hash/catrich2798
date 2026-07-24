import { getRuntimeClient, subscribeTable } from '../services/runtime/core.js';

export const WORK_HUB_DELIVERY_EVENT = 'bes-work-hub-delivery-updated';
export const WORK_HUB_BUCKET = 'work-hub-submissions';
export const WORK_HUB_MAX_FILE_BYTES = 25 * 1024 * 1024;

const NOTIFICATION_CACHE_MAX_AGE = 5 * 60 * 1000;
const notificationCache = new Map();
const notificationPromises = new Map();

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

function emitDeliveryUpdate(detail = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(WORK_HUB_DELIVERY_EVENT, { detail }));
}

export function validateWorkHubFile(file) {
  if (!file) return { ok: false, message: 'Vui lòng chọn một tệp để tải lên.' };
  if (Number(file.size || 0) <= 0) return { ok: false, message: 'Tệp đã chọn không có dữ liệu.' };
  if (Number(file.size || 0) > WORK_HUB_MAX_FILE_BYTES) {
    return { ok: false, message: 'Tệp vượt quá giới hạn 25 MB.' };
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
  const client = getRuntimeClient();
  if (!client) return { ok: false, message: 'Supabase chưa được cấu hình.' };
  if (!itemId || !userId) return { ok: false, message: 'Thiếu thông tin công việc hoặc người nộp.' };

  const fileName = safeFileName(file.name);
  const path = `${itemId}/${userId}/${Date.now()}-${fileName}`;
  const { error } = await client.storage.from(WORK_HUB_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) return { ok: false, message: error.message || 'Không thể tải tệp lên.' };

  const attachment = {
    bucket: WORK_HUB_BUCKET,
    path,
    name: file.name,
    mime: file.type || 'application/octet-stream',
    size: Number(file.size || 0),
    uploaded_at: new Date().toISOString(),
    uploaded_by: userId,
  };
  emitDeliveryUpdate({ type: 'file-uploaded', itemId, path });
  return { ok: true, attachment };
}


export async function removeWorkHubSubmissionFile(attachment) {
  const client = getRuntimeClient();
  if (!client || !attachment?.path) return { ok: false };
  const bucket = attachment.bucket || WORK_HUB_BUCKET;
  const { error } = await client.storage.from(bucket).remove([attachment.path]);
  return error ? { ok: false, message: error.message } : { ok: true };
}


export async function removeWorkHubSubmissionFiles(attachments = []) {
  const client = getRuntimeClient();
  if (!client) return { ok: false, message: 'Supabase chưa được cấu hình.' };
  const grouped = new Map();
  for (const attachment of attachments || []) {
    if (!attachment?.path) continue;
    const bucket = attachment.bucket || WORK_HUB_BUCKET;
    const paths = grouped.get(bucket) || new Set();
    paths.add(attachment.path);
    grouped.set(bucket, paths);
  }
  for (const [bucket, paths] of grouped.entries()) {
    if (!paths.size) continue;
    const { error } = await client.storage.from(bucket).remove([...paths]);
    if (error) return { ok: false, message: error.message || 'Không thể xoá tệp công việc.' };
  }
  return { ok: true, removed: [...grouped.values()].reduce((sum, paths) => sum + paths.size, 0) };
}

export async function createWorkHubAttachmentUrl(attachment, expiresIn = 3600) {
  if (!attachment) return '';
  if (attachment.url) return attachment.url;
  if (!attachment.path) return '';
  const client = getRuntimeClient();
  if (!client) return '';
  const bucket = attachment.bucket || WORK_HUB_BUCKET;
  const { data, error } = await client.storage.from(bucket).createSignedUrl(attachment.path, expiresIn);
  if (error) return '';
  return data?.signedUrl || '';
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

export async function listWorkHubNotifications(userId, limit = 50, { force = false } = {}) {
  const client = getRuntimeClient();
  if (!client || !userId) return [];
  const key = String(userId);
  const safeLimit = Math.max(1, Number(limit) || 50);
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
  emitDeliveryUpdate({ type: 'notification-read', notificationId });
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
  notificationCache.set(String(userId), { items: [], limit: 50, storedAt: Date.now() });
  emitDeliveryUpdate({ type: 'notifications-read-all', userId });
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
      emitDeliveryUpdate({ type: 'notification-change', payload });
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
