import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const CHANNELS = {
  vi: [
    { id: 'all', label: 'Mới nhất' },
    { id: 'policy', label: 'Chính sách' },
    { id: 'teaching', label: 'Phương pháp' },
    { id: 'school', label: 'Học đường' },
  ],
  en: [
    { id: 'top', label: 'Top stories' },
    { id: 'education', label: 'Education' },
    { id: 'science', label: 'Science' },
    { id: 'learning', label: 'Learning English' },
  ],
};

const TEXT = {
  vi: {
    kicker: 'BRIAN NEWSROOM · TOÀN VĂN TRONG ỨNG DỤNG',
    title: 'Đọc báo để mở rộng góc nhìn.',
    subtitle: 'Tin giáo dục Việt Nam và báo tiếng Anh được gom trong một giao diện đọc tập trung. Nhấn vào bài để tải toàn văn và đọc trực tiếp mà không rời Brian English.',
    viTab: 'Báo giáo dục Việt Nam', enTab: 'English News', heroPrimary: 'Đọc tin Việt Nam', heroSecondary: 'Read English news',
    fullFeature: 'Toàn văn trong app', listenFeature: 'Nghe bài bằng giọng đọc', saveFeature: 'Lưu bài trên thiết bị',
    refresh: 'Làm mới', loading: 'Đang tải nguồn tin mới nhất...', empty: 'Chưa có bài phù hợp với bộ lọc này.', latest: 'Dòng tin mới', articles: 'bài', source: 'Nguồn báo', allSources: 'Tất cả nguồn',
    read: 'Đọc toàn văn', close: 'Đóng trình đọc', saved: 'Đã lưu', save: 'Lưu bài', listen: 'Nghe bài', stop: 'Dừng đọc', retry: 'Tải lại toàn văn',
    partial: 'Một vài nguồn đang phản hồi chậm; danh sách dưới đây là dữ liệu đã tải được.', failed: 'Không tải được nguồn tin. Hãy nhấn Làm mới sau ít phút.', readTime: 'phút đọc', updated: 'Cập nhật',
    fullLoading: 'Đang tải và dựng toàn văn bài báo...', fullReady: 'Đã tải toàn văn', fallbackReady: 'Đang hiển thị nội dung nguồn cung cấp',
    fullFailed: 'Tòa soạn tạm thời giới hạn việc trích xuất toàn văn. Hệ thống vẫn giữ nội dung tốt nhất đã lấy được.',
    featured: 'Bài nổi bật', savedPanel: 'Bài đã lưu', activeSources: 'Nguồn đang hoạt động', readingDesk: 'Bàn đọc cá nhân', savedOnly: 'Chỉ xem bài đã lưu', allStories: 'Xem tất cả bài', loadMore: 'Tải thêm bài', noSaved: 'Chưa có bài đã lưu.',
    contentLabel: 'TOÀN VĂN', feedLabel: 'TIN MỚI', sourceLabel: 'NGUỒN BÁO', noDistraction: 'Không quảng cáo chen giữa nội dung',
    readerNote: 'Nội dung được tải từ bài gốc và trình bày lại ở chế độ đọc tập trung. Bản quyền bài viết và hình ảnh thuộc tòa soạn tương ứng.',
    backToNews: 'Quay lại dòng tin', readerMode: 'CHẾ ĐỘ ĐỌC TẬP TRUNG', related: 'Bài liên quan', lightReader: 'Nền sáng', darkReader: 'Nền tối', backToTop: 'Về đầu bài',
  },
  en: {
    kicker: 'BRIAN NEWSROOM · FULL ARTICLE READER', title: 'Read the news. Widen your view.', subtitle: 'Vietnamese education reporting and English-language news in one focused reader. Open any story to fetch the full article without leaving Brian English.',
    viTab: 'Vietnam Education', enTab: 'English News', heroPrimary: 'Vietnamese news', heroSecondary: 'Read English news', fullFeature: 'Full article in app', listenFeature: 'Browser text-to-speech', saveFeature: 'Save stories locally',
    refresh: 'Refresh', loading: 'Loading the latest feeds...', empty: 'No stories match the current filters.', latest: 'Latest stream', articles: 'articles', source: 'Publisher', allSources: 'All publishers', read: 'Read full article', close: 'Close reader', saved: 'Saved', save: 'Save story', listen: 'Listen', stop: 'Stop', retry: 'Reload full article',
    partial: 'Some publishers are responding slowly; the list shows the sources that loaded successfully.', failed: 'News feeds could not be loaded. Try Refresh again in a few minutes.', readTime: 'min read', updated: 'Updated', fullLoading: 'Fetching and formatting the full article...', fullReady: 'Full article loaded', fallbackReady: 'Showing the best publisher-provided content', fullFailed: 'The publisher temporarily limited full-text extraction. The reader is showing the best content available.',
    featured: 'Featured story', savedPanel: 'Saved stories', activeSources: 'Active publishers', readingDesk: 'Your reading desk', savedOnly: 'Saved stories only', allStories: 'Show all stories', loadMore: 'Load more stories', noSaved: 'No saved stories yet.', contentLabel: 'FULL ARTICLE', feedLabel: 'LATEST', sourceLabel: 'PUBLISHERS', noDistraction: 'No in-article advertising clutter',
    readerNote: 'Article content is fetched from the original page and reformatted for focused reading. Copyright remains with the original publisher.', backToNews: 'Back to news', readerMode: 'FOCUSED READING MODE', related: 'Related stories', lightReader: 'Light', darkReader: 'Dark', backToTop: 'Back to top',
  },
};

