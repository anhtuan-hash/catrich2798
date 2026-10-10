const SUPABASE_FUNCTION_URL =
  'https://xpkbgqdlfonsinriggmj.supabase.co/functions/v1/lesson-check-thumbnail';

function sendJson(res, status, payload) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { ok: false, message: 'Method not allowed.' });
  }

  const authorization = String(req.headers.authorization || '').trim();
  if (!authorization.toLowerCase().startsWith('bearer ')) {
    return sendJson(res, 401, { ok: false, message: 'Authentication required.' });
  }

  const activityId = String(req.body?.activityId || '').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(activityId)) {
    return sendJson(res, 400, { ok: false, message: 'Invalid activity id.' });
  }

  try {
    const upstream = await fetch(SUPABASE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ activityId }),
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });

    const bodyText = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(bodyText);
  } catch (error) {
    return sendJson(res, 502, {
      ok: false,
      fallback: 'live',
      message: error?.message || 'Thumbnail service is unavailable.',
    });
  }
}
