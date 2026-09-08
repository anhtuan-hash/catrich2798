import accessV2 from '../serverless-handlers/_work-hub-file-access.js';
import editLink from '../serverless-handlers/work-hub-file-edit-link.js';
import signedFile from '../serverless-handlers/_work-hub-file.js';
import streamFile from '../serverless-handlers/work-hub-file-stream.js';

const handlers = Object.freeze({
  'access-v2': accessV2,
  'edit-link': editLink,
  signed: signedFile,
  stream: streamFile,
});

export default async function workHubGateway(req, res) {
  const key = String(req.query?.handler || '').trim();
  const selected = handlers[key];
  if (!selected) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'Work Hub file API route not found' }));
  }
  return selected(req, res);
}
