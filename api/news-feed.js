import crypto from 'node:crypto';

const FEEDS = {
  vi: {
    all: [
      { name: 'Giáo dục & Thời đại', category: 'Giáo dục', url: 'https://giaoducthoidai.vn/rss/giao-duc-17.rss' },
      { name: 'Giáo dục & Thời đại', category: 'Giáo dục 24h', url: 'https://giaoducthoidai.vn/rss/giao-duc-24h-87.rss' },
      { name: 'Giáo dục & Thời đại', category: 'Phương pháp', url: 'https://giaoducthoidai.vn/rss/phuong-phap-31.rss' },
      { name: 'Tuổi Trẻ', category: 'Giáo dục', url: 'https://tuoitre.vn/giao-duc.rss' },
    ],
    policy: [
      { name: 'Giáo dục & Thời đại', category: 'Chính sách', url: 'https://giaoducthoidai.vn/rss/giao-duc-17.rss' },
      { name: 'Giáo dục & Thời đại', category: 'Giáo dục 24h', url: 'https://giaoducthoidai.vn/rss/giao-duc-24h-87.rss' },
    ],
    teaching: [
      { name: 'Giáo dục & Thời đại', category: 'Phương pháp', url: 'https://giaoducthoidai.vn/rss/phuong-phap-31.rss' },
    ],
    school: [
      { name: 'Tuổi Trẻ', category: 'Học đường', url: 'https://tuoitre.vn/giao-duc.rss' },
      { name: 'Giáo dục & Thời đại', category: 'Giáo dục 24h', url: 'https://giaoducthoidai.vn/rss/giao-duc-24h-87.rss' },
    ],
  },
  en: {
    top: [
      { name: 'BBC News', category: 'Top Stories', url: 'https://feeds.bbci.co.uk/news/rss.xml' },
      { name: 'The Guardian', category: 'World', url: 'https://www.theguardian.com/world/rss' },
    ],
    education: [
      { name: 'BBC News', category: 'Education', url: 'https://feeds.bbci.co.uk/news/education/rss.xml' },
      { name: 'The Guardian', category: 'Education', url: 'https://www.theguardian.com/education/rss' },
      { name: 'VOA Learning English', category: 'Education', url: 'https://learningenglish.voanews.com/api/ztmp_l-vomx-tpek-__' },
    ],
    science: [
      { name: 'BBC News', category: 'Science', url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml' },
      { name: 'VOA Learning English', category: 'Science & Technology', url: 'https://learningenglish.voanews.com/api/zmg_pl-vomx-tpeymtm' },
    ],
    learning: [
      { name: 'VOA Learning English', category: 'Learning English', url: 'https://learningenglish.voanews.com/api/zbmroml-vomx-tpeqboo_' },
      { name: 'VOA Learning English', category: 'Education', url: 'https://learningenglish.voanews.com/api/ztmp_l-vomx-tpek-__' },
      { name: 'VOA Learning English', category: 'Science & Technology', url: 'https://learningenglish.voanews.com/api/zmg_pl-vomx-tpeymtm' },
    ],
  },
};

const ENTITY_MAP = {
  amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”',
};

function decodeEntities(value = '') {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (all, key) => ENTITY_MAP[key.toLowerCase()] ?? all);
}

