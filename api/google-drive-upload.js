import { ensureFolder, getConnection, resourceCategoryFolderName, send, uploadFile } from './_googleDrive.js';
import { appendApiAudit, createRequestId, enforceRateLimit, requireApprovedUser } from './_security.js';
import { normaliseResourceCategory } from './_resourceCategoryFolders.js';

export const config = { api: { bodyParser: false, sizeLimit: '20mb' } };

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'text/html',
  'application/zip',
  'image/png',
  'image/jpeg',
  'image/webp',
  'audio/mpeg',
  'audio/wav',
  'video/mp4',
]);
const ALLOWED_EXT = /\.(pdf|docx|xlsx|pptx|txt|csv|html?|zip|png|jpe?g|webp|mp3|wav|mp4)$/i;

function hasExpectedSignature(buffer, mimeType, fileName) {
  const ext = String(fileName || '').split('.').pop().toLowerCase();
  const starts = (...bytes) => bytes.every((value, index) => buffer[index] === value);
  if (['txt', 'csv', 'html', 'htm'].includes(ext)) {
    if (!buffer.length || buffer.includes(0)) return false;
    const text = buffer.toString('utf8').trim();
    return Boolean(text) && (ext === 'html' || ext === 'htm' ? /<(?:!doctype\s+html|html|head|body|script|style|main|section|div)\b/i.test(text) : true);
  }
  if (ext === 'pdf') return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  if (['docx', 'xlsx', 'pptx', 'zip'].includes(ext)) return starts(0x50, 0x4b);
  if (ext === 'png') return starts(0x89, 0x50, 0x4e, 0x47);
  if (['jpg', 'jpeg'].includes(ext)) return starts(0xff, 0xd8, 0xff);
  if (ext === 'webp') return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  if (ext === 'wav') return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WAVE';
  if (ext === 'mp3') return buffer.subarray(0, 3).toString('ascii') === 'ID3' || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0);
  if (ext === 'mp4') return buffer.subarray(4, 8).toString('ascii') === 'ftyp';
  return ALLOWED_MIME.has(mimeType);
}

async function readBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_UPLOAD_BYTES) throw new Error('File exceeds the 20 MB upload limit.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    const requestId = createRequestId();
    const context = await requireApprovedUser(req, { roles: ['admin', 'department_head', 'teacher'] });
    await enforceRateLimit(context, { feature: 'drive_upload', perMinute: 6, perDay: 60 });
    const user = context.user;
    const encoded = String(req.headers['x-resource-metadata'] || '');
    const meta = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
    const category = normaliseResourceCategory(meta.category);
    const fileName = decodeURIComponent(String(req.headers['x-file-name'] || meta.fileName || 'resource.bin')).replace(/[\r\n]/g, '').slice(0, 180);
    const mimeType = String(req.headers['content-type'] || 'application/octet-stream').split(';')[0].trim().toLowerCase();
    const declaredLength = Number(req.headers['content-length'] || 0);
    if (declaredLength > MAX_UPLOAD_BYTES) throw new Error('File exceeds the 20 MB upload limit.');
    if (!ALLOWED_EXT.test(fileName) || !ALLOWED_MIME.has(mimeType)) throw new Error('This file type is not allowed.');
    const { client, connection, accessToken } = await getConnection();
    const folderMap = connection.folder_map || {};
    const pendingRoot = folderMap['00_CHO_DUYET'] || await ensureFolder(accessToken, '00_CHO_DUYET', connection.root_folder_id);
    const teacherFolder = await ensureFolder(accessToken, String(user.email || user.id).replace(/[^a-zA-Z0-9@._-]/g, '_'), pendingRoot);
    const dateFolder = await ensureFolder(accessToken, new Date().toISOString().slice(0, 10), teacherFolder);
    const body = await readBody(req);
    if (!body.length) throw new Error('The uploaded file is empty.');
    if (!hasExpectedSignature(body, mimeType, fileName)) throw new Error('The file contents do not match the declared type.');
    const uploaded = await uploadFile(accessToken, body, {
      name: fileName,
      parents: [dateFolder],
      appProperties: {
        besResource: 'true',
        interactiveHtml: /\.html?$/i.test(fileName) ? 'true' : 'false',
        category,
        uploaderId: user.id,
        targetFolder: resourceCategoryFolderName(category),
      },
    }, mimeType);
    await client.from('resource_activity_logs').insert({ actor_id: user.id, action: 'drive_upload', details: { fileId: uploaded.id, fileName, category } });
    await appendApiAudit(context, { endpoint: '/api/google-drive-upload', action: 'drive_upload', status: 'ok', requestId, details: { fileName, category, size: body.length } });
    return send(res, 200, { fileId: uploaded.id, webViewLink: uploaded.webViewLink, downloadLink: uploaded.webContentLink, requestId });
  } catch (error) {
    return send(res, 400, { error: error.message });
  }
}
