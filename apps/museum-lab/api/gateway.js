import galleryGuest from '../../../serverless-handlers/gallery-guest.js';
import galleryStaff from '../../../serverless-handlers/gallery-staff.js';
import museumLive from '../../../serverless-handlers/museum-live.js';
import museumArtwork from '../../../serverless-handlers/museum-artwork.js';
import youtubeSearch from '../../../serverless-handlers/_youtube-search.js';

const handlers = new Map([
  ['gallery-guest', galleryGuest],
  ['gallery-staff', galleryStaff],
  ['museum-live', museumLive],
  ['museum-artwork', museumArtwork],
  ['youtube-search', youtubeSearch],
]);

export default async function museumGateway(req, res) {
  const handler = handlers.get(req.query?.handler);
  if (!handler) return res.status(404).json({ error: 'API route not found' });
  return handler(req, res);
}
