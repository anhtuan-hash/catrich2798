import { ensureFolder, getConnection, resourceCategoryFolderName, uploadFile } from '../server/api/_googleDrive.js';
import { appendApiAudit, createRequestId, enforceRateLimit, requireApprovedUser, sendJson } from '../server/api/_security.js';

export const config = { api: { bodyParser: false, sizeLimit: '20mb' } };

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const ALLOWED_EXT = /\.(mp3|wav|ogg|m4a|aac|webm)$/i;
const ALLOWED_MIME = new Set([
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg',
  'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/webm', 'application/octet-stream',
]);

function cleanHeader(value, fallback = '') {
  try { return decodeURIComponent(String(value || fallback)).replace(/[\r\n]/g, '').trim(); }
  catch { return String(value || fallback).replace(/[\r\n]/g, '').trim(); }
}

async function readBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_UPLOAD_BYTES) throw new Error('Tệp nhạc vượt quá giới hạn 20 MB.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function hasExpectedSignature(buffer, fileName) {
  const ext = String(fileName || '').split('.').pop().toLowerCase();
  const ascii = (start, end) => buffer.subarray(start, end).toString('ascii');
  if (ext === 'mp3') return ascii(0, 3) === 'ID3' || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0);
  if (ext === 'wav') return ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE';
  if (ext === 'ogg') return ascii(0, 4) === 'OggS';
  if (ext === 'm4a') return ascii(4, 8) === 'ftyp';
  if (ext === 'aac') return buffer[0] === 0xff && (buffer[1] & 0xf6) === 0xf0;
  if (ext === 'webm') return buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3;
  return false;
}

export default async function handler(req, res) {
  let context = null;
  const requestId = createRequestId();
  try {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
    context = await requireApprovedUser(req, { roles: ['admin'] });
    await enforceRateLimit(context, { feature: 'shared_music_upload', perMinute: 4, perDay: 20 });

    const fileName = cleanHeader(req.headers['x-file-name'], 'background-music.mp3').slice(0, 180);
    const title = cleanHeader(req.headers['x-track-title'], fileName.replace(/\.[^.]+$/, '')).slice(0, 180);
    const mimeType = String(req.headers['content-type'] || 'application/octet-stream').split(';')[0].trim().toLowerCase();
    const declaredLength = Number(req.headers['content-length'] || 0);
    if (declaredLength > MAX_UPLOAD_BYTES) throw new Error('Tệp nhạc vượt quá giới hạn 20 MB.');
    if (!ALLOWED_EXT.test(fileName) || !ALLOWED_MIME.has(mimeType)) throw new Error('Định dạng nhạc không được hỗ trợ.');

    const body = await readBody(req);
    if (!body.length) throw new Error('Tệp nhạc đang trống.');
    if (!hasExpectedSignature(body, fileName)) throw new Error('Nội dung tệp không khớp với định dạng âm thanh.');

    const { client, connection, accessToken } = await getConnection();
    const folderName = resourceCategoryFolderName('audio');
    const folderId = connection.folder_map?.[folderName] || await ensureFolder(accessToken, folderName, connection.root_folder_id);
    const uploaded = await uploadFile(accessToken, body, {
      name: fileName,
      parents: [folderId],
      appProperties: {
        besResource: 'true',
        category: 'audio',
        sharedMusic: 'true',
        uploaderId: context.user.id,
      },
      description: title,
    }, mimeType === 'application/octet-stream' ? 'audio/mpeg' : mimeType);

    try {
      await client.from('resource_activity_logs').insert({
        actor_id: context.user.id,
        action: 'shared_music_drive_upload',
        details: { fileId: uploaded.id, fileName, size: body.length },
      });
    } catch { /* optional activity log */ }
    await appendApiAudit(context, {
      endpoint: '/api/shared-music-upload',
      action: 'shared_music_drive_upload',
      status: 'ok',
      requestId,
      details: { fileId: uploaded.id, fileName, size: body.length },
    });
    return sendJson(res, 200, {
      fileId: uploaded.id,
      webViewLink: uploaded.webViewLink || '',
      downloadLink: uploaded.webContentLink || '',
      mimeType: uploaded.mimeType || mimeType,
      size: Number(uploaded.size || body.length),
      requestId,
    });
  } catch (error) {
    if (context) {
      await appendApiAudit(context, {
        endpoint: '/api/shared-music-upload',
        action: 'shared_music_drive_upload',
        status: 'error',
        requestId,
        details: { message: error?.message || String(error) },
      });
    }
    return sendJson(res, Number(error?.status || 400), { error: error?.message || 'Không thể tải nhạc lên Google Drive.', requestId });
  }
}
