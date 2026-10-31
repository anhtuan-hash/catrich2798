import { createClient } from 'npm:@supabase/supabase-js@2.57.2';

const PROJECT_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const API_UA = 'BRIANWorldExplorerBot/1.0 (https://esl-brian.vercel.app) SupabaseEdge/1.0';
const supabase = createClient(PROJECT_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Category = 'culture' | 'history' | 'places' | 'science' | 'language' | 'international';
type Topic = { title: string; category: Category };
type Page = { title?: string; missing?: boolean; ns?: number; extract?: string; thumbnail?: { source?: string }; pageimage?: string; langlinks?: { lang: string; title: string }[]; pageprops?: Record<string, string> };
type Wikidata = { query?: { pages?: Page[]; categorymembers?: { title: string; ns: number }[] }; error?: { info?: string } };
type ImageInfo = { thumburl?: string; url?: string; descriptionurl?: string; extmetadata?: Record<string, { value?: string }> };

// A school-safe editorial seed list rotates by hourly slot; category APIs
// supplement it so the service can keep discovering new pages over time.
const SEEDS: Topic[] = [
  ...'Earth|Moon|Mars|Jupiter|Saturn|Venus|Solar System|Milky Way|Galaxy|Nebula|Supernova|Black hole|Comet|Asteroid|International Space Station|Space exploration|Aurora|Solar eclipse|Lunar eclipse|Telescope|Hubble Space Telescope|James Webb Space Telescope|Light-year|Exoplanet|Atmosphere of Earth|Ocean|Tide|Water cycle|Rainforest|Biodiversity|Coral reef|Great Barrier Reef|Mangrove|Wetland|Amazon rainforest|Climate change|Renewable energy|Wind power|Solar power|Hydroelectricity|Geothermal energy|Recycling|Conservation biology|Natural selection|Photosynthesis|Ozone layer|Greenhouse effect|Earthquake|Tsunami|Volcano|Plate tectonics|Glacier|Iceberg|Monsoon|El Niño|Desert|Savanna|Taiga|Tundra|Ecosystem|Food web'.split('|').map((title) => ({ title, category: 'science' as Category })),
  ...'Mount Everest|Mount Fuji|Kilimanjaro|Himalayas|Alps|Andes|Sahara|Gobi Desert|Nile|Amazon River|Mekong|Danube|Grand Canyon|Ha Long Bay|Great Wall of China|Machu Picchu|Petra|Angkor Wat|Taj Mahal|Colosseum|Eiffel Tower|Statue of Liberty|Sydney Opera House|Tower Bridge|Stonehenge|Pyramids of Giza|Yellowstone National Park|Serengeti National Park|Banff National Park|Galápagos Islands|Borneo|Madagascar|New Zealand|Antarctica|Iceland|Greenland|Red Sea|Mediterranean Sea|Dead Sea|Lake Baikal|Caspian Sea|Victoria Falls|Iguazu Falls|Niagara Falls|Giant panda|Blue whale|Sea turtle|Snow leopard|Bengal tiger|Koala|Emperor penguin|Red panda|African elephant|Polar bear'.split('|').map((title) => ({ title, category: 'places' as Category })),
  ...'Lunar New Year|Diwali|Hanami|Holi|Carnival|Oktoberfest|Christmas|Halloween|Thanksgiving|International Women\'s Day|World Environment Day|Earth Day|World Oceans Day|World Water Day|International Literacy Day|International Day of Peace|New Year|Mid-Autumn Festival|Vesak|Songkran|Ramadan|Hanukkah|Lantern Festival|Thanksgiving (United States)|Obon|Day of the Dead|Bastille Day|Independence Day (United States)|Culture|Cultural heritage|World Heritage Site|UNESCO|Museum|Library|Archaeology|Photography|Calligraphy|Origami|Ikebana|Tea ceremony|Folk music|Jazz|Classical music|Olympic Games|Paralympic Games|Chess|Poetry|Novel|Writing system|English language|Vietnamese language|Sign language|Braille|Translation'.split('|').map((title) => ({ title, category: 'culture' as Category })),
  ...'Printing press|Industrial Revolution|Renaissance|Silk Road|Ancient Egypt|Ancient Greece|Roman Empire|Maya civilization|Indus Valley Civilization|Mesopotamia|Great Pyramid of Giza|History of astronomy|History of computing|Ada Lovelace|Alan Turing|Marie Curie|Albert Einstein|Isaac Newton|Nikola Tesla|Charles Darwin|Leonardo da Vinci|Johannes Gutenberg|Louis Pasteur|Florence Nightingale|Amelia Earhart|Neil Armstrong|Yuri Gagarin|Valentina Tereshkova|Rosalind Franklin|Jane Goodall|Rachel Carson|Alexander Fleming|Dmitri Mendeleev|Tim Berners-Lee|Grace Hopper|Norman Borlaug|Katherine Johnson|John von Neumann|Carl Linnaeus|Alfred Nobel'.split('|').map((title) => ({ title, category: 'history' as Category })),
];
const CATEGORY_POOLS: { category: Category; name: string }[] = [
  { category: 'places', name: 'Category:World Heritage Sites' },
  { category: 'science', name: 'Category:Scientific concepts' },
  { category: 'places', name: 'Category:National parks' },
  { category: 'history', name: 'Category:Historic buildings' },
  { category: 'science', name: 'Category:Renewable energy' },
  { category: 'culture', name: 'Category:Cultural festivals' },
  { category: 'science', name: 'Category:Marine biology' },
  { category: 'culture', name: 'Category:Art museums and galleries' },
  { category: 'places', name: 'Category:Mountains' },
  { category: 'science', name: 'Category:Space exploration' },
];

function plain(input: string | undefined): string {
  return (input || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/\[\s*\d+\s*\]/g, '')
    .replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

function preview(input: string, max = 275): string {
  const sentence = input.match(/^.{50,240}?[.!?](?:\s|$)/s)?.[0]?.trim();
  return (sentence || input.slice(0, max)).slice(0, max).trim();
}

const FETCH_HEADERS = { 'User-Agent': API_UA, 'Api-User-Agent': API_UA, Accept: 'application/json' };

async function wikiApi(host: string, params: Record<string, string>): Promise<Wikidata> {
  const url = new URL('https://' + host + '/w/api.php');
  for (const [key, value] of Object.entries({ action: 'query', format: 'json', formatversion: '2', ...params })) {
    url.searchParams.set(key, value);
  }
  const response = await fetch(url, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(11000) });
  if (!response.ok) {
    if (response.status === 429 || response.status === 503) throw new Error('wikimedia_rate_limited_' + response.status);
    throw new Error('wikimedia_http_' + response.status);
  }
  const data = await response.json() as Wikidata;
  if (data.error) throw new Error('wikimedia_api_' + (data.error.info || 'unknown'));
  return data;
}

async function getPage(host: string, title: string, english: boolean): Promise<Page | null> {
  const data = await wikiApi(host, {
    titles: title, redirects: '1',
    prop: english ? 'extracts|pageimages|langlinks|pageprops' : 'extracts|pageprops',
    explaintext: '1', exintro: '1', exchars: english ? '3000' : '3200',
    ...(english ? { piprop: 'thumbnail|name', pithumbsize: '960', lllang: 'vi', lllimit: '1' } : {}),
  });
  const page = data.query?.pages?.[0];
  if (!page || page.missing || page.ns !== 0 || page.pageprops?.disambiguation !== undefined) return null;
  return page;
}

async function getImage(imageTitle: string): Promise<{ url: string; credit: string; license: string } | null> {
  if (!imageTitle) return null;
  const title = imageTitle.startsWith('File:') ? imageTitle : 'File:' + imageTitle;
  const data = await wikiApi('commons.wikimedia.org', {
    titles: title, prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '960',
  });
  const info = (data.query?.pages?.[0] as unknown as { imageinfo?: ImageInfo[] })?.imageinfo?.[0];
  if (!info) return null;
  const imageUrl = info.thumburl || info.url || '';
  if (!/^https:\/\/upload\.wikimedia\.org\//.test(imageUrl)) return null;
  const metadata = info.extmetadata || {};
  const license = plain(metadata.LicenseShortName?.value);
  // No fair-use, unknown, NC, ND or unverified images.
  if (!/^(CC BY(?:-SA)?\s+\d(?:\.\d)?|CC0(?:\s|$)|Public domain|PD(?:\s|$|-))/i.test(license)) return null;
  const artist = plain(metadata.Artist?.value || metadata.Credit?.value)
    .replace(/https?:\/\/\S+/g, '').slice(0, 190) || 'Wikimedia Commons contributor';
  const filePage = info.descriptionurl || 'https://commons.wikimedia.org/wiki/' + encodeURIComponent(title.replaceAll(' ', '_'));
  const credit = 'Image: ' + artist + ' · ' + license + ' · ' + filePage;
  return { url: imageUrl, credit, license };
}

async function candidates(slot: number): Promise<Topic[]> {
  const selected: Topic[] = [];
  const used = new Set<string>();
  const add = (topic: Topic) => { if (!used.has(topic.title.toLowerCase())) { used.add(topic.title.toLowerCase()); selected.push(topic); } };
  // Seed order changes every hour, but the first 24 candidates remain bounded.
  for (let j = 0; j < 35; j++) add(SEEDS[(slot * 17 + j * 31) % SEEDS.length]);
  const pool = CATEGORY_POOLS[slot % CATEGORY_POOLS.length];
  try {
    const prefix = String.fromCharCode(65 + (slot % 26));
    const data = await wikiApi('en.wikipedia.org', {
      list: 'categorymembers', cmtitle: pool.name,
      cmnamespace: '0', cmtype: 'page', cmlimit: '70',
      cmsort: 'sortkey', cmstartsortkeyprefix: prefix,
    });
    for (const member of data.query?.categorymembers || []) {
      if (member.ns !== 0 || /list of|timeline|index|outline|comparison of/i.test(member.title)) continue;
      add({ title: member.title, category: pool.category });
    }
  } catch (error) {
    console.warn('Category lookup fallback:', String(error));
  }
  return selected;
}

async function makeStory(topic: Topic) {
  const en = await getPage('en.wikipedia.org', topic.title, true);
  if (!en?.title || !en.pageimage || !en.langlinks?.[0]?.title) return null;
  const body_en = plain(en.extract);
  if (body_en.length < 500 || body_en.length > 5200) return null;
  const vi = await getPage('vi.wikipedia.org', en.langlinks[0].title, false);
  if (!vi?.title) return null;
  const body_vi = plain(vi.extract);
  if (body_vi.length < 360 || body_vi.length > 5200) return null;
  const image = await getImage(en.pageimage);
  if (!image) return null;
  const article_en = 'https://en.wikipedia.org/wiki/' + encodeURIComponent(en.title.replaceAll(' ', '_'));
  const article_vi = 'https://vi.wikipedia.org/wiki/' + encodeURIComponent(vi.title.replaceAll(' ', '_'));
  return {
    category: topic.category, title_en: en.title, title_vi: vi.title,
    intro_en: preview(body_en), intro_vi: preview(body_vi),
    body_en, body_vi, image_url: image.url,
    image_alt_en: en.title, image_credit: image.credit, image_license: image.license,
    source_url: article_en, source_url_vi: article_vi,
    content_license: 'CC BY-SA 4.0',
  };
}

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return Response.json({ error: 'POST required' }, { status: 405 });
  const supplied = request.headers.get('x-world-explorer-cron-token') || '';
  if (!supplied || !PROJECT_URL || !SERVICE_KEY) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { data: authorized, error: authError } = await supabase.rpc('world_explorer_verify_cron_token', { p_token: supplied });
    if (authError || authorized !== true) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: settings, error: settingsError } = await supabase.from('world_explorer_settings')
      .select('enabled,auto_publish_hourly').eq('id', 1).single();
    if (settingsError) throw settingsError;
    if (!settings?.enabled || !settings.auto_publish_hourly) return Response.json({ published: false, reason: 'disabled' });
    const { data: previous, error: previousError } = await supabase.from('world_explorer_publications')
      .select('source_url,publication_hour_epoch').order('published_at', { ascending: false }).limit(600);
    if (previousError) throw previousError;
    const usedSources = new Set((previous || []).map((p: { source_url?: string }) => p.source_url));
    const slot = Math.floor(Date.now() / 3600000);
    if ((previous || []).some((p: { publication_hour_epoch?: number }) => Number(p.publication_hour_epoch) === slot))
      return Response.json({ published: false, reason: 'slot_already_published' });

    const possibilities = await candidates(slot);
    let examined = 0;
    for (const candidate of possibilities) {
      if (examined >= 18) break;
      examined++;
      try {
        const story = await makeStory(candidate);
        if (!story || usedSources.has(story.source_url)) continue;
        const { data: result, error: writeError } = await supabase.rpc('world_explorer_auto_ingest', { p_payload: story });
        if (writeError) throw writeError;
        if (result?.published === true) return Response.json({ published: true, title: story.title_en, hour: slot });
        if (result?.reason === 'slot_already_published' || result?.reason === 'disabled') return Response.json(result);
      } catch (error) {
        const message = String(error);
        if (message.includes('rate_limited')) {
          console.warn('Wikimedia rate limited; skipping this hour');
          return Response.json({ published: false, reason: 'upstream_rate_limited' }, { status: 503 });
        }
        console.warn('Skipping incomplete or unusable topic:', candidate.title, message.slice(0, 250));
      }
    }
    console.warn('No bilingual licensed illustrated topic available after', examined, 'attempts');
    return Response.json({ published: false, reason: 'no_qualified_content', examined }, { status: 503 });
  } catch (error) {
    console.error('World Explorer hourly failed:', String(error).slice(0, 750));
    return Response.json({ published: false, error: 'hourly_ingest_failed' }, { status: 500 });
  }
});
