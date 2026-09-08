import { getConnection } from '../server/api/_googleDrive.js';
import { requireApprovedUser } from '../server/api/_security.js';
import { getActiveReferencedMedia, sendJson } from '../server/api/_heroTheme.js';

const MEDIA_CACHE = 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000, immutable';

async function getAdminPreviewMedia(req, mediaId) {
  const context = await requireApprovedUser(req, { roles: ['admin'] });
  const client = context.userClient || context.client;
  const { data, error } = await client
    .from('hero_theme_media')
    .select('id,drive_file_id,file_name,mime_type,width,height,size_bytes,sha256')
    .eq('id', mediaId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' });
  const preview = String(req.query?.preview || '') === '1';
  try {
    const mediaId = String(req.query?.id || '').trim();
    // Normal/public requests can only resolve media referenced by the active
    // published revision. Admin preview is separately authenticated for drafts.
    const media = preview ? await getAdminPreviewMedia(req, mediaId) : await getActiveReferencedMedia(mediaId);
    if (!media) return sendJson(res, 404, { error: preview ? 'Hero preview media not found.' : 'Published Hero media not found.' });

    const { accessToken } = await getConnection();
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(media.drive_file_id)}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return sendJson(res, response.status === 404 ? 404 : 502, { error: 'Hero media is temporarily unavailable.' });

    const declared = Number(response.headers.get('content-length') || media.size_bytes || 0);
    if (declared > 11 * 1024 * 1024) return sendJson(res, 502, { error: 'Published Hero media exceeds its validated size.' });
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 11 * 1024 * 1024) return sendJson(res, 502, { error: 'Published Hero media exceeds its validated size.' });

    res.statusCode = 200;
    res.setHeader('Content-Type', media.mime_type);
    res.setHeader('Content-Length', String(bytes.length));
    res.setHeader('Cache-Control', preview ? 'private, no-store' : MEDIA_CACHE);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader('ETag', `"${media.sha256}"`);
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.end(bytes);
  } catch (error) {
    const status = preview && Number(error?.status) ? Number(error.status) : 404;
    console.warn('[HeroTheme] media proxy unavailable:', error?.message || error);
    return sendJson(res, status, { error: preview ? 'Hero preview media not found.' : 'Published Hero media not found.' }, {
      'Cache-Control': preview ? 'private, no-store' : 'public, max-age=10, s-maxage=10',
      'X-Content-Type-Options': 'nosniff',
    });
  }
}
