import { driveFetch, getConnection, requireUser, send } from './_googleDrive.js';

const MANAGER_ROLES = new Set(['admin', 'ttcm', 'leader', 'head', 'manager', 'department_leader', 'to_truong']);

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

export default async function handler(req, res) {
  try {
    if (!['DELETE', 'POST'].includes(req.method)) return send(res, 405, { error: 'Method not allowed' });

    const user = await requireUser(req);
    const resourceId = String(req.body?.resourceId || '');
    const fileId = String(req.body?.fileId || '');
    if (!resourceId && !fileId) throw new Error('Missing resource identifier');

    const { client, connection, accessToken } = await getConnection();
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('role,approved')
      .eq('id', user.id)
      .maybeSingle();
    if (profileError) throw new Error(profileError.message);

    const role = String(profile?.role || '').toLowerCase();
    const privileged = MANAGER_ROLES.has(role) && profile?.approved !== false;
    if (connection.owner_user_id !== user.id && !privileged) {
      throw new Error('Only TTCM/Admin can delete approved resources');
    }

    let resourceQuery = client.from('resource_items').select('*');
    resourceQuery = isUuid(resourceId)
      ? resourceQuery.eq('id', resourceId)
      : resourceQuery.eq('drive_file_id', fileId);
    const { data: resource, error: resourceError } = await resourceQuery.maybeSingle();
    if (resourceError || !resource) throw new Error(resourceError?.message || 'Resource not found');
    if (resource.status !== 'approved') throw new Error('Only approved resources can be deleted from this action');

    let trashed = false;
    if (resource.drive_file_id) {
      await driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(resource.drive_file_id)}?fields=id,trashed`, accessToken, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trashed: true }),
      });
      trashed = true;
    }

    const { error: deleteError } = await client.from('resource_items').delete().eq('id', resource.id);
    if (deleteError) {
      if (trashed && resource.drive_file_id) {
        try {
          await driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(resource.drive_file_id)}?fields=id,trashed`, accessToken, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trashed: false }),
          });
        } catch {
          // Best-effort rollback only.
        }
      }
      throw new Error(deleteError.message);
    }

    await client.from('resource_activity_logs').insert({
      actor_id: user.id,
      action: 'delete',
      details: {
        resourceId: resource.id,
        fileId: resource.drive_file_id || null,
        title: resource.title,
        category: resource.category || resource.category_id || 'other',
        driveAction: trashed ? 'moved_to_trash' : 'no_drive_file',
      },
    });

    return send(res, 200, {
      ok: true,
      resourceId: resource.id,
      fileId: resource.drive_file_id || null,
      driveAction: trashed ? 'moved_to_trash' : 'no_drive_file',
    });
  } catch (error) {
    return send(res, 400, { error: error.message });
  }
}
