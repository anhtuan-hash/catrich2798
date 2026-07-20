const FEEDS = [
  { source: 'VnExpress', url: 'https://vnexpress.net/rss/tin-moi-nhat.rss' },
  { source: 'Tuổi Trẻ', url: 'https://tuoitre.vn/rss/tin-moi-nhat.rss' },
  { source: 'VietnamNet', url: 'https://vietnamnet.vn/rss/tin-moi-nhat.rss' },
];

const decodeXml = (value = '') => value
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/<[^>]+>/g, '').trim();

const readTag = (block, tag) => {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? decodeXml(match[1]) : '';
};

const fetchFeed = async (feed) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7500);
  try {
    const response = await fetch(feed.url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Brian-English-NewsBrief/1.0', Accept: 'application/rss+xml,text/xml,*/*' },
    });
    if (!response.ok) throw new Error(`RSS ${response.status}`);
    const xml = await response.text();
    return [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].slice(0, 10).map(([block]) => ({
      title: readTag(block, 'title'),
      url: readTag(block, 'link') || readTag(block, 'guid'),
      publishedAt: readTag(block, 'pubDate') || readTag(block, 'dc:date'),
      source: feed.source,
    })).filter((item) => item.title && /^https?:\/\//i.test(item.url));
  } finally {
    clearTimeout(timer);
  }
};

export default async function handler(req, res) {
  const limit = Math.max(5, Math.min(20, Number(req.query?.limit || 14)));
  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  const seen = new Set();
  const items = results.flatMap((result) => result.status === 'fulfilled' ? result.value : [])
    .filter((item) => {
      const key = item.title.toLowerCase().replace(/\s+/g, ' ').trim();
      if (seen.has(key)) return false;
      seen.add(key); return true;
    })
    .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
    .slice(0, limit);

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
  res.status(items.length ? 200 : 503).json({ items, updatedAt: new Date().toISOString() });
}
