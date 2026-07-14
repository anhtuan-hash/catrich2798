import { callbackUrl, env, requireUser, send, signState } from './_googleDrive.js';
export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
    const user = await requireUser(req);
    if (!env.clientId || !env.clientSecret) throw new Error('Google Drive OAuth is not configured');
    const redirectUri = callbackUrl(req);
    const state = signState({ userId: user.id, email: user.email, returnTo: `${env.appUrl || ''}/#/resource-library?drive=connected`, ts: Date.now() });
    const params = new URLSearchParams({ client_id: env.clientId, redirect_uri: redirectUri, response_type: 'code', access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', scope: 'https://www.googleapis.com/auth/drive.file', state });
    return send(res, 200, { url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
  } catch (error) { return send(res, 400, { error: error.message }); }
}
