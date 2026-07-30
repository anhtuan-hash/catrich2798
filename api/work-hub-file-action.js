import { ensureFolder, getConnection, moveFile } from '../server/api/_googleDrive.js';
import { appendApiAudit, createRequestId, requireApprovedUser, sendJson } from '../server/api/_security.js';

const ARCHIVE_FOLDER = '99_LUU_TRU';

function bodyObject(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(String(req.body || '{}')); } catch { return {}; }
}

function isDriveFileId(value) {
  const raw = String(value || '').trim();
  return raw.length >= 10 && !raw.includes('/') && /^[A-Za-z0-9_-]+$/.test(raw);
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
    const denied = new Error('Bạn không có quyền lưu trữ tệp này.');
    denied.status = 403;
    throw denied;
  }
}

export default async function handler(req, res) {
  let context = null;
  const requestId = createRequestId();
  try {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
    context = await requireApprovedUser(req, { roles: ['admin', 'department_head', 'teacher'] });
    const body = bodyObject(req);
    const action = String(body.action || '').trim().toLowerCase();
    const itemId = uuid(body.itemId);
    const fileId = String(body.fileId || '').trim();
    if (action !== 'archive') throw new Error('Thao tác tệp không hợp lệ.');
    if (!itemId) throw new Error('Mã công việc không hợp lệ.');
    if (!isDriveFileId(fileId)) throw new Error('Mã tệp Google Drive không hợp lệ.');
    await assertWorkItemAccess(context, itemId);

    const { connection, accessToken } = await getConnection();
    const archiveFolderId = connection.folder_map?.[ARCHIVE_FOLDER]
      || await ensureFolder(accessToken, ARCHIVE_FOLDER, connection.root_folder_id);
    await moveFile(accessToken, fileId, archiveFolderId);

    await appendApiAudit(context, {
      endpoint: '/api/work-hub-file-action',
      action: 'work_hub_drive_archive',
      status: 'ok',
      requestId,
      details: { itemId, fileId },
    });
    return sendJson(res, 200, { ok: true, action, fileId, requestId });
  } catch (error) {
    if (context) {
      await appendApiAudit(context, {
        endpoint: '/api/work-hub-file-action',
        action: 'work_hub_drive_archive',
        status: 'error',
        requestId,
        details: { message: error?.message || String(error) },
      });
    }
    return sendJson(res, Number(error?.status || 400), { error: error?.message || 'Không thể lưu trữ tệp.', requestId });
  }
}
