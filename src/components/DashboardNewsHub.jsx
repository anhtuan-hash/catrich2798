import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './DashboardNewsHub.css';
import './DashboardNewsHubExpanded.css';

const COPY = {
  vi: {
    eyebrow: 'BRIAN NEWSROOM', title: 'Tin tức & Đọc báo', subtitle: 'Điểm tin giáo dục và English News ngay trong Dashboard.',
    vi: 'Tin Việt Nam', en: 'English News', latest: 'Tin mới', viewAll: 'Xem tất cả tin', collapse: 'Thu gọn', read: 'Đọc toàn văn',
    loading: 'Đang cập nhật tin mới…', empty: 'Chưa có tin mới.', retry: 'Tải lại', close: 'Đóng',
    reader: 'Chế độ đọc tập trung', source: 'Nguồn', fullLoading: 'Đang tải toàn văn…', fallback: 'Đang hiển thị nội dung tốt nhất hiện có.',
    minutes: 'phút đọc', featured: 'Nổi bật', fresh: 'Mới cập nhật', fullFeed: 'Tất cả tin trong Dashboard',
    fullFeedSub: 'Toàn bộ dòng tin được giữ ngay tại Dashboard, không mở ứng dụng khác.', loadMore: 'Tải thêm tin', showing: 'Đang hiển thị', articles: 'tin',
  },
  en: {
    eyebrow: 'BRIAN NEWSROOM', title: 'News & Reading', subtitle: 'Education headlines and English News inside your Dashboard.',
    vi: 'Vietnam News', en: 'English News', latest: 'Latest', viewAll: 'View all news', collapse: 'Collapse', read: 'Read full article',
    loading: 'Updating headlines…', empty: 'No recent stories.', retry: 'Retry', close: 'Close',
    reader: 'Focused reader', source: 'Source', fullLoading: 'Loading full article…', fallback: 'Showing the best content currently available.',
    minutes: 'min read', featured: 'Featured', fresh: 'Recently updated', fullFeed: 'All news in Dashboard',
    fullFeedSub: 'The complete news stream stays inside Dashboard without opening another app.', loadMore: 'Load more', showing: 'Showing', articles: 'stories',
  },
};

const CHANNEL_CATEGORY = { vi: 'all', en: 'top' };
const FEED_TTL = 8 * 60 * 1000;
const FULL_PAGE_SIZE = 12;

function cacheKey(channel) { return `bes-dashboard-news:${channel}`; }
function readCache(channel) {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(cacheKey(channel)) || 'null');
    return parsed && Date.now() - parsed.savedAt < FEED_TTL ? parsed.data : null;
  } catch { return null; }
}
function writeCache(channel, data) {
  try { sessionStorage.setItem(cacheKey(channel), JSON.stringify({ savedAt: Date.now(), data })); } catch { /* optional */ }
}
function dateLabel(value, language) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
}
function readingMinutes(item) {
  const words = String(`${item?.content || ''} ${item?.summary || ''}`).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 190));
}
function fallbackBlocks(item) {
  const text = String(item?.content || item?.summary || '').trim();
  if (!text) return [{ type: 'paragraph', text: item?.summary || item?.title || '' }];
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (paragraphs.length ? paragraphs : [text]).map((textValue) => ({ type: 'paragraph', text: textValue }));
}
function NewsImage({ item, featured = false }) {
  return item?.image
    ? <img src={item.image} alt="" loading={featured ? 'eager' : 'lazy'} referrerPolicy="no-referrer" />
    : <span className="dnh-image-fallback" aria-hidden="true"><b>NEWS</b><i /><i /><i /></span>;
}
function ReaderBlocks({ blocks = [] }) {
  return blocks.map((block, index) => {
    const key = `${block.type || 'p'}:${index}:${block.text?.slice(0, 16) || block.src || ''}`;
    if (block.type === 'image' && block.src) return <figure key={key}><img src={block.src} alt={block.alt || ''} referrerPolicy="no-referrer" />{block.caption ? <figcaption>{block.caption}</figcaption> : null}</figure>;
    if (!block.text) return null;
    if (block.type === 'heading') return <h2 key={key}>{block.text}</h2>;
    if (block.type === 'quote') return <blockquote key={key}>{block.text}</blockquote>;
    if (block.type === 'list') return <p className="dnh-reader-list-line" key={key}><span>•</span>{block.text}</p>;
    return <p key={key}>{block.text}</p>;
  });
}

