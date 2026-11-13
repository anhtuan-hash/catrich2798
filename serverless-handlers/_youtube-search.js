function cleanText(value, max = 180) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function safeLimit(value) {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed)) return 12;
  return Math.max(1, Math.min(20, parsed));
}

function youtubeApiKey() {
  return String(
    process.env.YOUTUBE_API_KEY
    || process.env.VITE_YOUTUBE_API_KEY
    || ''
  ).trim();
}

function compactVideoResult(videoId, title = '', channelTitle = '', publishedAt = '') {
  const id = cleanText(videoId, 24);
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  return {
    videoId: id,
    title: cleanText(title, 180) || 'YouTube video',
    channelTitle: cleanText(channelTitle, 120),
    publishedAt: cleanText(publishedAt, 60),
    thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
    url: `https://www.youtube.com/watch?v=${id}`,
  };
}

function textFromRuns(value) {
  if (typeof value?.simpleText === 'string') return value.simpleText;
  const runs = Array.isArray(value?.runs) ? value.runs : [];
  return runs.map((run) => run?.text || '').join('');
}

function extractJsonObject(text, marker) {
  const markerIndex = text.indexOf(marker);
  if (markerIndex < 0) return null;
  const start = text.indexOf('{', markerIndex + marker.length);
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, index + 1));
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

function youtubeInitialData(html) {
  const markers = [
    'var ytInitialData = ',
    'window[\"ytInitialData\"] = ',
    'ytInitialData = ',
  ];

  for (const marker of markers) {
    const parsed = extractJsonObject(html, marker);
    if (parsed) return parsed;
  }
  return null;
}

function collectVideoRenderers(root, limit) {
  if (!root || typeof root !== 'object') return [];
  const results = [];
  const seen = new Set();
  const stack = [root];

  while (stack.length && results.length < limit) {
    const current = stack.pop();
    if (!current || typeof current !== 'object') continue;

    const renderer = current.videoRenderer;
    if (renderer && typeof renderer === 'object') {
      const videoId = cleanText(renderer.videoId, 24);
      if (!seen.has(videoId) && /^[A-Za-z0-9_-]{11}$/.test(videoId)) {
        seen.add(videoId);
        const result = compactVideoResult(
          videoId,
          textFromRuns(renderer.title),
          textFromRuns(renderer.ownerText)
            || textFromRuns(renderer.longBylineText)
            || textFromRuns(renderer.shortBylineText),
          textFromRuns(renderer.publishedTimeText),
        );
        if (result) results.push(result);
      }
    }

    const values = Array.isArray(current)
      ? current
      : Object.values(current);
    for (let index = values.length - 1; index >= 0; index -= 1) {
      const value = values[index];
      if (value && typeof value === 'object') stack.push(value);
    }
  }

  return results;
}

async function searchYoutubeHtml(query, limit) {
  const params = new URLSearchParams({
    search_query: query,
    hl: 'en',
    persist_hl: '1',
  });
  const response = await fetch(`https://www.youtube.com/results?${params.toString()}`, {
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'en-US,en;q=0.9',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140 Safari/537.36',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(9000),
  });

  if (!response.ok) {
    throw new Error(`YouTube search page returned HTTP ${response.status}`);
  }

  const html = await response.text();
  const data = youtubeInitialData(html);
  if (!data) throw new Error('YouTube search page did not contain readable initial data.');
  return collectVideoRenderers(data, limit);
}

async function searchYoutubeDataApi(query, limit, key, options = {}) {
  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    maxResults: String(limit),
    q: query,
    safeSearch: 'moderate',
    key,
  });
  if (options.embeddable) params.set('videoEmbeddable', 'true');
  if (options.strict) params.set('safeSearch', 'strict');

  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(9000),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(cleanText(data?.error?.message || `HTTP ${response.status}`, 220) || 'YouTube Data API search failed.');
    error.status = response.status;
    error.quotaExceeded = Array.isArray(data?.error?.errors)
      && data.error.errors.some((entry) => String(entry?.reason || '').includes('quota'));
    throw error;
  }

  return (Array.isArray(data?.items) ? data.items : [])
    .map((item) => {
      const snippet = item?.snippet || {};
      return compactVideoResult(
        item?.id?.videoId,
        snippet?.title,
        snippet?.channelTitle,
        snippet?.publishedAt,
      );
    })
    .filter(Boolean);
}


/** Shared server-only search used by both gallery and standalone YouTube tools. */
export async function searchYoutubeCatalog(query, limit = 12, options = {}) {
  const key = youtubeApiKey();
  if (!key) {
    try {
      return { source: 'youtube-html', results: await searchYoutubeHtml(query, limit) };
    } catch (error) {
      error.code = 'youtube_api_key_not_configured';
      throw error;
    }
  }
  try {
    const results = await searchYoutubeDataApi(query, limit, key, options);
    if (results.length) return { source: 'youtube-data-api', results };
    try {
      const fallback = await searchYoutubeHtml(query, limit);
      if (fallback.length) return { source: 'youtube-html-fallback', results: fallback };
    } catch {
      // An empty API result is valid even if the backup is unreachable.
    }
    return { source: 'youtube-data-api', results };
  } catch (apiError) {
    try {
      return { source: 'youtube-html-fallback', results: await searchYoutubeHtml(query, limit) };
    } catch {
      const reason = apiError?.quotaExceeded
        ? 'youtube_quota_exceeded'
        : apiError?.status === 403
          ? 'youtube_api_forbidden'
          : apiError?.status === 400
            ? 'youtube_api_key_invalid'
            : 'youtube_search_unavailable';
      const error = new Error(
        reason === 'youtube_quota_exceeded' ? 'YouTube API quota was exhausted and backup search is unavailable.'
          : reason === 'youtube_api_forbidden' ? 'YouTube API access is restricted and backup search is unavailable.'
            : reason === 'youtube_api_key_invalid' ? 'YouTube rejected the API credentials and backup search is unavailable.'
              : 'YouTube search is temporarily unavailable.'
      );
      error.code = reason;
      throw error;
    }
  }
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

  const limit = safeLimit(req.query?.limit);

  try {
    const { source, results } = await searchYoutubeCatalog(query, limit);
    res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate=600');
    return res.status(200).json({ ok: true, query, source, results });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      code: error?.code || 'youtube_search_unavailable',
      error: error?.name === 'TimeoutError'
        ? 'YouTube search timed out.'
        : cleanText(error?.message || error, 220),
    });
  }
}
