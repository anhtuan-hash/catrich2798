import { Readable } from 'node:stream';
import { getConnection, requireUser, send } from './_googleDrive.js';

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
    const user = await requireUser(req);
    const resourceId = String(queryParam(req, 'resourceId') || '');
    const fileId = String(queryParam(req, 'fileId') || '');
    const mode = queryParam(req, 'mode') === 'download' ? 'download' : 'inline';
    if (!resourceId && !fileId) throw new Error('Missing resource identifier');

    const { client, connection, accessToken } = await getConnection();
    let resourceQuery = client.from('resource_items').select('*');
    resourceQuery = isUuid(resourceId) ? resourceQuery.eq('id', resourceId) : resourceQuery.eq('drive_file_id', fileId);
    const { data: resource, error } = await resourceQuery.maybeSingle();
    if (error || !resource) throw new Error(error?.message || 'Resource not found');
    if (!resource.drive_file_id) throw new Error('Resource has no Drive file');

    const { data: profile } = await client.from('profiles').select('role,approved').eq('id', user.id).maybeSingle();
    const role = String(profile?.role || '').toLowerCase();
    const privileged = ['admin', 'ttcm', 'leader', 'head', 'manager', 'department_leader', 'to_truong'].includes(role) && profile?.approved !== false;
    const allowed = resource.status === 'approved' || resource.uploader_id === user.id || connection.owner_user_id === user.id || privileged;
    if (!allowed) throw new Error('You do not have access to this resource');
    if (mode === 'download' && resource.allow_download === false && !privileged && resource.uploader_id !== user.id) throw new Error('Download is disabled for this resource');

    const driveResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(resource.drive_file_id)}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!driveResponse.ok) {
      let message = 'Google Drive could not return the file';
      try { message = (await driveResponse.json())?.error?.message || message; } catch { /* ignore */ }
      throw new Error(message);
    }

    const fileName = safeFileName(resource.file_name || resource.title);
    const contentType = resource.mime_type || driveResponse.headers.get('content-type') || 'application/octet-stream';
    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    const contentLength = driveResponse.headers.get('content-length');
    if (contentLength) res.setHeader('Content-Length', contentLength);
    res.setHeader('Content-Disposition', `${mode}; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const counterField = mode === 'download' ? 'downloads' : 'views';
    const nextCount = Number(resource[counterField] || 0) + 1;
    client.from('resource_items').update({ [counterField]: nextCount }).eq('id', resource.id).then(() => {});

    if (!driveResponse.body) return res.end();
    Readable.fromWeb(driveResponse.body).on('error', () => { if (!res.headersSent) res.statusCode = 502; res.end(); }).pipe(res);
  } catch (error) {
    return send(res, 400, { error: error.message });
  }
}
