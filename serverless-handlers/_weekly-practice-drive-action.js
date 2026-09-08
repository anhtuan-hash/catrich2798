import {
  ensureFolder,
  getConnection,
  moveFile,
  resourceCategoryFolderName,
  uploadFile,
} from '../server/api/_googleDrive.js';
import {
  appendApiAudit,
  createRequestId,
  requireApprovedUser,
  sendJson,
} from '../server/api/_security.js';

const TABLE = 'weekly_practice_items';
const DRIVE_STORAGE = 'google-drive';
const LEGACY_BUCKET = 'weekly-practice';
const ITEM_COLUMNS = 'id,title,status,storage_bucket,storage_path,file_name,file_size,updated_at';

function bodyObject(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(String(req.body || '{}')); } catch { return {}; }
}

function isDriveFileId(value) {
  const raw = String(value || '').trim();
  return raw.length >= 10 && !raw.includes('/') && /^[A-Za-z0-9_-]+$/.test(raw);
}

function driveStatus(value) {
  const status = String(value || '').trim().toLowerCase();
  if (status === 'published') return 'published';
  if (status === 'maintenance') return 'maintenance';
  if (status === 'archived') return 'archived';
  return 'draft';
}

async function folderFor(connection, accessToken, status) {
  const normalized = driveStatus(status);
  const name = normalized === 'archived'
    ? '99_LUU_TRU'
    : normalized === 'published' || normalized === 'maintenance'
      ? resourceCategoryFolderName('worksheet')
      : '00_CHO_DUYET';
  return connection.folder_map?.[name] || ensureFolder(accessToken, name, connection.root_folder_id);
}

async function readPractice(client, practiceId) {
  const { data, error } = await client
    .from(TABLE)
    .select(ITEM_COLUMNS)
    .eq('id', practiceId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const notFound = new Error('Không tìm thấy bài luyện tập.');
    notFound.status = 404;
    throw notFound;
  }
  return data;
}

async function moveDrivePractice({ accessToken, connection, item, status }) {
  if (!isDriveFileId(item.storage_path)) return item;
  const folderId = await folderFor(connection, accessToken, status);
  await moveFile(accessToken, item.storage_path, folderId);
  return item;
}

async function migrateLegacyPractice({ client, accessToken, connection, item, status }) {
  if (isDriveFileId(item.storage_path) || String(item.storage_bucket || '').toLowerCase() === DRIVE_STORAGE) {
    return moveDrivePractice({ accessToken, connection, item, status });
  }

  const legacyBucket = item.storage_bucket || LEGACY_BUCKET;
  const legacyPath = item.storage_path;
  if (!legacyPath) throw new Error('Bài luyện tập không có đường dẫn file cũ.');

  const { data, error } = await client.storage.from(legacyBucket).download(legacyPath);
  if (error || !data) throw new Error(error?.message || 'Không thể đọc file cũ từ Supabase Storage.');
  const buffer = Buffer.from(await data.arrayBuffer());
  if (!buffer.length) throw new Error('File HTML cũ đang rỗng.');

  const targetFolderId = await folderFor(connection, accessToken, status);
  const uploaded = await uploadFile(accessToken, buffer, {
    name: String(item.file_name || 'weekly-practice.html').slice(0, 180),
    parents: [targetFolderId],
    appProperties: {
      besResource: 'true',
      category: 'worksheet',
      weeklyPracticeId: item.id,
      migratedFrom: 'supabase-storage',
    },
  }, 'text/html');

  const { data: updated, error: updateError } = await client
    .from(TABLE)
    .update({
      storage_bucket: DRIVE_STORAGE,
      storage_path: uploaded.id,
      file_size: buffer.length,
    })
    .eq('id', item.id)
    .select(ITEM_COLUMNS)
    .single();
  if (updateError) throw updateError;

  await client.storage.from(legacyBucket).remove([legacyPath]).catch(() => null);
  return updated;
}

export default async function handler(req, res) {
  let context = null;
  const requestId = createRequestId();
  try {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
    context = await requireApprovedUser(req, { roles: ['admin', 'department_head'] });
    // Moving or archiving Drive files is a storage operation, not an AI request.

    const payload = bodyObject(req);
    const action = String(payload.action || 'move').trim().toLowerCase();
    const practiceId = String(payload.practiceId || '').trim();
    if (!/^[0-9a-f-]{36}$/i.test(practiceId)) throw new Error('Mã bài luyện tập không hợp lệ.');

    const { client, connection, accessToken } = await getConnection();
    let item = await readPractice(client, practiceId);
    const status = action === 'archive' ? 'archived' : driveStatus(payload.status || item.status);

    if (action === 'migrate') {
      item = await migrateLegacyPractice({ client, accessToken, connection, item, status });
    } else if (action === 'move' || action === 'archive') {
      if (!isDriveFileId(item.storage_path) && action === 'move') {
        item = await migrateLegacyPractice({ client, accessToken, connection, item, status });
      } else if (!isDriveFileId(item.storage_path) && action === 'archive') {
        if (item.storage_path) {
          await client.storage.from(item.storage_bucket || LEGACY_BUCKET).remove([item.storage_path]);
        }
      } else {
        await moveDrivePractice({ accessToken, connection, item, status });
      }
    } else {
      throw new Error('Thao tác Google Drive không hợp lệ.');
    }

    await appendApiAudit(context, {
      endpoint: '/api/weekly-practice-drive-action',
      action: `weekly_practice_${action}`,
      status: 'ok',
      requestId,
      details: { practiceId, storage: item.storage_bucket, status },
    });
    return sendJson(res, 200, { ok: true, item, action, requestId });
  } catch (error) {
    if (context) {
      await appendApiAudit(context, {
        endpoint: '/api/weekly-practice-drive-action',
        action: 'weekly_practice_drive_error',
        status: 'error',
        requestId,
        details: { message: error?.message || String(error) },
      });
    }
    return sendJson(res, Number(error?.status || 400), { error: error?.message || 'Không thể cập nhật Google Drive.', requestId });
  }
}