const FEED_CACHE_TTL = 10 * 60 * 1000;
const ARTICLE_CACHE_TTL = 6 * 60 * 60 * 1000;
const PAGE_SIZE = 12;

function formatDate(value, language, compact = false) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-GB', compact ? { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' } : { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
function wordCount(text = '') { return String(text || '').trim().split(/\s+/).filter(Boolean).length; }
function readMinutes(item) { const words = Number(item?.wordCount) || wordCount(`${item?.text || ''} ${item?.content || ''} ${item?.summary || ''}`); return Math.max(1, Math.ceil(words / 190)); }
function feedCacheKey(channel, category) { return `bes-news-feed-v2:${channel}:${category}`; }
function articleCacheKey(item) { return `bes-news-full-v2:${item?.id || item?.link || ''}`; }
function getSession(key, ttl) { try { const raw = sessionStorage.getItem(key); const parsed = raw ? JSON.parse(raw) : null; return parsed && Date.now() - parsed.savedAt <= ttl ? parsed.data : null; } catch { return null; } }
function setSession(key, data) { try { sessionStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data })); } catch { /* ignore */ } }
function getSavedItems() { try { const value = JSON.parse(localStorage.getItem('bes-news-saved-items') || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } }
function fallbackBlocks(item) {
  const text = String(item?.content || item?.summary || '').trim();
  let paragraphs = text.split(/\n{2,}/).map((entry) => entry.trim()).filter(Boolean);
  if (paragraphs.length < 2 && text.length > 400) { const sentences = text.match(/[^.!?…]+[.!?…]+(?:[”"']+)?|[^.!?…]+$/g) || [text]; paragraphs = []; for (let index = 0; index < sentences.length; index += 3) paragraphs.push(sentences.slice(index, index + 3).join(' ').trim()); }
  return paragraphs.length ? paragraphs.map((paragraph) => ({ type: 'paragraph', text: paragraph })) : [{ type: 'paragraph', text: item?.summary || item?.title || '' }];
}
function ArticleThumb({ item, eager = false }) { if (item?.image) return <img src={item.image} alt="" loading={eager ? 'eager' : 'lazy'} referrerPolicy="no-referrer" />; return <span className="news-g4-thumb-fallback" aria-hidden="true"><i /><i /><i /><b>NEWS</b></span>; }
function SourceMark({ name = '' }) { const letters = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'NW'; return <span className="news-g4-source-mark" aria-hidden="true">{letters}</span>; }
function headingId(text = '', index = 0) { const clean = String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64); return `news-section-${clean || index}`; }
function ArticleBlocks({ blocks = [] }) {
  return blocks.map((block, index) => {
    const key = `${block.type || 'paragraph'}-${index}-${block.text?.slice(0, 18) || block.src || ''}`;
    if (block.type === 'image' && block.src) return <figure key={key} className="news-g4-reader-figure"><img src={block.src} alt={block.alt || ''} referrerPolicy="no-referrer" />{block.caption ? <figcaption>{block.caption}</figcaption> : null}</figure>;
    if (!block.text) return null;
    if (block.type === 'heading') return <h2 id={headingId(block.text, index)} key={key}>{block.text}</h2>;
    if (block.type === 'quote') return <blockquote key={key}>{block.text}</blockquote>;
    if (block.type === 'list') return <p key={key} className="news-g4-list-line"><span>•</span>{block.text}</p>;
    return <p key={key}>{block.text}</p>;
  });
}

export default function NewsReader({ language = 'vi' }) {
  const t = TEXT[language] || TEXT.vi;
  const [channel, setChannel] = useState('vi');
  const [category, setCategory] = useState('all');
  const [payload, setPayload] = useState({ items: [], sources: [], fetchedAt: null, errors: [], partial: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [source, setSource] = useState('all');
  const [savedItems, setSavedItems] = useState(getSavedItems);
  const [savedOnly, setSavedOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState(null);
  const [articleState, setArticleState] = useState({ status: 'idle', data: null, error: '' });
  const [fontSize, setFontSize] = useState(19);
  const [speaking, setSpeaking] = useState(false);
  const [readerProgress, setReaderProgress] = useState(0);
  const [readerDark, setReaderDark] = useState(false);
  const requestIdRef = useRef(0);
  const articleRequestRef = useRef(0);
  const readerScrollRef = useRef(null);
  const effectiveCategory = CHANNELS[channel].some((item) => item.id === category) ? category : CHANNELS[channel][0].id;

  async function loadNews({ force = false } = {}) {
    const requestId = ++requestIdRef.current;
    setError('');
    if (!force) { const cached = getSession(feedCacheKey(channel, effectiveCategory), FEED_CACHE_TTL); if (cached) { setPayload(cached); setLoading(false); return; } }
    setLoading(true);
    try {
      const response = await fetch(`/api/news-feed?language=${encodeURIComponent(channel)}&category=${encodeURIComponent(effectiveCategory)}${force ? `&t=${Date.now()}` : ''}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      if (requestId !== requestIdRef.current) return;
      setPayload(data); setSession(feedCacheKey(channel, effectiveCategory), data);
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return;
      setPayload({ items: [], sources: [], fetchedAt: null, errors: [], partial: false }); setError(loadError?.message || 'Unable to load news');
    } finally { if (requestId === requestIdRef.current) setLoading(false); }
  }

  async function loadFullArticle(item, { force = false } = {}) {
    const requestId = ++articleRequestRef.current;
    if (!force) { const cached = getSession(articleCacheKey(item), ARTICLE_CACHE_TTL); if (cached?.full && Array.isArray(cached.blocks) && cached.blocks.length) { setArticleState({ status: 'ready', data: cached, error: '' }); return; } }
    setArticleState({ status: 'loading', data: null, error: '' });
    try {
      const response = await fetch('/api/news-article', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: item.link, source: item.source, title: item.title, summary: item.summary, content: item.content, image: item.image, author: item.author, publishedAt: item.publishedAt }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      if (requestId !== articleRequestRef.current) return;
      const normalized = { ...data, title: data.title || item.title, image: data.image || item.image, author: data.author || item.author || item.source, publishedAt: data.publishedAt || item.publishedAt, blocks: Array.isArray(data.blocks) && data.blocks.length ? data.blocks : fallbackBlocks(item), text: data.text || item.content || item.summary || '' };
      if (normalized.full) setSession(articleCacheKey(item), normalized);
      setArticleState({ status: normalized.full ? 'ready' : 'partial', data: normalized, error: normalized.full ? '' : t.fullFailed });
    } catch (loadError) {
      if (requestId !== articleRequestRef.current) return;
      const fallback = { title: item.title, image: item.image, author: item.author || item.source, publishedAt: item.publishedAt, blocks: fallbackBlocks(item), text: item.content || item.summary || '', wordCount: wordCount(item.content || item.summary || ''), readingMinutes: readMinutes(item), full: false, method: 'feed-fallback' };
      setArticleState({ status: 'partial', data: fallback, error: loadError?.message || t.fullFailed });
    }
  }

  useEffect(() => { setCategory(CHANNELS[channel][0].id); setSource('all'); setSavedOnly(false); setVisibleCount(PAGE_SIZE); }, [channel]);
  useEffect(() => { setSource('all'); setVisibleCount(PAGE_SIZE); loadNews(); return () => { requestIdRef.current += 1; }; /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [channel, effectiveCategory]);
  useEffect(() => { if (!selected) return undefined; document.documentElement.classList.add('news-g4-reader-open'); const onEscape = (event) => { if (event.key === 'Escape') closeReader(); }; window.addEventListener('keydown', onEscape); return () => { document.documentElement.classList.remove('news-g4-reader-open'); window.removeEventListener('keydown', onEscape); }; /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [selected]);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const savedIds = useMemo(() => new Set(savedItems.map((item) => item.id)), [savedItems]);
  const filtered = useMemo(() => (payload.items || []).filter((item) => (source === 'all' || item.source === source) && (!savedOnly || savedIds.has(item.id))), [payload.items, source, savedOnly, savedIds]);
  const displayed = filtered.slice(0, visibleCount);
  const lead = filtered[0] || payload.items?.[0] || null;
  const sidebarSaved = savedItems.slice(0, 4);
  const heroSources = payload.sources?.length || 0;
  const readerData = articleState.data;
  const readerBlocks = readerData?.blocks || (selected ? fallbackBlocks(selected) : []);
  const readerMinutes = readerData?.readingMinutes || readMinutes(readerData || selected);
  const relatedItems = useMemo(() => (payload.items || []).filter((item) => item.id !== selected?.id && (item.category === selected?.category || item.source === selected?.source)).slice(0, 5), [payload.items, selected]);

  function switchChannel(next) { setChannel(next); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function openArticle(item) { setSelected(item); setReaderProgress(0); setSpeaking(false); setReaderDark(false); window.speechSynthesis?.cancel(); loadFullArticle(item); requestAnimationFrame(() => readerScrollRef.current?.scrollTo({ top: 0 })); }
  function closeReader() { articleRequestRef.current += 1; setSelected(null); setArticleState({ status: 'idle', data: null, error: '' }); setReaderProgress(0); window.speechSynthesis?.cancel(); setSpeaking(false); }
  function toggleSaved(item) { setSavedItems((current) => { const exists = current.some((entry) => entry.id === item.id); const next = exists ? current.filter((entry) => entry.id !== item.id) : [{ ...item, savedAt: new Date().toISOString() }, ...current].slice(0, 80); try { localStorage.setItem('bes-news-saved-items', JSON.stringify(next)); } catch { /* ignore */ } return next; }); }
  function speakArticle() { if (!selected || !window.speechSynthesis) return; if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; } const text = articleState.data?.text || selected.content || selected.summary || ''; const utterance = new SpeechSynthesisUtterance(`${articleState.data?.title || selected.title}. ${text}`); utterance.lang = channel === 'vi' ? 'vi-VN' : 'en-GB'; utterance.rate = channel === 'vi' ? 1 : 0.88; utterance.onend = () => setSpeaking(false); utterance.onerror = () => setSpeaking(false); window.speechSynthesis.cancel(); window.speechSynthesis.speak(utterance); setSpeaking(true); }
  function handleReaderScroll(event) { const target = event.currentTarget; const available = target.scrollHeight - target.clientHeight; setReaderProgress(available > 0 ? Math.min(100, Math.max(0, (target.scrollTop / available) * 100)) : 100); }

  const reader = selected ? (
    <div className={`news-g4-reader ${readerDark ? 'is-dark' : ''}`} role="dialog" aria-modal="true" aria-label={selected.title}>
      <div className="news-g4-reader-progress"><i style={{ width: `${readerProgress}%` }} /></div>
      <header className="news-g4-reader-appbar">
        <div className="news-g4-reader-appbar-left"><button type="button" className="news-g4-reader-back" onClick={closeReader} aria-label={t.backToNews}>←</button><SourceMark name={selected.source} /><div><small>{t.readerMode}</small><strong>{selected.source}</strong></div></div>
        <div className="news-g4-reader-actions"><button type="button" className={savedIds.has(selected.id) ? 'active' : ''} onClick={() => toggleSaved(selected)}>★ <span>{savedIds.has(selected.id) ? t.saved : t.save}</span></button><button type="button" onClick={speakArticle} disabled={articleState.status === 'loading'}>{speaking ? '■' : '▶'} <span>{speaking ? t.stop : t.listen}</span></button><div className="news-g4-font-control"><button type="button" onClick={() => setFontSize((value) => Math.max(15, value - 1))}>A−</button><b>{fontSize}</b><button type="button" onClick={() => setFontSize((value) => Math.min(28, value + 1))}>A+</button></div><button type="button" onClick={() => setReaderDark((value) => !value)}>{readerDark ? '☀' : '☾'} <span>{readerDark ? t.lightReader : t.darkReader}</span></button><button type="button" className="close" onClick={closeReader} aria-label={t.close}>×</button></div>
      </header>
      <div className="news-g4-reader-scroll" onScroll={handleReaderScroll} ref={readerScrollRef}>
        <div className="news-g4-reader-layout">
          <article className="news-g4-reader-paper" style={{ '--news-reader-size': `${fontSize}px` }}>
            <header className="news-g4-reader-head"><div className="news-g4-reader-meta"><span>{selected.category}</span><b>{formatDate(readerData?.publishedAt || selected.publishedAt, language)}</b><i>{readerMinutes} {t.readTime}</i></div><h1>{readerData?.title || selected.title}</h1>{(readerData?.dek || selected.summary) ? <p>{readerData?.dek || selected.summary}</p> : null}<div className="news-g4-reader-byline"><SourceMark name={selected.source} /><span><strong>{readerData?.author || selected.author || selected.source}</strong><small>{articleState.status === 'ready' ? t.fullReady : articleState.status === 'loading' ? t.fullLoading : t.fallbackReady}</small></span></div>{(readerData?.image || selected.image) ? <figure><img src={readerData?.image || selected.image} alt="" referrerPolicy="no-referrer" /></figure> : null}</header>
            {articleState.status === 'loading' ? <div className="news-g4-reader-loading"><span /><span /><span /><strong>{t.fullLoading}</strong><p>{language === 'vi' ? 'Brian đang tải đồng thời bài gốc và bản đọc tối ưu, sau đó chọn nội dung đầy đủ nhất.' : 'Brian is loading the publisher page and optimized reader in parallel, then selecting the most complete result.'}</p></div> : <>{articleState.status === 'partial' ? <div className="news-g4-reader-notice"><span>!</span><div><strong>{t.fullFailed}</strong><small>{articleState.error}</small></div><button type="button" onClick={() => loadFullArticle(selected, { force: true })}>{t.retry}</button></div> : null}<div className="news-g4-reader-content"><ArticleBlocks blocks={readerBlocks} /></div></>}
            <footer className="news-g4-reader-footer"><SourceMark name={selected.source} /><p>{t.readerNote}</p></footer>
          </article>
          <aside className="news-g4-reader-rail"><section><span className="eyebrow">{t.readerMode}</span><strong>{articleState.status === 'ready' ? t.fullReady : articleState.status === 'loading' ? t.fullLoading : t.fallbackReady}</strong><div><b>{Math.round(readerProgress)}%</b><i><em style={{ width: `${readerProgress}%` }} /></i></div><small>{readerMinutes} {t.readTime} · {readerData?.wordCount || wordCount(readerData?.text || selected.content || selected.summary || '')} words</small></section><section><header><span>↗</span><strong>{t.related}</strong></header><div className="news-g4-reader-related">{relatedItems.map((item) => <button key={item.id} type="button" onClick={() => openArticle(item)}><ArticleThumb item={item} /><span><b>{item.title}</b><small>{item.source}</small></span></button>)}</div></section></aside>
        </div>
      </div>
      {readerProgress > 12 ? <button type="button" className="news-g4-reader-top" onClick={() => readerScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}>↑ <span>{t.backToTop}</span></button> : null}
    </div>
  ) : null;

  return (
    <div className="page newsroom-v823-page news-g4-page">
      <section className="newsroom-v823-hero">
        <div className="newsroom-v823-hero-copy"><span className="newsroom-v823-kicker">{t.kicker}</span><h1>{t.title}</h1><p>{t.subtitle}</p><div className="newsroom-v823-hero-actions"><button type="button" className={channel === 'vi' ? 'primary active' : 'primary'} onClick={() => switchChannel('vi')}><span>VI</span>{t.heroPrimary}</button><button type="button" className={channel === 'en' ? 'secondary active' : 'secondary'} onClick={() => switchChannel('en')}><span>EN</span>{t.heroSecondary}</button></div><div className="newsroom-v823-feature-row"><span><b>✓</b>{t.fullFeature}</span><span><b>◉</b>{t.listenFeature}</span><span><b>★</b>{t.saveFeature}</span></div><div className="newsroom-v823-hero-stats"><div><strong>{payload.items?.length || 0}</strong><span>{t.feedLabel}</span></div><div><strong>{heroSources}</strong><span>{t.sourceLabel}</span></div><div><strong>100%</strong><span>{t.contentLabel}</span></div></div></div>
        <div className="newsroom-v823-hero-art" aria-label={lead?.title || t.featured}><div className="newsroom-v823-paper-stack" aria-hidden="true"><i /><i /><i /></div><button type="button" className="newsroom-v823-hero-story" onClick={() => lead && openArticle(lead)} disabled={!lead}><span className="newsroom-v823-hero-story-media"><ArticleThumb item={lead} eager /><b>{channel === 'vi' ? 'VI' : 'EN'}</b></span><span className="newsroom-v823-hero-story-copy"><small>{lead ? `${lead.source} · ${formatDate(lead.publishedAt, language, true)}` : t.loading}</small><strong>{lead?.title || t.loading}</strong><em>{lead?.summary || t.subtitle}</em><span>{t.read} <b>→</b></span></span></button><div className="newsroom-v823-floating-card card-a"><span>EDU</span><b>{channel === 'vi' ? 'Giáo dục' : 'Education'}</b><small>Live feed</small></div><div className="newsroom-v823-floating-card card-b"><span>AA</span><b>{t.fullFeature}</b><small>{t.noDistraction}</small></div></div>
      </section>

      <section className="news-g4-toolbar"><div className="news-g4-channel-tabs"><button type="button" className={channel === 'vi' ? 'active' : ''} onClick={() => switchChannel('vi')}><span>VI</span>{t.viTab}</button><button type="button" className={channel === 'en' ? 'active' : ''} onClick={() => switchChannel('en')}><span>EN</span>{t.enTab}</button></div><div className="news-g4-category-tabs">{CHANNELS[channel].map((item) => <button key={item.id} type="button" className={effectiveCategory === item.id ? 'active' : ''} onClick={() => setCategory(item.id)}>{item.label}</button>)}</div><div className="news-g4-toolbar-actions"><label><span>{t.source}</span><select value={source} onChange={(event) => setSource(event.target.value)}><option value="all">{t.allSources}</option>{(payload.sources || []).map((name) => <option key={name} value={name}>{name}</option>)}</select></label><button type="button" onClick={() => loadNews({ force: true })} disabled={loading}><span className={loading ? 'is-spinning' : ''}>↻</span>{t.refresh}</button></div></section>
      {payload.partial ? <div className="news-g4-notice warning">{t.partial}</div> : null}{error ? <div className="news-g4-notice error">{t.failed}<small>{error}</small></div> : null}
      <section className="news-g4-workspace">
        <main className="news-g4-feed"><header className="news-g4-feed-head"><div><span>GOOGLE NEWS DESK</span><h2>{savedOnly ? t.savedPanel : t.latest}</h2><p>{loading ? t.loading : `${filtered.length} ${t.articles} · ${payload.fetchedAt ? `${t.updated} ${formatDate(payload.fetchedAt, language, true)}` : ''}`}</p></div><div><button type="button" className={!savedOnly ? 'active' : ''} onClick={() => setSavedOnly(false)}>{t.allStories}</button><button type="button" className={savedOnly ? 'active' : ''} onClick={() => setSavedOnly(true)}>★ {savedItems.length}</button></div></header>
          {loading ? <div className="news-g4-loading"><span /><span /><span /><p>{t.loading}</p></div> : displayed.length ? <div className="news-g4-list">{displayed.map((item, index) => <article key={item.id} className={`news-g4-card ${index === 0 ? 'is-lead' : ''}`}><button type="button" className="news-g4-card-open" onClick={() => openArticle(item)}><span className="news-g4-card-media"><ArticleThumb item={item} /><b>{item.category}</b></span><span className="news-g4-card-copy"><small><SourceMark name={item.source} /><b>{item.source}</b><i>·</i>{formatDate(item.publishedAt, language, true)}</small><strong>{item.title}</strong><em>{item.summary || item.content || t.read}</em><span><i>{readMinutes(item)} {t.readTime}</i><b>{t.read}<span>→</span></b></span></span></button><button type="button" className={`news-g4-save ${savedIds.has(item.id) ? 'active' : ''}`} onClick={() => toggleSaved(item)} aria-label={savedIds.has(item.id) ? t.saved : t.save}>★</button></article>)}{visibleCount < filtered.length ? <button type="button" className="news-g4-load-more" onClick={() => setVisibleCount((value) => value + PAGE_SIZE)}>{t.loadMore}<span>{visibleCount}/{filtered.length}</span></button> : null}</div> : <div className="news-g4-empty"><span>NW</span><h3>{savedOnly ? t.noSaved : t.empty}</h3></div>}
        </main>
        <aside className="news-g4-sidebar"><section className="news-g4-side-card news-g4-featured"><header><span>01</span><div><small>{t.featured}</small><strong>{lead?.source || 'Brian Newsroom'}</strong></div></header>{lead ? <button type="button" onClick={() => openArticle(lead)}><ArticleThumb item={lead} /><b>{lead.title}</b><span>{t.read} →</span></button> : <p>{t.loading}</p>}</section><section className="news-g4-side-card"><header><span>★</span><div><small>{t.readingDesk}</small><strong>{t.savedPanel}</strong></div></header><div className="news-g4-saved-list">{sidebarSaved.length ? sidebarSaved.map((item) => <button key={item.id} type="button" onClick={() => openArticle(item)}><SourceMark name={item.source} /><span><b>{item.title}</b><small>{item.source}</small></span><i>→</i></button>) : <p>{t.noSaved}</p>}</div><button type="button" className="news-g4-side-action" onClick={() => setSavedOnly((value) => !value)}>{savedOnly ? t.allStories : t.savedOnly}</button></section><section className="news-g4-side-card"><header><span>●</span><div><small>{t.sourceLabel}</small><strong>{t.activeSources}</strong></div></header><div className="news-g4-source-list">{(payload.sources || []).map((name) => <button key={name} type="button" className={source === name ? 'active' : ''} onClick={() => setSource(source === name ? 'all' : name)}><SourceMark name={name} /><span>{name}</span><b>{payload.items.filter((item) => item.source === name).length}</b></button>)}</div></section></aside>
      </section>
      {reader && typeof document !== 'undefined' ? createPortal(reader, document.body) : null}
    </div>
  );
}