function stripHtml(value = '') {
  return decodeEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function escapeRegExp(value = '') {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function tagValue(block, tag) {
  const name = escapeRegExp(tag);
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return match ? decodeEntities(match[1]).trim() : '';
}

function tagAttr(block, tag, attr) {
  const t = escapeRegExp(tag);
  const a = escapeRegExp(attr);
  const match = block.match(new RegExp(`<${t}[^>]*\\s${a}=["']([^"']+)["'][^>]*>`, 'i'));
  return match ? decodeEntities(match[1]).trim() : '';
}

function findImage(block, description = '') {
  return tagAttr(block, 'media:content', 'url')
    || tagAttr(block, 'media:thumbnail', 'url')
    || tagAttr(block, 'enclosure', 'url')
    || tagAttr(description, 'img', 'src')
    || '';
}

function canonicalUrl(value = '') {
  try {
    const url = new URL(value.trim());
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'].forEach((key) => url.searchParams.delete(key));
    return url.toString();
  } catch {
    return value.trim();
  }
}

function parseDate(value = '') {
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function makeId(source, link, title) {
  return crypto.createHash('sha1').update(`${source}|${link}|${title}`).digest('hex').slice(0, 20);
}

function parseRss(xml, sourceConfig) {
  const rssItems = [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map((match) => match[1]);
  const atomItems = rssItems.length ? [] : [...xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi)].map((match) => match[1]);
  const blocks = rssItems.length ? rssItems : atomItems;

  return blocks.map((block) => {
    const title = stripHtml(tagValue(block, 'title'));
    const rawDescription = tagValue(block, 'description') || tagValue(block, 'summary');
    const rawContent = tagValue(block, 'content:encoded') || tagValue(block, 'content') || rawDescription;
    const link = canonicalUrl(tagValue(block, 'link') || tagAttr(block, 'link', 'href'));
    const publishedAt = parseDate(tagValue(block, 'pubDate') || tagValue(block, 'published') || tagValue(block, 'updated') || tagValue(block, 'dc:date'));
    const summary = stripHtml(rawDescription || rawContent).slice(0, 900);
    const content = stripHtml(rawContent || rawDescription).slice(0, 9000);
    const image = findImage(block, rawDescription || rawContent);
    const author = stripHtml(tagValue(block, 'dc:creator') || tagValue(block, 'author'));

    if (!title || !link) return null;
    return {
      id: makeId(sourceConfig.name, link, title),
      title,
      link,
      summary,
      content,
      image,
      author,
      source: sourceConfig.name,
      category: sourceConfig.category,
      publishedAt,
    };
  }).filter(Boolean);
}

async function fetchFeed(sourceConfig) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(sourceConfig.url, {
      headers: {
        'User-Agent': 'Brian-English-Studio-NewsReader/1.0 (+https://englishpek.vercel.app)',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const xml = await response.text();
    return { items: parseRss(xml, sourceConfig), error: null };
  } catch (error) {
    return { items: [], error: `${sourceConfig.name}: ${error?.name === 'AbortError' ? 'timeout' : error?.message || 'fetch failed'}` };
  } finally {
    clearTimeout(timer);
  }
}

function dedupeAndSort(items) {
  const seen = new Set();
  return items
    .filter((item) => {
      const key = `${item.source}|${item.link}`;
      const titleKey = item.title.toLowerCase().replace(/\s+/g, ' ').trim();
      if (seen.has(key) || seen.has(titleKey)) return false;
      seen.add(key);
      seen.add(titleKey);
      return true;
    })
    .sort((a, b) => (Date.parse(b.publishedAt || 0) || 0) - (Date.parse(a.publishedAt || 0) || 0));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const language = req.query?.language === 'en' ? 'en' : 'vi';
  const requestedCategory = String(req.query?.category || (language === 'en' ? 'top' : 'all'));
  const categories = FEEDS[language];
  const category = Object.hasOwn(categories, requestedCategory) ? requestedCategory : Object.keys(categories)[0];
  const configs = categories[category];
  const settled = await Promise.all(configs.map(fetchFeed));
  const errors = settled.map((entry) => entry.error).filter(Boolean);
  const items = dedupeAndSort(settled.flatMap((entry) => entry.items)).slice(0, 60);
  const sources = [...new Set(items.map((item) => item.source))];

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
  return res.status(200).json({
    language,
    category,
    fetchedAt: new Date().toISOString(),
    items,
    sources,
    errors,
    partial: errors.length > 0 && items.length > 0,
  });
}
