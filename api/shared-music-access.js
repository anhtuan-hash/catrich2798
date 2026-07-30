import { signResourcePreviewToken } from '../server/api/_resourcePreviewToken.js';
import { requireApprovedUser, sendJson } from '../server/api/_security.js';

const TABLE = 'shared_music_settings';
const WORKSPACE_KEY = 'english-hub';
const ACCESS_TTL_MS = 12 * 60 * 60 * 1000;

function bodyObject(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(String(req.body || '{}')); } catch { return {}; }
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
    const context = await requireApprovedUser(req, { roles: ['admin', 'department_head', 'teacher'] });
    const body = bodyObject(req);
    const workspaceKey = String(body.workspaceKey || WORKSPACE_KEY).trim();
    if (workspaceKey !== WORKSPACE_KEY) return sendJson(res, 400, { error: 'Không gian nhạc không hợp lệ.' });

    const { data: row, error } = await context.adminClient
      .from(TABLE)
      .select('workspace_key,track_path,track_name,track_mime,track_size,shared,updated_at')
      .eq('workspace_key', workspaceKey)
      .maybeSingle();
    if (error) throw error;
    if (!row?.track_path) return sendJson(res, 404, { error: 'Admin chưa chia sẻ nhạc nền.' });

    const allowPrivate = context.role === 'admin';
    if (!row.shared && !allowPrivate) return sendJson(res, 403, { error: 'Nhạc nền đang tạm ngừng chia sẻ.' });

    const expiresAt = Date.now() + ACCESS_TTL_MS;
    const token = signResourcePreviewToken({
      kind: 'shared-music',
      workspaceKey,
      trackPath: row.track_path,
      updatedAt: row.updated_at || '',
      trackName: row.track_name || '',
      trackMime: row.track_mime || 'audio/mpeg',
      trackSize: Number(row.track_size || 0),
      allowPrivate,
      expiresAt,
    });
    return sendJson(res, 200, {
      signedUrl: `/api/shared-music-file?token=${encodeURIComponent(token)}`,
      signedUntil: new Date(expiresAt).toISOString(),
      fileName: row.track_name || '',
      mimeType: row.track_mime || '',
      size: Number(row.track_size || 0),
    });
  } catch (error) {
    return sendJson(res, Number(error?.status || 400), { error: error?.message || 'Không thể cấp quyền nghe nhạc.' });
  }
}
