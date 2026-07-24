import { driveFetch, getConnection, isManagerUser, requireUser, send } from './_googleDrive.js';

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function isMissingDriveFile(error) {
  return /file not found|not found|notfound|404/i.test(String(error?.message || ''));
}

async function findResources(client, resourceId, fileId) {
  if (isUuid(resourceId)) {
    const { data, error } = await client.from('resource_items').select('id,drive_file_id,title,category,status').eq('id', resourceId).limit(10);
    if (error) throw new Error(error.message);
    if (data?.length) return data;
  }

  if (fileId) {
    const { data, error } = await client.from('resource_items').select('id,drive_file_id,title,category,status').eq('drive_file_id', fileId).limit(50);
    if (error) throw new Error(error.message);
    if (data?.length) return data;
  }
  return [];
}

export default async function handler(req, res) {
  try {
    if (!['DELETE', 'POST'].includes(req.method)) return send(res, 405, { error: 'Method not allowed' });

    const user = await requireUser(req);
    const resourceId = String(req.body?.resourceId || '');
    const requestedFileId = String(req.body?.fileId || '');
    if (!resourceId && !requestedFileId) throw new Error('Missing resource identifier');

    const { client, connection, accessToken } = await getConnection();
    const privileged = await isManagerUser(client, user);
    if (connection.owner_user_id !== user.id && !privileged) {
      throw new Error('Only TTCM/Admin can delete resources');
    }

    const resources = await findResources(client, resourceId, requestedFileId);
    const primary = resources[0] || null;
    const fileId = String(primary?.drive_file_id || requestedFileId || '');

    let driveAction = 'no_drive_file';
    if (fileId) {
      try {
        await driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,trashed`, accessToken, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trashed: true }),
        });
        driveAction = 'moved_to_trash';
      } catch (error) {
        if (isMissingDriveFile(error)) driveAction = 'already_missing';
        else throw error;
      }
    }

    const ids = resources.map((resource) => resource.id).filter(Boolean);
    if (ids.length) {
      const { error: deleteError } = await client.from('resource_items').delete().in('id', ids);
      if (deleteError) {
        if (driveAction === 'moved_to_trash' && fileId) {
          try {
            await driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,trashed`, accessToken, {
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
    }

    await client.from('resource_activity_logs').insert({
      actor_id: user.id,
      action: 'delete',
      details: {
        resourceIds: ids,
        requestedResourceId: resourceId || null,
        fileId: fileId || null,
        title: primary?.title || req.body?.title || null,
        category: primary?.category || req.body?.category || 'other',
        previousStatus: primary?.status || req.body?.status || null,
        driveAction,
        localOnly: resources.length === 0,
      },
    });

    return send(res, 200, {
      ok: true,
      resourceIds: ids,
      resourceId: primary?.id || null,
      fileId: fileId || null,
      driveAction,
      localOnly: resources.length === 0,
    });
  } catch (error) {
    return send(res, 400, { error: error.message });
  }
}
