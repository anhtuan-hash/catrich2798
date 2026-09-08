import connect from '../serverless-handlers/google-drive-connect.js';
import removeResource from '../serverless-handlers/google-drive-delete.js';
import file from '../serverless-handlers/google-drive-file.js';
import previewSession from '../serverless-handlers/google-drive-preview-session.js';

const handlers = Object.freeze({
  connect,
  delete: removeResource,
  file,
  'preview-session': previewSession,
});

export default async function googleDriveGateway(req, res) {
  const key = String(req.query?.handler || '').trim();
  const selected = handlers[key];
  if (!selected) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'Google Drive API route not found' }));
  }
  return selected(req, res);
}
