import { getConnection, isManagerUser, requireUser, send } from './_googleDrive.js';
import { signResourcePreviewToken } from './_resourcePreviewToken.js';

function queryParam(req, name) {
  if (req.query?.[name] !== undefined) return Array.isArray(req.query[name]) ? req.query[name][0] : req.query[name];
  try { return new URL(req.url, 'http://localhost').searchParams.get(name); } catch { return ''; }
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
    if (!resourceId && !fileId) throw new Error('Missing resource identifier');

    const { client, connection } = await getConnection();
    const columns = 'id,drive_file_id,status,uploader_id,allow_preview';
    let query = client.from('resource_items').select(columns);
    query = isUuid(resourceId) ? query.eq('id', resourceId) : query.eq('drive_file_id', fileId);
    const { data: resource, error } = await query.maybeSingle();
    if (error || !resource) throw new Error(error?.message || 'Resource not found');
    if (!resource.drive_file_id) throw new Error('Resource has no Drive file');

    const privileged = await isManagerUser(client, user);
    const approved = String(resource.status || '').trim().toLowerCase() === 'approved';
    const allowed = approved || resource.uploader_id === user.id || connection.owner_user_id === user.id || privileged;
    if (!allowed) throw new Error('You do not have access to this resource');
    if (resource.allow_preview === false && !privileged && resource.uploader_id !== user.id) throw new Error('Preview is disabled for this resource');

    const expiresAt = Date.now() + 15 * 60 * 1000;
    const previewToken = signResourcePreviewToken({
      userId: user.id,
      resourceId: resource.id,
      fileId: resource.drive_file_id,
      expiresAt,
    });
    const params = new URLSearchParams({
      resourceId: resource.id,
      fileId: resource.drive_file_id,
      mode: 'inline',
      previewToken,
    });
    return send(res, 200, { url: `/api/google-drive-file?${params}`, expiresAt });
  } catch (error) {
    return send(res, 400, { error: error.message });
  }
}
