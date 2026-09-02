import { emptyPublicManifest, loadPublicManifest, sendJson } from '../server/api/_heroTheme.js';

const CACHE = 'public, max-age=30, s-maxage=60, stale-while-revalidate=300';

export default async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' });
  try {
    const { manifest, databaseReady } = await loadPublicManifest();
    return sendJson(res, 200, manifest, {
      'Cache-Control': CACHE,
      'X-Hero-Theme-Database-Ready': databaseReady ? '1' : '0',
    });
  } catch (error) {
    // Public Hero theming is deliberately fail-open. A database outage must never
    // prevent the original page Hero from rendering.
    console.warn('[HeroTheme] public manifest unavailable:', error?.message || error);
    return sendJson(res, 200, emptyPublicManifest(), {
      'Cache-Control': 'public, max-age=10, s-maxage=10, stale-while-revalidate=60',
      'X-Hero-Theme-Database-Ready': '0',
    });
  }
}
