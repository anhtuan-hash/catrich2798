import { driveFetch, getConnection } from '../server/api/_googleDrive.js';
import { requireApprovedUser, sendJson } from '../server/api/_security.js';

function bodyObject(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(String(req.body || '{}')); } catch { return {}; }
}

function uuid(value) {
  const clean = String(value || '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clean) ? clean : '';
}

function isDriveFileId(value) {
  const raw = String(value || '').trim();
  return raw.length >= 10 && !raw.includes('/') && /^[A-Za-z0-9_-]+$/.test(raw);
}

function attachmentContainsFile(attachments, fileId) {
  return Array.isArray(attachments) && attachments.some((entry) => {
    const candidate = String(entry?.drive_file_id || entry?.fileId || entry?.path || '').trim();
    return candidate === String(fileId);
  });
}

async function assertEditable(context, itemId, fileId) {
  const { data, error } = await context.adminClient
    .from('work_hub_items')
    .select('id,owner_id,created_by,attachments')
    .eq('id', itemId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const missing = new Error('Không tìm thấy nội dung TTCM.');
    missing.status = 404;
    throw missing;
  }
  const manager = context.role === 'admin' || context.role === 'department_head';
  const owner = String(data.owner_id || '') === context.user.id || String(data.created_by || '') === context.user.id;
  if (!manager && !owner) {
    const denied = new Error('Bạn không có quyền chỉnh sửa tệp này.');
    denied.status = 403;
    throw denied;
  }
  if (!attachmentContainsFile(data.attachments, fileId)) {
    const denied = new Error('Chỉ có thể sửa trực tiếp tệp gốc do TTCM gửi.');
    denied.status = 403;
    throw denied;
  }
  return data;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
    const context = await requireApprovedUser(req, { roles: ['admin', 'department_head', 'teacher'] });
    const body = bodyObject(req);
    const itemId = uuid(body.itemId);
    const fileId = String(body.fileId || '').trim();
    if (!itemId) return sendJson(res, 400, { error: 'Mã nội dung TTCM không hợp lệ.' });
    if (!isDriveFileId(fileId)) return sendJson(res, 400, { error: 'Mã tệp Google Drive không hợp lệ.' });
    await assertEditable(context, itemId, fileId);

    const { accessToken } = await getConnection();
    const metadata = await driveFetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,webViewLink,capabilities(canEdit,canShare)`,
      accessToken,
    );

    const email = String(context.profile?.email || context.user?.email || '').trim();
    let permissionGranted = Boolean(metadata.capabilities?.canEdit);
    let warning = '';

    if (email && metadata.capabilities?.canShare) {
      try {
        const permissions = await driveFetch(
          `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions?fields=permissions(id,type,role,emailAddress)&pageSize=100`,
          accessToken,
        );
        const existing = (permissions.permissions || []).find((entry) => String(entry.emailAddress || '').toLowerCase() === email.toLowerCase());
        if (!existing || !['writer', 'owner'].includes(existing.role)) {
          await driveFetch(
            `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions?sendNotificationEmail=false&fields=id,role,emailAddress`,
            accessToken,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'user', role: 'writer', emailAddress: email }),
            },
          );
        }
        permissionGranted = true;
      } catch (permissionError) {
        warning = permissionError?.message || 'Không thể tự động cấp quyền chỉnh sửa Google Drive.';
      }
    }

    const editUrl = metadata.webViewLink || `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/edit`;
    return sendJson(res, 200, {
      ok: true,
      editUrl,
      webViewLink: metadata.webViewLink || '',
      fileName: metadata.name || body.fileName || '',
      mimeType: metadata.mimeType || '',
      permissionGranted,
      warning,
    });
  } catch (error) {
    return sendJson(res, Number(error?.status || 400), { error: error?.message || 'Không thể mở chế độ chỉnh sửa tệp.' });
  }
}
