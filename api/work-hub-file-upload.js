import { ensureFolder, getConnection } from '../server/api/_googleDrive.js';
import { appendApiAudit, createRequestId, enforceRateLimit, requireApprovedUser, sendJson } from '../server/api/_security.js';

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const TARGET_FOLDER = '04_WORK_HUB_SUBMISSIONS';
const ALLOWED_EXTENSIONS = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'ppt', 'pptx', 'txt', 'rtf',
  'odt', 'ods', 'odp',
  'jpg', 'jpeg', 'png', 'webp', 'gif', 'svg',
  'zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2', 'xz',
  'mp3', 'wav', 'ogg', 'm4a',
  'mp4', 'webm', 'mov',
]);

function bodyObject(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(String(req.body || '{}')); } catch { return {}; }
}

function cleanText(value, fallback = '') {
  return String(value || fallback).replace(/[\r\n]/g, '').trim();
}

function browserOriginForRequest(req) {
  const browserOrigin = cleanText(req.headers.origin);
  if (!browserOrigin) return '';
  try {
    const parsed = new URL(browserOrigin);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.origin : '';
  } catch {
    return '';
  }
}

function extensionOf(value) {
  const match = String(value || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] || '';
}

function uuid(value) {
  const clean = String(value || '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clean) ? clean : '';
}

function arrayContains(values, userId) {
  return Array.isArray(values) && values.map(String).includes(String(userId));
}

async function assertWorkItemAccess(context, itemId) {
  const { data, error } = await context.adminClient
    .from('work_hub_items')
    .select('id,owner_id,created_by,assignee_ids,watcher_ids')
    .eq('id', itemId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const notFound = new Error('Không tìm thấy công việc.');
    notFound.status = 404;
    throw notFound;
  }
  const manager = context.role === 'admin' || context.role === 'department_head';
  const allowed = manager
    || String(data.owner_id || '') === context.user.id
    || String(data.created_by || '') === context.user.id
    || arrayContains(data.assignee_ids, context.user.id)
    || arrayContains(data.watcher_ids, context.user.id);
  if (!allowed) {
    const denied = new Error('Bạn không có quyền tải tệp cho công việc này.');
    denied.status = 403;
    throw denied;
  }
  return data;
}

async function initializeResumableUpload(accessToken, { storedName, originalName, mimeType, fileSize, folderId, itemId, uploaderId, browserOrigin }) {
  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,size,mimeType', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': mimeType,
      'X-Upload-Content-Length': String(fileSize),
      ...(browserOrigin ? { 'Origin': browserOrigin } : {}),
    },
    body: JSON.stringify({
      name: storedName,
      parents: [folderId],
      description: `Work Hub · ${originalName}`,
      appProperties: {
        besResource: 'true',
        category: 'work-hub-submission',
        workHubItemId: itemId,
        uploaderId,
      },
    }),
  });
  if (!response.ok) {
    let message = 'Google Drive không thể khởi tạo phiên tải tệp.';
    try { message = (await response.json())?.error?.message || message; } catch { /* keep fallback */ }
    const error = new Error(message);
    error.status = response.status >= 400 && response.status < 500 ? response.status : 502;
    throw error;
  }
  const uploadUrl = response.headers.get('location') || '';
  if (!uploadUrl) {
    const error = new Error('Google Drive không trả về địa chỉ phiên tải tệp.');
    error.status = 502;
    throw error;
  }
  return uploadUrl;
}

export default async function handler(req, res) {
  let context = null;
  const requestId = createRequestId();
  try {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
    context = await requireApprovedUser(req, { roles: ['admin', 'department_head', 'teacher'] });
    await enforceRateLimit(context, { feature: 'work_hub_file_upload', perMinute: 20, perDay: 200 });

    const body = bodyObject(req);
    const action = cleanText(body.action).toLowerCase();
    if (action !== 'init_resumable') throw new Error('Thao tác tải tệp không hợp lệ.');

    const itemId = uuid(body.itemId);
    if (!itemId) throw new Error('Mã công việc không hợp lệ.');
    await assertWorkItemAccess(context, itemId);

    const storedName = cleanText(body.fileName, 'submission.bin').slice(0, 180);
    const originalName = cleanText(body.originalFileName, storedName).slice(0, 180);
    const ext = extensionOf(storedName || originalName);
    if (!ALLOWED_EXTENSIONS.has(ext)) throw new Error('Định dạng tệp chưa được hỗ trợ.');

    const fileSize = Number(body.fileSize || 0);
    if (!Number.isFinite(fileSize) || fileSize <= 0) throw new Error('Tệp đã chọn không có dữ liệu.');
    if (fileSize > MAX_UPLOAD_BYTES) {
      const error = new Error('Tệp vượt quá giới hạn 50 MB.');
      error.status = 413;
      throw error;
    }
    const mimeType = cleanText(body.fileType, 'application/octet-stream').split(';')[0].trim().toLowerCase() || 'application/octet-stream';
    const browserOrigin = browserOriginForRequest(req);
    if (!browserOrigin) {
      const error = new Error('Không xác định được nguồn trang để tải tệp trực tiếp lên Google Drive.');
      error.status = 400;
      throw error;
    }

    const { connection, accessToken } = await getConnection();
    const folderId = connection.folder_map?.[TARGET_FOLDER]
      || await ensureFolder(accessToken, TARGET_FOLDER, connection.root_folder_id);
    const uploadUrl = await initializeResumableUpload(accessToken, {
      storedName,
      originalName,
      mimeType,
      fileSize,
      folderId,
      itemId,
      uploaderId: context.user.id,
      browserOrigin,
    });

    await appendApiAudit(context, {
      endpoint: '/api/work-hub-file-upload',
      action: 'work_hub_drive_resumable_init',
      status: 'ok',
      requestId,
      details: { itemId, fileName: originalName, size: fileSize, browserOrigin },
    });
    return sendJson(res, 200, {
      ok: true,
      action,
      uploadUrl,
      fileName: originalName,
      mimeType,
      size: fileSize,
      requestId,
    });
  } catch (error) {
    if (context) {
      await appendApiAudit(context, {
        endpoint: '/api/work-hub-file-upload',
        action: 'work_hub_drive_resumable_init',
        status: 'error',
        requestId,
        details: { message: error?.message || String(error) },
      });
    }
    return sendJson(res, Number(error?.status || 400), { error: error?.message || 'Không thể khởi tạo tải tệp lên Google Drive.', requestId });
  }
}
