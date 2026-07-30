import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { adminClient, getConnection } from '../server/api/_googleDrive.js';
import { verifyResourcePreviewToken } from '../server/api/_resourcePreviewToken.js';

const LEGACY_BUCKET = 'shared-music';
const WORKSPACE_KEY = 'english-hub';

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

function safeFileName(value) {
  return String(value || 'background-music').replace(/[\r\n"\\/]/g, '_').slice(0, 180);
}

function rowFromToken(token) {
  return {
    workspace_key: token.workspaceKey,
    track_path: String(token.trackPath || ''),
    track_name: String(token.trackName || 'background-music'),
    track_mime: String(token.trackMime || 'audio/mpeg'),
    track_size: Number(token.trackSize || 0),
    updated_at: String(token.updatedAt || ''),
  };
}

function etagFor(row) {
  const source = `${row.workspace_key}:${row.track_path}:${row.updated_at}:${row.track_size}`;
  return `"${crypto.createHash('sha256').update(source).digest('base64url')}"`;
}

function setCommonHeaders(res, row, contentType, contentLength = '') {
  res.setHeader('Content-Type', contentType || row.track_mime || 'audio/mpeg');
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(safeFileName(row.track_name))}`);
  res.setHeader('Cache-Control', 'private, max-age=3600, stale-while-revalidate=300');
  res.setHeader('ETag', etagFor(row));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('X-Shared-Music-Storage', isDriveFileId(row.track_path) ? 'google-drive' : 'supabase-legacy');
  if (contentLength) res.setHeader('Content-Length', String(contentLength));
}

async function streamDrive(req, res, row) {
  const { accessToken } = await getConnection();
  const range = String(req.headers.range || '');
  const driveResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(row.track_path)}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(range ? { Range: range } : {}),
    },
  });
  if (!driveResponse.ok) {
    let message = 'Google Drive không thể trả về file nhạc.';
    try { message = (await driveResponse.json())?.error?.message || message; } catch { /* ignore */ }
    throw new Error(message);
  }

  const contentType = driveResponse.headers.get('content-type') || row.track_mime || 'audio/mpeg';
  const contentLength = driveResponse.headers.get('content-length') || '';
  const contentRange = driveResponse.headers.get('content-range');
  const acceptRanges = driveResponse.headers.get('accept-ranges');
  res.statusCode = driveResponse.status === 206 ? 206 : 200;
  setCommonHeaders(res, row, contentType, contentLength);
  if (contentRange) res.setHeader('Content-Range', contentRange);
  res.setHeader('Accept-Ranges', acceptRanges || 'bytes');
  if (req.method === 'HEAD') return res.end();
  if (!driveResponse.body) return res.end();
  return Readable.fromWeb(driveResponse.body)
    .on('error', () => { if (!res.headersSent) res.statusCode = 502; res.end(); })
    .pipe(res);
}

function parseRange(range, size) {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(String(range || '').trim());
  if (!match) return null;
  let start = match[1] ? Number(match[1]) : 0;
  let end = match[2] ? Number(match[2]) : size - 1;
  if (!match[1] && match[2]) {
    const suffix = Number(match[2]);
    start = Math.max(0, size - suffix);
    end = size - 1;
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= size) return null;
  return { start, end: Math.min(end, size - 1) };
}

async function streamLegacy(req, res, row) {
  const client = adminClient();
  const { data, error } = await client.storage.from(LEGACY_BUCKET).download(row.track_path);
  if (error || !data) throw new Error(error?.message || 'Không thể đọc file nhạc cũ từ Supabase Storage.');
  const buffer = Buffer.from(await data.arrayBuffer());
  const range = parseRange(req.headers.range, buffer.length);
  if (range) {
    const chunk = buffer.subarray(range.start, range.end + 1);
    res.statusCode = 206;
    setCommonHeaders(res, row, row.track_mime || data.type || 'audio/mpeg', chunk.length);
    res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${buffer.length}`);
    if (req.method === 'HEAD') return res.end();
    return res.end(chunk);
  }
  res.statusCode = 200;
  setCommonHeaders(res, row, row.track_mime || data.type || 'audio/mpeg', buffer.length);
  if (req.method === 'HEAD') return res.end();
  return res.end(buffer);
}

export default async function handler(req, res) {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) return sendError(res, 405, 'Method not allowed');
    const token = verifyResourcePreviewToken(String(queryParam(req, 'token') || ''));
    if (token.kind !== 'shared-music' || token.workspaceKey !== WORKSPACE_KEY || !token.trackPath) {
      return sendError(res, 403, 'Liên kết nhạc không hợp lệ.');
    }
    const row = rowFromToken(token);
    const currentEtag = etagFor(row);
    if (String(req.headers['if-none-match'] || '') === currentEtag && !req.headers.range) {
      res.statusCode = 304;
      res.setHeader('ETag', currentEtag);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      return res.end();
    }
    return isDriveFileId(row.track_path)
      ? streamDrive(req, res, row)
      : streamLegacy(req, res, row);
  } catch (error) {
    return sendError(res, Number(error?.status || 400), error?.message || 'Không thể phát nhạc nền.');
  }
}
