import { signResourcePreviewToken } from '../server/api/_resourcePreviewToken.js';
import { requireApprovedUser, sendJson } from '../server/api/_security.js';

const ACCESS_TTL_MS = 60 * 60 * 1000;

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
    const denied = new Error('Bạn không có quyền mở tệp của công việc này.');
    denied.status = 403;
    throw denied;
  }
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
    const context = await requireApprovedUser(req, { roles: ['admin', 'department_head', 'teacher'] });
    const body = bodyObject(req);
    const itemId = uuid(body.itemId);
    const fileId = String(body.fileId || '').trim();
    if (!itemId) return sendJson(res, 400, { error: 'Mã công việc không hợp lệ.' });
    if (!isDriveFileId(fileId)) return sendJson(res, 400, { error: 'Mã tệp Google Drive không hợp lệ.' });
    await assertWorkItemAccess(context, itemId);

    const expiresAt = Date.now() + ACCESS_TTL_MS;
    const token = signResourcePreviewToken({
      kind: 'work-hub-file',
      itemId,
      fileId,
      fileName: String(body.fileName || 'work-hub-file').slice(0, 180),
      mimeType: String(body.mimeType || 'application/octet-stream').slice(0, 120),
      size: Math.max(0, Number(body.size || 0)),
      expiresAt,
    });
    return sendJson(res, 200, {
      signedUrl: `/api/work-hub-file?token=${encodeURIComponent(token)}`,
      signedUntil: new Date(expiresAt).toISOString(),
    });
  } catch (error) {
    return sendJson(res, Number(error?.status || 400), { error: error?.message || 'Không thể cấp quyền mở tệp.' });
  }
}
