import { ensureFolder, getConnection, moveFile, requireUser, resourceCategoryFolderName, send } from './_googleDrive.js';
import { normaliseResourceCategory } from './_resourceCategoryFolders.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    const user = await requireUser(req);
    const { fileId, category: rawCategory, status } = req.body || {};
    if (!fileId) throw new Error('Missing Drive file ID');

    const category = normaliseResourceCategory(rawCategory);
    const { client, connection, accessToken } = await getConnection();
    const { data: profile } = await client.from('profiles').select('role,approved').eq('id', user.id).maybeSingle();
    const role = String(profile?.role || '').toLowerCase();
    const privileged = ['admin', 'ttcm', 'leader', 'head', 'manager', 'department_leader', 'to_truong'].includes(role) && profile?.approved !== false;
    if (connection.owner_user_id !== user.id && !privileged) throw new Error('Only the Drive owner or Admin can approve resources');

    const folderName = status === 'approved'
      ? resourceCategoryFolderName(category)
      : ['rejected', 'archived'].includes(status) ? '99_LUU_TRU' : '00_CHO_DUYET';

    const folderMap = { ...(connection.folder_map || {}) };
    let targetId = folderMap[folderName];
    if (!targetId) {
      targetId = await ensureFolder(accessToken, folderName, connection.root_folder_id);
      folderMap[folderName] = targetId;
      await client.from('resource_drive_connections').update({ folder_map: folderMap, updated_at: new Date().toISOString() }).eq('id', connection.id);
    }

    const moved = await moveFile(accessToken, fileId, targetId);
    await client.from('resource_items').update({
      category,
      category_id: category,
      status,
      approved_at: status === 'approved' ? new Date().toISOString() : null,
      approved_by: user.email,
      updated_at: new Date().toISOString(),
      drive_web_view_link: moved.webViewLink || null,
      drive_download_link: moved.webContentLink || null,
    }).eq('drive_file_id', fileId);
    await client.from('resource_activity_logs').insert({ actor_id: user.id, action: status === 'approved' ? 'approve' : status, details: { fileId, category, folderName } });
    return send(res, 200, { ...moved, folderName });
  } catch (error) {
    return send(res, 400, { error: error.message });
  }
}
