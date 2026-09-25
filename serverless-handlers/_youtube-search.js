function cleanText(value, max = 180) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function safeLimit(value) {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed)) return 6;
  return Math.max(1, Math.min(8, parsed));
}

function youtubeApiKey() {
  return String(
    process.env.YOUTUBE_API_KEY
    || process.env.VITE_YOUTUBE_API_KEY
    || ''
  ).trim();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const query = cleanText(req.query?.q, 120);
  if (query.length < 2) {
    return res.status(400).json({
      ok: false,
      code: 'invalid_query',
      error: 'Search query must contain at least 2 characters.',
    });
  }

  const key = youtubeApiKey();
  if (!key) {
    return res.status(503).json({
      ok: false,
      code: 'youtube_search_not_configured',
      error: 'YouTube search is not configured.',
    });
  }

  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    maxResults: String(safeLimit(req.query?.limit)),
    q: query,
    safeSearch: 'moderate',
    key,
  });

  try {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(9000),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const upstreamMessage = cleanText(data?.error?.message || `HTTP ${response.status}`, 220);
      const quotaExceeded = Array.isArray(data?.error?.errors)
        && data.error.errors.some((entry) => String(entry?.reason || '').includes('quota'));

      return res.status(response.status === 403 ? 503 : 502).json({
        ok: false,
        code: quotaExceeded ? 'youtube_quota_exceeded' : 'youtube_search_failed',
        error: upstreamMessage || 'YouTube search failed.',
      });
    }

    const results = (Array.isArray(data?.items) ? data.items : [])
      .map((item) => {
        const videoId = cleanText(item?.id?.videoId, 24);
        if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
        const snippet = item?.snippet || {};
        const thumbnails = snippet?.thumbnails || {};
        const thumbnail = cleanText(
          thumbnails?.medium?.url
          || thumbnails?.high?.url
          || thumbnails?.default?.url,
          500,
        );
        return {
          videoId,
          title: cleanText(snippet?.title, 180),
          channelTitle: cleanText(snippet?.channelTitle, 120),
          publishedAt: cleanText(snippet?.publishedAt, 40),
          thumbnail,
          url: `https://www.youtube.com/watch?v=${videoId}`,
        };
      })
      .filter(Boolean);

    res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate=600');
    return res.status(200).json({
      ok: true,
      query,
      results,
    });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      code: 'youtube_search_unavailable',
      error: error?.name === 'TimeoutError'
        ? 'YouTube search timed out.'
        : cleanText(error?.message || error, 220),
    });
  }
}
