import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { getConnection } from '../server/api/_googleDrive.js';
import { verifyResourcePreviewToken } from '../server/api/_resourcePreviewToken.js';

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

function safeFileName(value) {
  return String(value || 'work-hub-file').replace(/[\r\n"\\/]/g, '_').slice(0, 180);
}

function isDriveFileId(value) {
  const raw = String(value || '').trim();
  return raw.length >= 10 && !raw.includes('/') && /^[A-Za-z0-9_-]+$/.test(raw);
}

function etagFor(token) {
  return `"${crypto.createHash('sha256').update(`${token.itemId}:${token.fileId}:${token.size}`).digest('base64url')}"`;
}

export default async function handler(req, res) {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) return sendError(res, 405, 'Method not allowed');
    const token = verifyResourcePreviewToken(String(queryParam(req, 'token') || ''));
    if (token.kind !== 'work-hub-file' || !token.itemId || !isDriveFileId(token.fileId)) {
      return sendError(res, 403, 'Liên kết tệp không hợp lệ.');
    }

    const etag = etagFor(token);
    if (String(req.headers['if-none-match'] || '') === etag && !req.headers.range) {
      res.statusCode = 304;
      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      return res.end();
    }

    const { accessToken } = await getConnection();
    const range = String(req.headers.range || '');
    const driveResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(token.fileId)}?alt=media`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(range ? { Range: range } : {}),
      },
    });
    if (!driveResponse.ok) {
      let message = 'Google Drive không thể trả về tệp.';
      try { message = (await driveResponse.json())?.error?.message || message; } catch { /* ignore */ }
      throw new Error(message);
    }

    const contentType = driveResponse.headers.get('content-type') || token.mimeType || 'application/octet-stream';
    const contentLength = driveResponse.headers.get('content-length') || '';
    const contentRange = driveResponse.headers.get('content-range');
    res.statusCode = driveResponse.status === 206 ? 206 : 200;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(safeFileName(token.fileName))}`);
    res.setHeader('Cache-Control', 'private, max-age=3600, stale-while-revalidate=300');
    res.setHeader('ETag', etag);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Accept-Ranges', driveResponse.headers.get('accept-ranges') || 'bytes');
    res.setHeader('X-Work-Hub-Storage', 'google-drive');
    if (contentLength) res.setHeader('Content-Length', contentLength);
    if (contentRange) res.setHeader('Content-Range', contentRange);
    if (req.method === 'HEAD' || !driveResponse.body) return res.end();
    return Readable.fromWeb(driveResponse.body)
      .on('error', () => { if (!res.headersSent) res.statusCode = 502; res.end(); })
      .pipe(res);
  } catch (error) {
    return sendError(res, Number(error?.status || 400), error?.message || 'Không thể mở tệp công việc.');
  }
}
