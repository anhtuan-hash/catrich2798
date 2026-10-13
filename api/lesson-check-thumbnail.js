// One Vercel Function serves both thumbnail operations to stay within
// the Hobby 12-function budget. Keep the original public API routes via vercel.json.
const SUPABASE_ORIGIN = 'https://xpkbgqdlfonsinriggmj.supabase.co/functions/v1/';
const ACTIVITY_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sendJson(res, status, payload) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.end(JSON.stringify(payload));
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
  if (!ACTIVITY_UUID.test(activityId)) {
    return sendJson(res, 400, { ok: false, message: 'Invalid activity id.' });
  }

  // /api/lesson-check-thumbnail-upload is rewritten to this endpoint with mode=upload.
  // The underlying Supabase Functions still validate the user's actual activity grants.
  const isUpload = req.query?.mode === 'upload';
  let payload = { activityId };
  if (isUpload) {
    const action = String(req.body?.action || 'upload').trim().toLowerCase();
    const dataUrl = String(req.body?.dataUrl || '');
    if (!['upload', 'remove'].includes(action)) {
      return sendJson(res, 400, { ok: false, message: 'Invalid action.' });
    }
    payload = { activityId, action, dataUrl };
  }

  try {
    const upstream = await fetch(SUPABASE_ORIGIN + (isUpload ? 'lesson-check-thumbnail-upload' : 'lesson-check-thumbnail'), {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: AbortSignal.timeout(isUpload ? 20000 : 15000),
    });

    const bodyText = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(bodyText);
  } catch (error) {
    return sendJson(res, 502, {
      ok: false,
      ...(!isUpload ? { fallback: 'live' } : {}),
      message: error?.message || (isUpload ? 'Thumbnail upload service is unavailable.' : 'Thumbnail service is unavailable.'),
    });
  }
}
