import { ensureFolder, getConnection, uploadFile } from '../server/api/_googleDrive.js';
import { appendApiAudit, createRequestId, enforceRateLimit, requireApprovedUser, sendJson } from '../server/api/_security.js';

export const config = { api: { bodyParser: false, sizeLimit: '11mb' } };

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const TARGET_FOLDER = '04_WORK_HUB_SUBMISSIONS';
const ALLOWED_EXTENSIONS = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf',
  'jpg', 'jpeg', 'png', 'webp', 'zip', 'rar', '7z', 'mp3', 'wav', 'mp4',
]);

function cleanHeader(value, fallback = '') {
  try { return decodeURIComponent(String(value || fallback)).replace(/[\r\n]/g, '').trim(); }
  catch { return String(value || fallback).replace(/[\r\n]/g, '').trim(); }
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

async function readBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_UPLOAD_BYTES) {
      const error = new Error('Tệp vượt quá giới hạn 10 MB.');
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  let context = null;
  const requestId = createRequestId();
  try {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
    context = await requireApprovedUser(req, { roles: ['admin', 'department_head', 'teacher'] });
    await enforceRateLimit(context, { feature: 'work_hub_file_upload', perMinute: 10, perDay: 100 });

    const itemId = uuid(req.headers['x-work-hub-item-id']);
    if (!itemId) throw new Error('Mã công việc không hợp lệ.');
    await assertWorkItemAccess(context, itemId);

    const storedName = cleanHeader(req.headers['x-file-name'], 'submission.bin').slice(0, 180);
    const originalName = cleanHeader(req.headers['x-original-file-name'], storedName).slice(0, 180);
    const ext = extensionOf(storedName || originalName);
    if (!ALLOWED_EXTENSIONS.has(ext)) throw new Error('Định dạng tệp chưa được hỗ trợ.');
    const mimeType = String(req.headers['content-type'] || 'application/octet-stream').split(';')[0].trim().toLowerCase();
    const declaredLength = Number(req.headers['content-length'] || 0);
    if (declaredLength > MAX_UPLOAD_BYTES) {
      const error = new Error('Tệp vượt quá giới hạn 10 MB.');
      error.status = 413;
      throw error;
    }

    const body = await readBody(req);
    if (!body.length) throw new Error('Tệp đã chọn không có dữ liệu.');

    const { connection, accessToken } = await getConnection();
    const folderId = connection.folder_map?.[TARGET_FOLDER]
      || await ensureFolder(accessToken, TARGET_FOLDER, connection.root_folder_id);
    const uploaded = await uploadFile(accessToken, body, {
      name: storedName,
      parents: [folderId],
      description: `Work Hub · ${originalName}`,
      appProperties: {
        besResource: 'true',
        category: 'work-hub-submission',
        workHubItemId: itemId,
        uploaderId: context.user.id,
      },
    }, mimeType || 'application/octet-stream');

    await appendApiAudit(context, {
      endpoint: '/api/work-hub-file-upload',
      action: 'work_hub_drive_upload',
      status: 'ok',
      requestId,
      details: { itemId, fileId: uploaded.id, fileName: originalName, size: body.length },
    });
    return sendJson(res, 200, {
      ok: true,
      fileId: uploaded.id,
      fileName: originalName,
      mimeType: uploaded.mimeType || mimeType,
      size: Number(uploaded.size || body.length),
      requestId,
    });
  } catch (error) {
    if (context) {
      await appendApiAudit(context, {
        endpoint: '/api/work-hub-file-upload',
        action: 'work_hub_drive_upload',
        status: 'error',
        requestId,
        details: { message: error?.message || String(error) },
      });
    }
    return sendJson(res, Number(error?.status || 400), { error: error?.message || 'Không thể tải tệp lên Google Drive.', requestId });
  }
}
