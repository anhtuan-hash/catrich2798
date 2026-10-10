import homepagePublish from '../serverless-handlers/homepage-hero-publish.js';
import homepageMobilePublish from '../serverless-handlers/homepage-mobile-hero-publish.js';

const handlers = Object.freeze({
  publish: homepagePublish,
  'mobile-publish': homepageMobilePublish,
});

export default async function homepageHeroGateway(req, res) {
  const key = String(req.query?.handler || '').trim();
  const selected = handlers[key];
  if (!selected) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'Homepage Hero API route not found' }));
  }
  return selected(req, res);
}
