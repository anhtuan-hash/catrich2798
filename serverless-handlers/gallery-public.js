// Anonymous, read-only exhibition catalogue. Never return staff records,
// invitation handles, submissions, scores, drafts or private exhibition rows.
import {db, fail, handleError, query, send, uid} from './_galleryCreator.js';

const CATALOG_FIELDS = 'id,slug,title,summary,visibility,status,updated_at,starts_at,ends_at';
const isLive = (item, now) =>
  (!item.starts_at || Date.parse(item.starts_at) <= now) &&
  (!item.ends_at || Date.parse(item.ends_at) >= now);

async function publicCatalogue(admin) {
  const setting = await query(admin.from('gallery_settings')
    .select('enabled').eq('id', true).maybeSingle());
  if (setting?.enabled !== true) return {galleryEnabled: false, publishedGalleries: []};

  // Visibility is content-specific. A publicly reachable app must not
  // accidentally make school-only or unpublished student work public.
  const [galleries, archives] = await Promise.all([
    query(admin.from('gallery_exhibitions').select(CATALOG_FIELDS)
      .eq('status', 'published').eq('visibility', 'public')
      .order('updated_at', {ascending: false}).limit(100)),
    query(admin.from('museum_showcase_archives').select('item_key')
      .eq('item_kind', 'gallery').limit(500)),
  ]);
  const excluded = new Set(archives.map(item => String(item.item_key)));
  const now = Date.now();
  const publishedGalleries = galleries
    .filter(item => !excluded.has(item.id) && isLive(item, now))
    .map(({starts_at, ends_at, ...item}) => item);
  return {galleryEnabled: true, publishedGalleries};
}

export default async function galleryPublic(req, res) {
  try {
    // No cookies, bearer tokens or POST mutations are accepted by this API.
    if (req.method !== 'GET') return send(res, 405, {error: 'This endpoint is read-only.'});
    const operation = String(req.query?.operation || 'list');
    if (!['list', 'exhibition'].includes(operation)) {
      return send(res, 404, {error: 'Public operation not found.'});
    }
    const admin = db();
    const catalogue = await publicCatalogue(admin);
    if (operation === 'list') return send(res, 200, catalogue);

    const id = String(req.query?.id || '');
    if (!uid(id)) throw fail(400, 'Invalid exhibition identifier.');
    // This exact allowlist gate precedes all access to rooms, exhibits
    // and storage. A guessed UUID can never fetch a private record.
    if (!catalogue.publishedGalleries.some(item => item.id === id)) {
      throw fail(404, 'Public exhibition is unavailable.');
    }

    const gallery = await query(admin.from('gallery_exhibitions')
      .select('id,slug,title,summary,visibility,status')
      .eq('id', id).eq('status', 'published').eq('visibility', 'public').single());
    const rooms = await query(admin.from('gallery_rooms')
      .select('id,exhibition_id,title,template_key,sort_order')
      .eq('exhibition_id', id).order('sort_order'));
    const roomIds = rooms.map(room => room.id);
    const exhibits = roomIds.length ? await query(admin.from('gallery_exhibits')
      .select('id,room_id,title,description,kind,status,alt_text,transcript,external_url,model_key,asset_id,transform')
      .in('room_id', roomIds).eq('status', 'published').order('created_at')) : [];

    const ids = [...new Set(exhibits
      .filter(item => item.kind === 'image' && uid(item.asset_id))
      .map(item => item.asset_id))];
    const assets = ids.length ? await query(admin.from('gallery_assets')
      .select('id,path').in('id', ids)) : [];
    // The bucket stays private. Only image assets of approved public
    // exhibits receive short-lived, read-only URLs.
    const signed = await Promise.all(assets.map(async asset => {
      const result = await admin.storage.from('brian-gallery-private')
        .createSignedUrl(asset.path, 600);
      return [asset.id, result.error ? '' : (result.data?.signedUrl || '')];
    }));
    const urls = new Map(signed);
    const publishedRooms = rooms.map(room => ({
      ...room,
      exhibits: exhibits.filter(item => item.room_id === room.id)
        .map(({asset_id, ...item}) => ({
          ...item,
          image_url: item.kind === 'image' ? (urls.get(asset_id) || '') : '',
        })),
    }));
    return send(res, 200, {gallery: {...gallery, rooms: publishedRooms}});
  } catch (error) {
    return handleError(res, error);
  }
}
