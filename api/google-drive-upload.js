import { categoryFolder, ensureFolder, getConnection, requireUser, send, uploadFile } from './_googleDrive.js';
export const config = { api: { bodyParser: false, sizeLimit: '50mb' } };
async function readBody(req) { const chunks = []; for await (const chunk of req) chunks.push(chunk); return Buffer.concat(chunks); }
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    const user = await requireUser(req);
    const encoded = String(req.headers['x-resource-metadata'] || '');
    const meta = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
    const fileName = decodeURIComponent(String(req.headers['x-file-name'] || meta.fileName || 'resource.bin'));
    const { client, connection, accessToken } = await getConnection();
    let folderMap = connection.folder_map || {};
    const pendingRoot = folderMap['00_CHO_DUYET'] || await ensureFolder(accessToken, '00_CHO_DUYET', connection.root_folder_id);
    const teacherFolder = await ensureFolder(accessToken, String(user.email || user.id).replace(/[^a-zA-Z0-9@._-]/g, '_'), pendingRoot);
    const dateFolder = await ensureFolder(accessToken, new Date().toISOString().slice(0, 10), teacherFolder);
    const uploaded = await uploadFile(accessToken, await readBody(req), { name: fileName, parents: [dateFolder], appProperties: { besResource: 'true', category: meta.category || 'professional', uploaderId: user.id, targetFolder: categoryFolder[meta.category] || '07_TAI_LIEU_CHUYEN_MON' } }, req.headers['content-type']);
    await client.from('resource_activity_logs').insert({ actor_id: user.id, action: 'drive_upload', details: { fileId: uploaded.id, fileName, category: meta.category } });
    return send(res, 200, { fileId: uploaded.id, webViewLink: uploaded.webViewLink, downloadLink: uploaded.webContentLink });
  } catch (error) { return send(res, 400, { error: error.message }); }
}
