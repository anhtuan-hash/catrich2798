import { getConnection } from '../server/api/_googleDrive.js';
import { getActiveReferencedMedia, sendJson } from '../server/api/_heroTheme.js';

const MEDIA_CACHE = 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000, immutable';

export default async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' });
  try {
    const mediaId = String(req.query?.id || '').trim();
    const media = await getActiveReferencedMedia(mediaId);
    if (!media) return sendJson(res, 404, { error: 'Published Hero media not found.' });

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
    res.setHeader('Cache-Control', MEDIA_CACHE);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader('ETag', `"${media.sha256}"`);
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.end(bytes);
  } catch (error) {
    console.warn('[HeroTheme] media proxy unavailable:', error?.message || error);
    return sendJson(res, 404, { error: 'Published Hero media not found.' }, {
      'Cache-Control': 'public, max-age=10, s-maxage=10',
      'X-Content-Type-Options': 'nosniff',
    });
  }
}
