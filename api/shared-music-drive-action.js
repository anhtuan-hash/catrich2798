import { ensureFolder, getConnection, moveFile, resourceCategoryFolderName, uploadFile } from '../server/api/_googleDrive.js';
import { appendApiAudit, createRequestId, enforceRateLimit, requireApprovedUser, sendJson } from '../server/api/_security.js';

const TABLE = 'shared_music_settings';
const LEGACY_BUCKET = 'shared-music';
const WORKSPACE_KEY = 'english-hub';
const COLUMNS = 'workspace_key,track_path,track_title,track_name,track_mime,track_size,shared,updated_by,updated_by_email,created_at,updated_at';

function bodyObject(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(String(req.body || '{}')); } catch { return {}; }
}

function isDriveFileId(value) {
  const raw = String(value || '').trim();
  return raw.length >= 10 && !raw.includes('/') && /^[A-Za-z0-9_-]+$/.test(raw);
}

async function folderFor(connection, accessToken, archive = false) {
  const name = archive ? '99_LUU_TRU' : resourceCategoryFolderName('audio');
  return connection.folder_map?.[name] || ensureFolder(accessToken, name, connection.root_folder_id);
}

async function readRow(client) {
  const { data, error } = await client.from(TABLE).select(COLUMNS).eq('workspace_key', WORKSPACE_KEY).maybeSingle();
  if (error) throw error;
  return data || null;
}

async function migrateLegacy({ client, connection, accessToken, row }) {
  if (!row?.track_path) throw new Error('Không tìm thấy file nhạc cũ.');
  if (isDriveFileId(row.track_path)) return row;

  const legacyPath = row.track_path;
  const { data, error } = await client.storage.from(LEGACY_BUCKET).download(legacyPath);
  if (error || !data) throw new Error(error?.message || 'Không thể đọc file nhạc cũ từ Supabase Storage.');
  const buffer = Buffer.from(await data.arrayBuffer());
  if (!buffer.length) throw new Error('File nhạc cũ đang trống.');

  const folderId = await folderFor(connection, accessToken, false);
  const uploaded = await uploadFile(accessToken, buffer, {
    name: String(row.track_name || 'background-music.mp3').slice(0, 180),
    parents: [folderId],
    appProperties: {
      besResource: 'true',
      category: 'audio',
      sharedMusic: 'true',
      migratedFrom: 'supabase-storage',
    },
    description: row.track_title || 'Background music',
  }, row.track_mime || data.type || 'audio/mpeg');

  const { data: updated, error: updateError } = await client
    .from(TABLE)
    .update({ track_path: uploaded.id, track_size: buffer.length, updated_at: new Date().toISOString() })
    .eq('workspace_key', WORKSPACE_KEY)
    .select(COLUMNS)
    .single();
  if (updateError) throw updateError;

  await client.storage.from(LEGACY_BUCKET).remove([legacyPath]).catch(() => null);
  return updated;
}

export default async function handler(req, res) {
  let context = null;
  const requestId = createRequestId();
  try {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
    context = await requireApprovedUser(req, { roles: ['admin'] });
    await enforceRateLimit(context, { feature: 'shared_music_drive_action', perMinute: 20, perDay: 200 });

    const payload = bodyObject(req);
    const action = String(payload.action || 'migrate').trim().toLowerCase();
    const workspaceKey = String(payload.workspaceKey || WORKSPACE_KEY).trim();
    if (workspaceKey !== WORKSPACE_KEY) throw new Error('Không gian nhạc không hợp lệ.');

    const { client, connection, accessToken } = await getConnection();
    let row = await readRow(client);

    if (action === 'migrate') {
      row = await migrateLegacy({ client, connection, accessToken, row });
    } else if (action === 'archive') {
      const fileId = String(payload.fileId || row?.track_path || '').trim();
      if (isDriveFileId(fileId)) {
        const folderId = await folderFor(connection, accessToken, true);
        await moveFile(accessToken, fileId, folderId);
      } else if (fileId) {
        await client.storage.from(LEGACY_BUCKET).remove([fileId]);
      }
    } else if (action === 'place') {
      const fileId = String(payload.fileId || row?.track_path || '').trim();
      if (!isDriveFileId(fileId)) throw new Error('Mã file Google Drive không hợp lệ.');
      const folderId = await folderFor(connection, accessToken, false);
      await moveFile(accessToken, fileId, folderId);
    } else {
      throw new Error('Thao tác Google Drive không hợp lệ.');
    }

    await appendApiAudit(context, {
      endpoint: '/api/shared-music-drive-action',
      action: `shared_music_${action}`,
      status: 'ok',
      requestId,
      details: { workspaceKey, fileId: payload.fileId || row?.track_path || '' },
    });
    return sendJson(res, 200, { ok: true, action, item: row, requestId });
  } catch (error) {
    if (context) {
      await appendApiAudit(context, {
        endpoint: '/api/shared-music-drive-action',
        action: 'shared_music_drive_error',
        status: 'error',
        requestId,
        details: { message: error?.message || String(error) },
      });
    }
    return sendJson(res, Number(error?.status || 400), { error: error?.message || 'Không thể cập nhật file nhạc trên Google Drive.', requestId });
  }
}
