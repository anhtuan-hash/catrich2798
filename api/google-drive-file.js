import { Readable } from 'node:stream';
import { getConnection, isManagerUser, requireUser, send } from './_googleDrive.js';
import { verifyResourcePreviewToken } from './_resourcePreviewToken.js';

function queryParam(req, name) {
  if (req.query?.[name] !== undefined) return Array.isArray(req.query[name]) ? req.query[name][0] : req.query[name];
  try { return new URL(req.url, 'http://localhost').searchParams.get(name); } catch { return ''; }
}

function safeFileName(value) {
  return String(value || 'resource').replace(/[\r\n"\\/]/g, '_').slice(0, 180);
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
    const resourceId = String(queryParam(req, 'resourceId') || '');
    const fileId = String(queryParam(req, 'fileId') || '');
    const mode = queryParam(req, 'mode') === 'download' ? 'download' : 'inline';
    const previewToken = String(queryParam(req, 'previewToken') || '');
    if (!resourceId && !fileId) throw new Error('Missing resource identifier');

    let user;
    let signedPreview = null;
    if (previewToken) {
      signedPreview = verifyResourcePreviewToken(previewToken);
      user = { id: signedPreview.userId };
    } else {
      user = await requireUser(req);
    }

    const { client, connection, accessToken } = await getConnection();
    let resourceQuery = client.from('resource_items').select('*');
    resourceQuery = isUuid(resourceId) ? resourceQuery.eq('id', resourceId) : resourceQuery.eq('drive_file_id', fileId);
    const { data: resource, error } = await resourceQuery.maybeSingle();
    if (error || !resource) throw new Error(error?.message || 'Resource not found');
    if (!resource.drive_file_id) throw new Error('Resource has no Drive file');

    if (signedPreview) {
      if (signedPreview.resourceId !== resource.id || signedPreview.fileId !== resource.drive_file_id) throw new Error('Preview link does not match this resource');
      if (mode !== 'inline') throw new Error('Signed preview links cannot download files');
    }

    const privileged = await isManagerUser(client, user);
    const approved = String(resource.status || '').trim().toLowerCase() === 'approved';
    const allowed = approved || resource.uploader_id === user.id || connection.owner_user_id === user.id || privileged;
    if (!allowed) throw new Error('You do not have access to this resource');
    if (mode === 'download' && resource.allow_download === false && !privileged && resource.uploader_id !== user.id) throw new Error('Download is disabled for this resource');
    if (mode === 'inline' && resource.allow_preview === false && !privileged && resource.uploader_id !== user.id) throw new Error('Preview is disabled for this resource');

    const range = String(req.headers.range || '');
    const driveResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(resource.drive_file_id)}?alt=media`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(range ? { Range: range } : {}),
      },
    });
    if (!driveResponse.ok) {
      let message = 'Google Drive could not return the file';
      try { message = (await driveResponse.json())?.error?.message || message; } catch { /* ignore */ }
      throw new Error(message);
    }

    const fileName = safeFileName(resource.file_name || resource.title);
    const contentType = resource.mime_type || driveResponse.headers.get('content-type') || 'application/octet-stream';
    res.statusCode = driveResponse.status === 206 ? 206 : 200;
    res.setHeader('Content-Type', contentType);
    const contentLength = driveResponse.headers.get('content-length');
    const contentRange = driveResponse.headers.get('content-range');
    const acceptRanges = driveResponse.headers.get('accept-ranges');
    if (contentLength) res.setHeader('Content-Length', contentLength);
    if (contentRange) res.setHeader('Content-Range', contentRange);
    res.setHeader('Accept-Ranges', acceptRanges || 'bytes');
    res.setHeader('Content-Disposition', `${mode}; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.setHeader('Cache-Control', signedPreview ? 'private, max-age=60' : 'private, no-store, max-age=0');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const counterField = mode === 'download' ? 'downloads' : 'views';
    if (!range || /^bytes=0-/i.test(range)) {
      const nextCount = Number(resource[counterField] || 0) + 1;
      client.from('resource_items').update({ [counterField]: nextCount }).eq('id', resource.id).then(() => {});
    }

    if (!driveResponse.body) return res.end();
    Readable.fromWeb(driveResponse.body).on('error', () => { if (!res.headersSent) res.statusCode = 502; res.end(); }).pipe(res);
  } catch (error) {
    return send(res, 400, { error: error.message });
  }
}
