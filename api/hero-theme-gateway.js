import admin from '../serverless-handlers/hero-theme-admin.js';
import manifest from '../serverless-handlers/hero-theme-manifest.js';
import media from '../serverless-handlers/hero-theme-media.js';
import homepagePublish from '../serverless-handlers/homepage-hero-publish.js';

const handlers = Object.freeze({
  admin,
  manifest,
  media,
  'homepage-publish': homepagePublish,
});

export default async function heroThemeGateway(req, res) {
  const key = String(req.query?.handler || '').trim();
  const selected = handlers[key];
  if (!selected) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'Hero Theme API route not found' }));
  }
  return selected(req, res);
}
