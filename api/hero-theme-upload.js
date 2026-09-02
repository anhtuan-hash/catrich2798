import crypto from 'node:crypto';
import { driveFetch, ensureFolder, getConnection, uploadFile } from '../server/api/_googleDrive.js';
import { requireApprovedUser } from '../server/api/_security.js';
import { auditHeroTheme, createRequestId, sendJson } from '../server/api/_heroTheme.js';

export const config = { api: { bodyParser: false, sizeLimit: '11mb' } };

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;
const MAX_DIMENSION = 12_000;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_EXT = /\.(jpe?g|png|webp)$/i;

function cleanFileName(value, mimeType) {
  const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  const raw = decodeURIComponent(String(value || `hero-${Date.now()}.${extension}`))
    .replace(/[\r\n\\/]/g, '-')
    .replace(/[^a-zA-Z0-9À-ỹ._() -]/g, '_')
    .trim()
    .slice(0, 160);
  return ALLOWED_EXT.test(raw) ? raw : `${raw || `hero-${Date.now()}`}.${extension}`;
}

async function readBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_UPLOAD_BYTES) {
      const error = new Error('Hero image exceeds the 10 MB upload limit.');
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function pngDimensions(buffer) {
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function jpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  const sof = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset += 1; continue; }
    while (buffer[offset] === 0xff) offset += 1;
    const marker = buffer[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (offset + 2 > buffer.length) break;
    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) break;
    if (sof.has(marker) && length >= 7) {
      return { height: buffer.readUInt16BE(offset + 3), width: buffer.readUInt16BE(offset + 5) };
    }
    offset += length;
  }
  return null;
}

function readUInt24LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

function webpDimensions(buffer) {
  if (buffer.length < 30 || buffer.subarray(0, 4).toString('ascii') !== 'RIFF' || buffer.subarray(8, 12).toString('ascii') !== 'WEBP') return null;
  const chunk = buffer.subarray(12, 16).toString('ascii');
  if (chunk === 'VP8X' && buffer.length >= 30) {
    return { width: 1 + readUInt24LE(buffer, 24), height: 1 + readUInt24LE(buffer, 27) };
  }
  if (chunk === 'VP8L' && buffer.length >= 25 && buffer[20] === 0x2f) {
    const b1 = buffer[21], b2 = buffer[22], b3 = buffer[23], b4 = buffer[24];
    return {
      width: 1 + (b1 | ((b2 & 0x3f) << 8)),
      height: 1 + ((b2 >> 6) | (b3 << 2) | ((b4 & 0x0f) << 10)),
    };
  }
  const marker = buffer.indexOf(Buffer.from([0x9d, 0x01, 0x2a]), 16);
  if (marker >= 0 && marker + 7 < buffer.length) {
    return {
      width: buffer.readUInt16LE(marker + 3) & 0x3fff,
      height: buffer.readUInt16LE(marker + 5) & 0x3fff,
    };
  }
  return null;
}

function inspectImage(buffer, mimeType) {
  let dimensions = null;
  if (mimeType === 'image/png') dimensions = pngDimensions(buffer);
  else if (mimeType === 'image/jpeg') dimensions = jpegDimensions(buffer);
  else if (mimeType === 'image/webp') dimensions = webpDimensions(buffer);
  if (!dimensions?.width || !dimensions?.height) throw new Error('The file contents do not match the declared image type or dimensions could not be read.');
  const { width, height } = dimensions;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION || width * height > MAX_PIXELS) {
    throw new Error('Hero image dimensions are too large. Maximum is 12,000 px per side and 40 megapixels.');
  }
  return dimensions;
}

export default async function handler(req, res) {
  const requestId = createRequestId();
  let uploadedDriveId = '';
  let accessToken = '';
  try {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed', requestId });
    const context = await requireApprovedUser(req, { roles: ['admin'] });
    const mimeType = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    if (!ALLOWED_MIME.has(mimeType)) return sendJson(res, 415, { error: 'Only JPG, PNG and WebP Hero images are allowed.', requestId });
    const declaredLength = Number(req.headers['content-length'] || 0);
    if (declaredLength > MAX_UPLOAD_BYTES) return sendJson(res, 413, { error: 'Hero image exceeds the 10 MB upload limit.', requestId });
    const fileName = cleanFileName(req.headers['x-file-name'], mimeType);
    const body = await readBody(req);
    if (!body.length) return sendJson(res, 400, { error: 'The uploaded image is empty.', requestId });
    const { width, height } = inspectImage(body, mimeType);
    const sha256 = crypto.createHash('sha256').update(body).digest('hex');

    const connectionResult = await getConnection();
    accessToken = connectionResult.accessToken;
    const heroRoot = await ensureFolder(accessToken, 'Hero Themes', connectionResult.connection.root_folder_id || null);
    const uploadsFolder = await ensureFolder(accessToken, 'Uploads', heroRoot);
    const uploaded = await uploadFile(accessToken, body, {
      name: fileName,
      parents: [uploadsFolder],
      appProperties: {
        besHeroTheme: 'true',
        uploaderId: context.user.id,
        sha256,
      },
    }, mimeType);
    uploadedDriveId = uploaded.id;

    const client = context.userClient || context.client;
    const { data: media, error } = await client.from('hero_theme_media').insert({
      drive_file_id: uploaded.id,
      file_name: fileName,
      mime_type: mimeType,
      width,
      height,
      size_bytes: body.length,
      sha256,
      created_by: context.user.id,
    }).select('id,file_name,mime_type,width,height,size_bytes,sha256,created_at').single();
    if (error) throw error;

    await auditHeroTheme(context, {
      endpoint: '/api/hero-theme-upload',
      action: 'hero_theme_upload',
      status: 'ok',
      requestId,
      details: { mediaId: media.id, fileName, width, height, size: body.length },
    });
    return sendJson(res, 200, { ok: true, media, requestId });
  } catch (error) {
    if (uploadedDriveId && accessToken) {
      try { await driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(uploadedDriveId)}`, accessToken, { method: 'DELETE' }); } catch { /* best-effort orphan cleanup */ }
    }
    const status = Number(error?.status || (/permission|row-level security|42501/i.test(String(error?.message || '')) ? 403 : 400));
    return sendJson(res, status, { error: error?.message || 'Could not upload Hero image.', requestId });
  }
}
