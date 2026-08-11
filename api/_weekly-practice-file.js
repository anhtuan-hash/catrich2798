import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { adminClient, getConnection } from '../server/api/_googleDrive.js';

const TABLE = 'weekly_practice_items';
const DRIVE_STORAGE = 'google-drive';
const LEGACY_BUCKET = 'weekly-practice';

function queryParam(req, name) {
  if (req.query?.[name] !== undefined) return Array.isArray(req.query[name]) ? req.query[name][0] : req.query[name];
  try { return new URL(req.url, 'http://localhost').searchParams.get(name); } catch { return ''; }
}

function sendError(res, status, message) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify({ error: message }));
}

function isDriveFileId(value) {
  const raw = String(value || '').trim();
  return raw.length >= 10 && !raw.includes('/') && /^[A-Za-z0-9_-]+$/.test(raw);
}

function isOpen(item, now = Date.now()) {
  if (String(item?.status || '').toLowerCase() !== 'published') return false;
  const opensAt = Date.parse(item?.opens_at || '');
  const closesAt = Date.parse(item?.closes_at || '');
  if (Number.isFinite(opensAt) && now < opensAt) return false;
  if (Number.isFinite(closesAt) && now > closesAt) return false;
  return true;
}

function cacheSeconds(item, now = Date.now()) {
  const closesAt = Date.parse(item?.closes_at || '');
  if (!Number.isFinite(closesAt)) return 86400;
  return Math.max(60, Math.min(86400, Math.floor((closesAt - now) / 1000)));
}

function responseHeaders(res, item, contentType, contentLength = '') {
  const fingerprint = `${item.id}:${item.storage_bucket}:${item.storage_path}:${item.updated_at}:${item.file_size}`;
  const etag = `"${crypto.createHash('sha256').update(fingerprint).digest('base64url')}"`;
  const ttl = cacheSeconds(item);
  res.setHeader('Content-Type', contentType || 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(String(item.file_name || 'weekly-practice.html'))}`);
  res.setHeader('Cache-Control', `public, max-age=300, s-maxage=${ttl}`);
  res.setHeader('ETag', etag);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'");
  res.setHeader('X-Weekly-Practice-Storage', String(item.storage_bucket || LEGACY_BUCKET));
  if (contentLength) res.setHeader('Content-Length', contentLength);
  return etag;
}

async function readItem(id) {
  const client = adminClient();
  const { data, error } = await client
    .from(TABLE)
    .select('id,title,status,opens_at,closes_at,storage_bucket,storage_path,file_name,file_size,updated_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function streamDriveFile(req, res, item) {
  const { accessToken } = await getConnection();
  const range = String(req.headers.range || '');
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(item.storage_path)}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(range ? { Range: range } : {}),
    },
  });
  if (!response.ok) {
    let message = 'Google Drive không thể trả về file bài luyện tập.';
    try { message = (await response.json())?.error?.message || message; } catch { /* ignore */ }
    throw new Error(message);
  }

  const contentType = response.headers.get('content-type') || 'text/html; charset=utf-8';
  const contentLength = response.headers.get('content-length') || '';
  const contentRange = response.headers.get('content-range');
  const acceptRanges = response.headers.get('accept-ranges');
  res.statusCode = response.status === 206 ? 206 : 200;
  responseHeaders(res, item, contentType, contentLength);
  if (contentRange) res.setHeader('Content-Range', contentRange);
  res.setHeader('Accept-Ranges', acceptRanges || 'bytes');
  if (req.method === 'HEAD') return res.end();
  if (!response.body) return res.end();
  return Readable.fromWeb(response.body)
    .on('error', () => { if (!res.headersSent) res.statusCode = 502; res.end(); })
    .pipe(res);
}

async function streamLegacyFile(req, res, item) {
  const client = adminClient();
  const { data, error } = await client.storage
    .from(item.storage_bucket || LEGACY_BUCKET)
    .download(item.storage_path);
  if (error || !data) throw new Error(error?.message || 'Không thể tải file HTML cũ từ Supabase Storage.');
  const buffer = Buffer.from(await data.arrayBuffer());
  res.statusCode = 200;
  responseHeaders(res, item, data.type || 'text/html; charset=utf-8', buffer.length);
  if (req.method === 'HEAD') return res.end();
  return res.end(buffer);
}

export default async function handler(req, res) {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) return sendError(res, 405, 'Method not allowed');
    const id = String(queryParam(req, 'id') || '').trim();
    if (!/^[0-9a-f-]{36}$/i.test(id)) return sendError(res, 400, 'Mã bài luyện tập không hợp lệ.');

    const item = await readItem(id);
    if (!item || !isOpen(item)) return sendError(res, 404, 'Bài luyện tập chưa mở hoặc đã hết hạn.');
    if (!item.storage_path) return sendError(res, 404, 'Bài luyện tập chưa có file HTML.');

    const etagFingerprint = `${item.id}:${item.storage_bucket}:${item.storage_path}:${item.updated_at}:${item.file_size}`;
    const etag = `"${crypto.createHash('sha256').update(etagFingerprint).digest('base64url')}"`;
    if (String(req.headers['if-none-match'] || '') === etag) {
      res.statusCode = 304;
      responseHeaders(res, item, 'text/html; charset=utf-8');
      return res.end();
    }

    const driveBacked = String(item.storage_bucket || '').toLowerCase() === DRIVE_STORAGE || isDriveFileId(item.storage_path);
    return driveBacked ? streamDriveFile(req, res, item) : streamLegacyFile(req, res, item);
  } catch (error) {
    return sendError(res, Number(error?.status || 502), error?.message || 'Không thể tải bài luyện tập.');
  }
}
