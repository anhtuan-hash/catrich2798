import { adminClient, isManagerUser, requireUser, send } from './_googleDrive.js';

function isHtmlLesson(row) {
  const fileName = String(row?.file_name || '').toLowerCase();
  const mimeType = String(row?.mime_type || '').toLowerCase();
  const tags = Array.isArray(row?.tags) ? row.tags.map((tag) => String(tag).toLowerCase()) : [];
  return (mimeType.includes('text/html') || /\.html?$/.test(fileName) || tags.includes('thpt-interactive-html'))
    && !row?.deleted_at;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
    const user = await requireUser(req);
    const client = adminClient();
    const manager = await isManagerUser(client, user);

    let query = client
      .from('resource_items')
      .select('*')
      .eq('category', 'thpt-exam')
      .order('updated_at', { ascending: false });

    if (!manager) query = query.or(`status.eq.approved,uploader_id.eq.${user.id}`);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const items = (data || []).filter(isHtmlLesson);
    return send(res, 200, { ok: true, manager, items });
  } catch (error) {
    return send(res, 400, { error: error.message });
  }
}
