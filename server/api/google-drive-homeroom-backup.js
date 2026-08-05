import crypto from 'node:crypto';
import { driveFetch, ensureFolder, getConnection, uploadFile } from './_googleDrive.js';
import { appendApiAudit, createRequestId, requireApprovedUser, sendJson } from './_security.js';

const MAX_BODY_BYTES = 10 * 1024 * 1024;
const BACKUP_ROOT_NAME = '95_GVCN_BACKUP_MA_HOA';
const MAX_DAILY_SNAPSHOTS = 30;
const BACKUP_FORMAT = 'BRIAN_GVCN_BACKUP_ENCRYPTED';
const BACKUP_VERSION = 1;

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function safeFolderName(value, fallback = 'khong-xac-dinh') {
  const text = safeText(value, fallback)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\\/:*?"<>|\r\n]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, 120) || fallback;
}

function escapeDriveQuery(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function readJsonBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) {
      const error = new Error('Dữ liệu sao lưu vượt quá giới hạn 10 MB.');
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const error = new Error('Nội dung sao lưu không phải JSON hợp lệ.');
    error.status = 400;
    throw error;
  }
}

function encryptionSecret() {
  return safeText(
    process.env.HOMEROOM_BACKUP_ENCRYPTION_KEY
      || process.env.GOOGLE_OAUTH_STATE_SECRET
      || process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

function encryptBackup(payload) {
  const secret = encryptionSecret();
  if (!secret) {
    const error = new Error('Máy chủ chưa cấu hình khóa mã hóa sao lưu GVCN.');
    error.status = 503;
    throw error;
  }

  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const key = crypto.createHash('sha256').update(`brian-gvcn-drive-backup:v1:${secret}`).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  const checksum = crypto.createHash('sha256').update(plaintext).digest('hex');
  const keyId = crypto.createHash('sha256').update(secret).digest('hex').slice(0, 12);

  const encrypted = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    algorithm: 'AES-256-GCM',
    keyId,
    createdAt: new Date().toISOString(),
    checksum,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };

  return {
    buffer: Buffer.from(JSON.stringify(encrypted, null, 2), 'utf8'),
    checksum,
  };
}

async function findFile(accessToken, folderId, name) {
  const query = encodeURIComponent(
    `name='${escapeDriveQuery(name)}' and '${escapeDriveQuery(folderId)}' in parents and trashed=false`,
  );
  const result = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink,createdTime,modifiedTime,appProperties)&spaces=drive&pageSize=10`,
    accessToken,
  );
  return result.files?.[0] || null;
}

async function updateMultipartFile(accessToken, fileId, buffer, metadata, mimeType) {
  const boundary = `bes_gvcn_${crypto.randomBytes(12).toString('hex')}`;
  const head = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
  );
  const tail = Buffer.from(`\r\n--${boundary}--`);
  const response = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=multipart&fields=id,name,webViewLink,modifiedTime,appProperties`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: Buffer.concat([head, buffer, tail]),
    },
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || 'Không thể cập nhật bản sao lưu trên Google Drive.');
  return data;
}

async function upsertBackupFile(accessToken, folderId, name, buffer, appProperties) {
  const existing = await findFile(accessToken, folderId, name);
  if (existing?.appProperties?.contentHash === appProperties.contentHash) {
    return { ...existing, unchanged: true };
  }

  const metadata = {
    name,
    parents: existing ? undefined : [folderId],
    description: 'Bản sao lưu dữ liệu GVCN do Brian tạo tự động. Nội dung được mã hóa AES-256-GCM.',
    appProperties,
  };

  if (existing?.id) {
    delete metadata.parents;
    return updateMultipartFile(accessToken, existing.id, buffer, metadata, 'application/octet-stream');
  }

  return uploadFile(accessToken, buffer, metadata, 'application/octet-stream');
}

async function trimDailySnapshots(accessToken, folderId) {
  const query = encodeURIComponent(
    `'${escapeDriveQuery(folderId)}' in parents and trashed=false and appProperties has { key='besHomeroomBackup' and value='true' } and appProperties has { key='backupKind' and value='daily' }`,
  );
  const result = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,createdTime)&orderBy=createdTime desc&spaces=drive&pageSize=100`,
    accessToken,
  );
  const stale = (result.files || []).slice(MAX_DAILY_SNAPSHOTS);
  await Promise.all(stale.map((file) => driveFetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?fields=id,trashed`,
    accessToken,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }) },
  )));
  return stale.length;
}

async function validateWorkspaceOwnership(context, workspace) {
  const workspaceId = safeText(workspace?.id);
  if (!workspaceId) {
    const error = new Error('Thiếu mã không gian lớp.');
    error.status = 400;
    throw error;
  }
  const { data, error } = await context.adminClient
    .from('bes_homeroom_workspaces')
    .select('workspace_id,class_name,school_year,updated_at')
    .eq('owner_id', context.user.id)
    .eq('workspace_id', workspaceId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    const ownershipError = new Error('Không tìm thấy lớp thuộc tài khoản hiện tại trên Supabase.');
    ownershipError.status = 404;
    throw ownershipError;
  }
  return data;
}

