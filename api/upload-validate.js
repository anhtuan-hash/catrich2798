import { validateUploadMetadata } from './_uploadSecurity.js';

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'Method not allowed.' });
  try {
    const raw = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const result = validateUploadMetadata(raw);
    return send(res, 200, result);
  } catch (error) {
    return send(res, 400, { ok: false, error: error?.message || 'Upload validation failed.' });
  }
}
