import { categoryFolder, getConnection, moveFile, requireUser, send } from './_googleDrive.js';
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    const user = await requireUser(req);
    const { fileId, category, status } = req.body || {};
    const { client, connection, accessToken } = await getConnection();
    const { data: profile } = await client.from('profiles').select('role,approved').eq('id', user.id).maybeSingle();
    if (connection.owner_user_id !== user.id && !(profile?.role === 'admin' && profile?.approved)) throw new Error('Only TTCM Drive owner or Admin can approve resources');
    const folderName = status === 'approved' ? (categoryFolder[category] || '07_TAI_LIEU_CHUYEN_MON') : status === 'rejected' ? '99_LUU_TRU' : '00_CHO_DUYET';
    const targetId = connection.folder_map?.[folderName];
    if (!targetId) throw new Error(`Missing Drive folder: ${folderName}`);
    const moved = await moveFile(accessToken, fileId, targetId);
    await client.from('resource_items').update({ status, approved_at: status === 'approved' ? new Date().toISOString() : null, approved_by: user.email, updated_at: new Date().toISOString(), drive_web_view_link: moved.webViewLink || null, drive_download_link: moved.webContentLink || null }).eq('drive_file_id', fileId);
    await client.from('resource_activity_logs').insert({ actor_id: user.id, action: status === 'approved' ? 'approve' : status, details: { fileId, category } });
    return send(res, 200, moved);
  } catch (error) { return send(res, 400, { error: error.message }); }
}