export default function DashboardNewsHub({ language = 'vi' }) {
  const t = COPY[language] || COPY.vi;
  const [channel, setChannel] = useState('vi');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [article, setArticle] = useState({ status: 'idle', data: null, error: '' });
  const [expanded, setExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(FULL_PAGE_SIZE);
  const requestRef = useRef(0);
  const hubRef = useRef(null);

  const compactItems = useMemo(() => items.slice(0, 5), [items]);
  const featured = compactItems[0] || null;
  const secondary = compactItems.slice(1);
  const fullItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);

  async function load({ force = false } = {}) {
    const id = ++requestRef.current;
    setError('');
    if (!force) {
      const cached = readCache(channel);
      if (cached?.items?.length) { setItems(cached.items); setLoading(false); return; }
    }
    setLoading(true);
    try {
      const category = CHANNEL_CATEGORY[channel] || 'all';
      const response = await fetch(`/api/news-feed?language=${encodeURIComponent(channel)}&category=${encodeURIComponent(category)}${force ? `&t=${Date.now()}` : ''}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`);
      if (id !== requestRef.current) return;
      const next = Array.isArray(data?.items) ? data.items : [];
      setItems(next);
      writeCache(channel, { items: next });
    } catch (loadError) {
      if (id !== requestRef.current) return;
      setItems([]);
      setError(loadError?.message || 'Unable to load news');
    } finally {
      if (id === requestRef.current) setLoading(false);
    }
  }

  async function openArticle(item) {
    setSelected(item);
    setArticle({ status: 'loading', data: null, error: '' });
    try {
      const response = await fetch('/api/news-article', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: item.link, source: item.source, title: item.title, summary: item.summary, content: item.content, image: item.image, author: item.author, publishedAt: item.publishedAt }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`);
      setArticle({ status: data?.full ? 'ready' : 'partial', data: { ...data, title: data?.title || item.title, image: data?.image || item.image, author: data?.author || item.author || item.source, publishedAt: data?.publishedAt || item.publishedAt, blocks: Array.isArray(data?.blocks) && data.blocks.length ? data.blocks : fallbackBlocks(item) }, error: data?.full ? '' : t.fallback });
    } catch (articleError) {
      setArticle({ status: 'partial', data: { title: item.title, image: item.image, author: item.author || item.source, publishedAt: item.publishedAt, blocks: fallbackBlocks(item) }, error: articleError?.message || t.fallback });
    }
  }

  function toggleExpanded() {
    setExpanded((current) => {
      const next = !current;
      if (next) {
        setVisibleCount(FULL_PAGE_SIZE);
        window.requestAnimationFrame(() => hubRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      }
      return next;
    });
  }

  useEffect(() => {
    setVisibleCount(FULL_PAGE_SIZE);
    load();
    return () => { requestRef.current += 1; };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [channel]);

  useEffect(() => {
    if (!selected) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  return <>
    <section className={`dnh${expanded ? ' is-expanded' : ''}`} aria-label={t.title} ref={hubRef}>
      <header className="dnh-head">
        <div className="dnh-title"><span className="dnh-icon" aria-hidden="true">N</span><div><span>{t.eyebrow}</span><h2>{t.title}</h2><p>{t.subtitle}</p></div></div>
        <div className="dnh-actions">
          <div className="dnh-tabs" role="tablist" aria-label={t.title}>
            <button type="button" role="tab" aria-selected={channel === 'vi'} className={channel === 'vi' ? 'is-active' : ''} onClick={() => setChannel('vi')}>{t.vi}</button>
            <button type="button" role="tab" aria-selected={channel === 'en'} className={channel === 'en' ? 'is-active' : ''} onClick={() => setChannel('en')}>{t.en}</button>
          </div>
          <button type="button" className="dnh-view-all" aria-expanded={expanded} onClick={toggleExpanded}>{expanded ? t.collapse : t.viewAll}<span>{expanded ? '↑' : '↓'}</span></button>
        </div>
      </header>

      {loading ? <div className="dnh-state"><span className="dnh-loader" />{t.loading}</div> : error ? <div className="dnh-state is-error"><span>{error}</span><button type="button" onClick={() => load({ force: true })}>{t.retry}</button></div> : !featured ? <div className="dnh-state">{t.empty}</div> : <>
        {!expanded ? <div className="dnh-grid">
          <button type="button" className="dnh-featured" onClick={() => openArticle(featured)}>
            <span className="dnh-featured-media"><NewsImage item={featured} featured /><em>{t.featured}</em></span>
            <span className="dnh-featured-copy"><small>{featured.source || t.fresh}{featured.publishedAt ? ` · ${dateLabel(featured.publishedAt, language)}` : ''}</small><strong>{featured.title}</strong><p>{featured.summary}</p><span>{t.read} <b>→</b></span></span>
          </button>
          <div className="dnh-list">{secondary.map((item) => <button type="button" className="dnh-story" key={item.id || item.link} onClick={() => openArticle(item)}><span className="dnh-story-media"><NewsImage item={item} /></span><span className="dnh-story-copy"><small>{item.source || t.latest} · {readingMinutes(item)} {t.minutes}</small><strong>{item.title}</strong><span>{dateLabel(item.publishedAt, language)}</span></span></button>)}</div>
        </div> : <div className="dnh-full">
          <div className="dnh-full-head"><div><span>{t.eyebrow}</span><h3>{t.fullFeed}</h3><p>{t.fullFeedSub}</p></div><small>{t.showing} {fullItems.length}/{items.length} {t.articles}</small></div>
          <div className="dnh-full-grid">{fullItems.map((item, index) => <button type="button" className={`dnh-full-card${index === 0 ? ' is-lead' : ''}`} key={item.id || item.link || index} onClick={() => openArticle(item)}>
            <span className="dnh-full-media"><NewsImage item={item} featured={index === 0} />{index === 0 ? <em>{t.featured}</em> : null}</span>
            <span className="dnh-full-copy"><small>{item.source || t.latest} · {readingMinutes(item)} {t.minutes}</small><strong>{item.title}</strong>{item.summary ? <p>{item.summary}</p> : null}<span>{dateLabel(item.publishedAt, language)}</span></span>
          </button>)}</div>
          <div className="dnh-full-footer">{visibleCount < items.length ? <button type="button" className="dnh-load-more" onClick={() => setVisibleCount((count) => Math.min(count + FULL_PAGE_SIZE, items.length))}>{t.loadMore}<span>↓</span></button> : null}<button type="button" className="dnh-collapse-bottom" onClick={toggleExpanded}>{t.collapse}<span>↑</span></button></div>
        </div>}
      </>}
    </section>

    {selected && typeof document !== 'undefined' ? createPortal(<div className="dnh-reader-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><article className="dnh-reader" role="dialog" aria-modal="true" aria-label={selected.title}><header><div><span>{t.reader}</span><strong>{article.data?.author || selected.source || t.source}</strong></div><button type="button" aria-label={t.close} onClick={() => setSelected(null)}>×</button></header><div className="dnh-reader-scroll">{article.status === 'loading' ? <div className="dnh-reader-loading"><span className="dnh-loader" />{t.fullLoading}</div> : <><div className="dnh-reader-hero">{article.data?.image ? <img src={article.data.image} alt="" referrerPolicy="no-referrer" /> : null}<div><small>{article.data?.author || selected.source}{article.data?.publishedAt ? ` · ${dateLabel(article.data.publishedAt, language)}` : ''}</small><h1>{article.data?.title || selected.title}</h1>{article.error ? <p className="dnh-reader-note">{article.error}</p> : null}</div></div><div className="dnh-reader-content"><ReaderBlocks blocks={article.data?.blocks || fallbackBlocks(selected)} /></div></>}</div><footer><button type="button" className="dnh-reader-primary" onClick={() => setSelected(null)}>{t.close}</button></footer></article></div>, document.body) : null}
  </>;
}
