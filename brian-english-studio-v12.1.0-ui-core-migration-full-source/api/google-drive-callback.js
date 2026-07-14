import { adminClient, callbackUrl, ensureStructure, exchangeCode, refreshAccessToken, verifyState } from './_googleDrive.js';
export default async function handler(req, res) {
  try {
    const state = verifyState(req.query?.state);
    const tokens = await exchangeCode(req.query?.code, callbackUrl(req));
    if (!tokens.refresh_token) throw new Error('Google did not return a refresh token. Revoke the app and connect again.');
    const accessToken = tokens.access_token || await refreshAccessToken(tokens.refresh_token);
    const structure = await ensureStructure(accessToken);
    const client = adminClient();
    await client.from('resource_drive_connections').update({ is_active: false }).eq('is_active', true);
    const { error } = await client.from('resource_drive_connections').insert({ owner_user_id: state.userId, owner_email: state.email, refresh_token: tokens.refresh_token, root_folder_id: structure.rootId, folder_map: structure.folders, scope: tokens.scope || 'drive.file', is_active: true });
    if (error) throw error;
    res.statusCode = 302; res.setHeader('Location', state.returnTo || '/#/resource-library?drive=connected'); res.end();
  } catch (error) { res.statusCode = 302; res.setHeader('Location', `/#/resource-library?drive=error&message=${encodeURIComponent(error.message)}`); res.end(); }
}
