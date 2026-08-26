import { Readable } from 'node:stream';
import { getConnection } from '../server/api/_googleDrive.js';
import { requireApprovedUser } from '../server/api/_security.js';

function queryParam(req, name) {
  if (req.query?.[name] !== undefined) return Array.isArray(req.query[name]) ? req.query[name][0] : req.query[name];
  try { return new URL(req.url, 'http://localhost').searchParams.get(name); } catch { return ''; }
}

function uuid(value) {
  const clean = String(value || '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clean) ? clean : '';
}

function isDriveFileId(value) {
  const raw = String(value || '').trim();
  return raw.length >= 10 && !raw.includes('/') && /^[A-Za-z0-9_-]+$/.test(raw);
}

function arrayContains(values, userId) {
  return Array.isArray(values) && values.map(String).includes(String(userId));
}

function attachmentContainsFile(attachments, fileId) {
  return Array.isArray(attachments) && attachments.some((entry) => {
    const candidate = String(entry?.drive_file_id || entry?.fileId || entry?.path || '').trim();
    return candidate === String(fileId);
  });
}

function safeFileName(value) {
  return String(value || 'work-hub-file').replace(/[\r\n"\\/]/g, '_').slice(0, 180);
}

function sendError(res, status, message) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify({ error: message }));
}

async function assertAccessAndFile(context, itemId, fileId) {
  const { data, error } = await context.adminClient
    .from('work_hub_items')
    .select('id,owner_id,created_by,assignee_ids,watcher_ids,attachments')
    .eq('id', itemId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const notFound = new Error('Không tìm thấy nội dung TTCM.');
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
    const denied = new Error('Bạn không có quyền mở tệp này.');
    denied.status = 403;
    throw denied;
  }

  if (attachmentContainsFile(data.attachments, fileId)) return data;

  const { data: comments, error: commentError } = await context.adminClient
    .from('work_hub_comments')
    .select('attachments')
    .eq('item_id', itemId)
    .limit(200);
  if (commentError) throw commentError;
  if ((comments || []).some((row) => attachmentContainsFile(row.attachments, fileId))) return data;

  const missing = new Error('Tệp không thuộc nội dung TTCM này.');
  missing.status = 404;
  throw missing;
}

export default async function handler(req, res) {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) return sendError(res, 405, 'Method not allowed');
    const context = await requireApprovedUser(req, { roles: ['admin', 'department_head', 'teacher'] });
    const itemId = uuid(queryParam(req, 'itemId'));
    const fileId = String(queryParam(req, 'fileId') || '').trim();
    const disposition = String(queryParam(req, 'disposition') || 'inline').toLowerCase() === 'attachment' ? 'attachment' : 'inline';
    const requestedName = safeFileName(queryParam(req, 'fileName') || 'work-hub-file');

    if (!itemId) return sendError(res, 400, 'Mã nội dung TTCM không hợp lệ.');
    if (!isDriveFileId(fileId)) return sendError(res, 400, 'Mã tệp Google Drive không hợp lệ.');
    await assertAccessAndFile(context, itemId, fileId);

    const { accessToken } = await getConnection();
    const range = String(req.headers.range || '');
    const driveResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(range ? { Range: range } : {}),
      },
    });
    if (!driveResponse.ok) {
      let message = 'Google Drive không thể trả về tệp.';
      try { message = (await driveResponse.json())?.error?.message || message; } catch { /* ignore */ }
      const error = new Error(message);
      error.status = driveResponse.status || 502;
      throw error;
    }

    const contentType = driveResponse.headers.get('content-type') || String(queryParam(req, 'mimeType') || '') || 'application/octet-stream';
    const contentLength = driveResponse.headers.get('content-length') || '';
    const contentRange = driveResponse.headers.get('content-range');
    res.statusCode = driveResponse.status === 206 ? 206 : 200;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `${disposition}; filename*=UTF-8''${encodeURIComponent(requestedName)}`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Accept-Ranges', driveResponse.headers.get('accept-ranges') || 'bytes');
    res.setHeader('X-Work-Hub-Storage', 'google-drive-authenticated');
    if (contentLength) res.setHeader('Content-Length', contentLength);
    if (contentRange) res.setHeader('Content-Range', contentRange);
    if (req.method === 'HEAD' || !driveResponse.body) return res.end();
    return Readable.fromWeb(driveResponse.body)
      .on('error', () => { if (!res.headersSent) res.statusCode = 502; res.end(); })
      .pipe(res);
  } catch (error) {
    return sendError(res, Number(error?.status || 400), error?.message || 'Không thể mở tệp TTCM.');
  }
}