export default async function handler(req, res) {
  const requestId = createRequestId();
  let context;
  try {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
    context = await requireApprovedUser(req, { roles: ['admin', 'department_head', 'teacher'] });
    const body = await readJsonBody(req);
    const workspace = body?.workspace;
    if (!workspace || typeof workspace !== 'object' || Array.isArray(workspace)) {
      const error = new Error('Thiếu dữ liệu lớp cần sao lưu.');
      error.status = 400;
      throw error;
    }

    const cloudRow = await validateWorkspaceOwnership(context, workspace);
    const clientHash = safeText(body.clientHash);
    const exportedAt = new Date().toISOString();
    const envelope = {
      app: 'BRIAN_GVCN',
      schemaVersion: Number(body.schemaVersion || 1),
      exportedAt,
      reason: safeText(body.reason, 'automatic'),
      owner: { id: context.user.id, email: safeText(context.user.email) },
      class: {
        workspaceId: workspace.id,
        className: safeText(workspace.classProfile?.className, cloudRow.class_name || 'Lớp chủ nhiệm'),
        schoolYear: safeText(workspace.classProfile?.schoolYear, cloudRow.school_year),
        semester: safeText(workspace.semester),
      },
      source: {
        supabaseUpdatedAt: cloudRow.updated_at || '',
        workspaceUpdatedAt: safeText(workspace.updatedAt),
        clientHash,
      },
      workspace,
    };

    const { buffer, checksum } = encryptBackup(envelope);
    const contentHash = clientHash || checksum;
    const { accessToken, connection } = await getConnection();
    const rootId = connection.root_folder_id || await ensureFolder(accessToken, 'BRIAN ENGLISH – KHO HỌC LIỆU TỔ TIẾNG ANH');
    const backupRootId = await ensureFolder(accessToken, BACKUP_ROOT_NAME, rootId);
    const teacherLabel = safeFolderName(context.user.email || context.user.id, `teacher-${context.user.id.slice(0, 8)}`);
    const teacherFolderId = await ensureFolder(accessToken, teacherLabel, backupRootId);
    const schoolYear = safeFolderName(envelope.class.schoolYear, 'khong-ro-nam-hoc');
    const yearFolderId = await ensureFolder(accessToken, schoolYear, teacherFolderId);
    const classLabel = safeFolderName(envelope.class.className, workspace.id);
    const classFolderId = await ensureFolder(accessToken, classLabel, yearFolderId);
    const date = exportedAt.slice(0, 10);
    const commonProperties = {
      besHomeroomBackup: 'true',
      ownerId: context.user.id,
      workspaceId: safeText(workspace.id),
      contentHash,
      encrypted: 'true',
      schemaVersion: String(envelope.schemaVersion),
    };

    const currentFile = await upsertBackupFile(
      accessToken,
      classFolderId,
      'current-backup.json.enc',
      buffer,
      { ...commonProperties, backupKind: 'current', backupDate: date },
    );
    const dailyFile = await upsertBackupFile(
      accessToken,
      classFolderId,
      `backup-${date}.json.enc`,
      buffer,
      { ...commonProperties, backupKind: 'daily', backupDate: date },
    );
    const removedSnapshots = await trimDailySnapshots(accessToken, classFolderId);

    await appendApiAudit(context, {
      endpoint: '/api/google-drive-homeroom-backup',
      action: 'homeroom_drive_backup',
      status: 'ok',
      requestId,
      details: {
        workspaceId: workspace.id,
        className: envelope.class.className,
        bytes: buffer.length,
        contentHash,
        currentFileId: currentFile.id,
        dailyFileId: dailyFile.id,
        removedSnapshots,
      },
    });

    return sendJson(res, 200, {
      ok: true,
      encrypted: true,
      backedUpAt: exportedAt,
      contentHash,
      folderId: classFolderId,
      currentFile: { id: currentFile.id, webViewLink: currentFile.webViewLink || '', unchanged: Boolean(currentFile.unchanged) },
      dailyFile: { id: dailyFile.id, webViewLink: dailyFile.webViewLink || '', unchanged: Boolean(dailyFile.unchanged) },
      removedSnapshots,
      requestId,
    });
  } catch (error) {
    if (context) {
      await appendApiAudit(context, {
        endpoint: '/api/google-drive-homeroom-backup',
        action: 'homeroom_drive_backup',
        status: 'error',
        requestId,
        details: { message: error?.message || 'Unknown error' },
      });
    }
    return sendJson(res, Number(error?.status || 400), { error: error?.message || 'Không thể sao lưu dữ liệu GVCN lên Google Drive.', requestId });
  }
}
