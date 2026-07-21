import React, { useEffect, useMemo, useRef, useState } from 'react';

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
    viTab: 'Báo giáo dục Việt Nam',
    enTab: 'English News',
    heroPrimary: 'Đọc tin Việt Nam',
    heroSecondary: 'Read English news',
    fullFeature: 'Toàn văn trong app',
    listenFeature: 'Nghe bài bằng giọng đọc',
    saveFeature: 'Lưu bài trên thiết bị',
    search: 'Tìm tiêu đề, nội dung hoặc nguồn báo...',
    refresh: 'Làm mới nguồn tin',
    loading: 'Đang tải các nguồn tin mới nhất...',
    empty: 'Chưa có bài phù hợp với bộ lọc này.',
    latest: 'Dòng tin mới',
    articles: 'bài',
    source: 'Nguồn',
    allSources: 'Tất cả nguồn',
    read: 'Đọc toàn văn',
    original: 'Mở bài gốc',
    close: 'Đóng trình đọc',
    saved: 'Đã lưu',
    save: 'Lưu bài',
    listen: 'Nghe bài',
    stop: 'Dừng đọc',
    partial: 'Một vài nguồn đang phản hồi chậm; danh sách dưới đây là dữ liệu đã tải được.',
    failed: 'Không tải được nguồn tin. Hãy nhấn Làm mới sau ít phút.',
    readTime: 'phút đọc',
    updated: 'Cập nhật',
    fullLoading: 'Đang tải và dựng toàn văn bài báo...',
    fullReady: 'Đã tải toàn văn',
    fallbackReady: 'Đang hiển thị nội dung nguồn cung cấp',
    fullFailed: 'Nguồn báo tạm thời chặn việc dựng toàn văn. Bạn vẫn có thể mở bài gốc.',
    featured: 'Bài nổi bật',
    savedPanel: 'Bài đã lưu',
    activeSources: 'Nguồn đang hoạt động',
    readingDesk: 'Bàn đọc cá nhân',
    savedOnly: 'Chỉ xem bài đã lưu',
    allStories: 'Xem tất cả bài',
    loadMore: 'Tải thêm bài',
    noSaved: 'Chưa có bài đã lưu.',
    openSaved: 'Mở bài đã lưu',
    contentLabel: 'TOÀN VĂN',
    feedLabel: 'TIN MỚI',
    sourceLabel: 'NGUỒN BÁO',
    noDistraction: 'Không quảng cáo chen giữa nội dung',
    readerNote: 'Nội dung được tải từ bài gốc và trình bày lại ở chế độ đọc tập trung. Bản quyền bài viết và hình ảnh thuộc tòa soạn tương ứng.',
    backToNews: 'Quay lại dòng tin',
    readerMode: 'CHẾ ĐỘ ĐỌC TẬP TRUNG',
    related: 'Bài liên quan',
    articleOutline: 'Mục lục bài viết',
    noOutline: 'Bài viết không có tiêu đề phụ.',
    appearance: 'Giao diện đọc',
    lightReader: 'Nền sáng',
    darkReader: 'Nền tối',
    backToTop: 'Về đầu bài',
  },
  en: {
    kicker: 'BRIAN NEWSROOM · FULL ARTICLE READER',
    title: 'Read the news. Widen your view.',
    subtitle: 'Vietnamese education reporting and English-language news in one focused reader. Open any story to fetch the full article without leaving Brian English.',
    viTab: 'Vietnam Education',
    enTab: 'English News',
    heroPrimary: 'Vietnamese news',
    heroSecondary: 'Read English news',
    fullFeature: 'Full article in app',
    listenFeature: 'Browser text-to-speech',
    saveFeature: 'Save stories locally',
    search: 'Search titles, content or publishers...',
    refresh: 'Refresh feeds',
    loading: 'Loading the latest feeds...',
    empty: 'No stories match the current filters.',
    latest: 'Latest stream',
    articles: 'articles',
    source: 'Publisher',
    allSources: 'All publishers',
    read: 'Read full article',
    original: 'Open original',
    close: 'Close reader',
    saved: 'Saved',
    save: 'Save story',
    listen: 'Listen',
    stop: 'Stop',
    partial: 'Some publishers are responding slowly; the list shows the sources that loaded successfully.',
    failed: 'News feeds could not be loaded. Try Refresh again in a few minutes.',
    readTime: 'min read',
    updated: 'Updated',
    fullLoading: 'Fetching and formatting the full article...',
    fullReady: 'Full article loaded',
    fallbackReady: 'Showing publisher-provided content',
    fullFailed: 'The publisher temporarily blocked full-text extraction. The original story is still available.',
    featured: 'Featured story',
    savedPanel: 'Saved stories',
    activeSources: 'Active publishers',
    readingDesk: 'Your reading desk',
    savedOnly: 'Saved stories only',
    allStories: 'Show all stories',
    loadMore: 'Load more stories',
    noSaved: 'No saved stories yet.',
    openSaved: 'Open saved story',
    contentLabel: 'FULL ARTICLE',
    feedLabel: 'LATEST',
    sourceLabel: 'PUBLISHERS',
    noDistraction: 'No in-article advertising clutter',
    readerNote: 'Article content is fetched from the original page and reformatted for focused reading. Copyright remains with the original publisher.',
    backToNews: 'Back to news',
    readerMode: 'FOCUSED READING MODE',
    related: 'Related stories',
    articleOutline: 'Article outline',
    noOutline: 'This article has no section headings.',
    appearance: 'Reading appearance',
    lightReader: 'Light',
    darkReader: 'Dark',
    backToTop: 'Back to top',
  },
};

const FEED_CACHE_TTL = 10 * 60 * 1000;
const ARTICLE_CACHE_TTL = 6 * 60 * 60 * 1000;
const PAGE_SIZE = 14;

function formatDate(value, language, compact = false) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-GB', compact ? {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  } : {
    dateStyle: 'medium', timeStyle: 'short',
  }).format(date);
}

function wordCount(text = '') {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

function readMinutes(item) {
  const words = Number(item?.wordCount) || wordCount(`${item?.text || ''} ${item?.content || ''} ${item?.summary || ''}`);
  return Math.max(1, Math.ceil(words / 190));
}

function feedCacheKey(language, category) {
  return `bes-news-feed:${language}:${category}`;
}

function articleCacheKey(item) {
  return `bes-news-full:${item?.id || item?.link || ''}`;
}

function getCachedFeed(language, category) {
  try {
    const raw = sessionStorage.getItem(feedCacheKey(language, category));
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || Date.now() - parsed.savedAt > FEED_CACHE_TTL) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function setCachedFeed(language, category, data) {
  try {
    sessionStorage.setItem(feedCacheKey(language, category), JSON.stringify({ savedAt: Date.now(), data }));
  } catch { /* ignore quota */ }
}

function getCachedArticle(item) {
  try {
    const raw = sessionStorage.getItem(articleCacheKey(item));
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || Date.now() - parsed.savedAt > ARTICLE_CACHE_TTL) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function setCachedArticle(item, data) {
  try {
    sessionStorage.setItem(articleCacheKey(item), JSON.stringify({ savedAt: Date.now(), data }));
  } catch { /* ignore quota */ }
}

function getSavedItems() {
  try {
    const value = JSON.parse(localStorage.getItem('bes-news-saved-items') || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function fallbackBlocks(item) {
  const text = String(item?.content || item?.summary || '').trim();
  const paragraphs = text.split(/\n{2,}/).map((entry) => entry.trim()).filter(Boolean);
  return paragraphs.length
    ? paragraphs.map((paragraph) => ({ type: 'paragraph', text: paragraph }))
    : [{ type: 'paragraph', text: item?.summary || item?.title || '' }];
}

function ArticleThumb({ item, eager = false }) {
  if (item?.image) return <img src={item.image} alt="" loading={eager ? 'eager' : 'lazy'} referrerPolicy="no-referrer" />;
  return <span className="newsroom-v823-thumb-fallback" aria-hidden="true"><i /><i /><i /><b>NEWS</b></span>;
}

function SourceMark({ name = '' }) {
  const letters = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'NW';
  return <span className="newsroom-v823-source-mark" aria-hidden="true">{letters}</span>;
}

function headingId(text = '', index = 0) {
  const clean = String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return `news-section-${clean || index}`;
}

function ArticleBlocks({ blocks = [] }) {
  return blocks.map((block, index) => {
    const key = `${block.type || 'paragraph'}-${index}-${block.text?.slice(0, 18) || block.src || ''}`;
    if (block.type === 'image' && block.src) {
      return (
        <figure key={key} className="newsroom-v823-reader-figure">
          <img src={block.src} alt={block.alt || ''} referrerPolicy="no-referrer" />
          {block.caption ? <figcaption>{block.caption}</figcaption> : null}
        </figure>
      );
    }
    if (!block.text) return null;
    if (block.type === 'heading') return <h3 id={headingId(block.text, index)} key={key}>{block.text}</h3>;
    if (block.type === 'quote') return <blockquote key={key}>{block.text}</blockquote>;
    if (block.type === 'list') return <p key={key} className="newsroom-v823-list-line"><span>•</span>{block.text}</p>;
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
  const [query, setQuery] = useState('');
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
  const readerBodyRef = useRef(null);

  const effectiveCategory = CHANNELS[channel].some((item) => item.id === category)
    ? category
    : CHANNELS[channel][0].id;

  async function loadNews({ force = false } = {}) {
    const requestId = ++requestIdRef.current;
    setError('');
    if (!force) {
      const cached = getCachedFeed(channel, effectiveCategory);
      if (cached) {
        setPayload(cached);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/news-feed?language=${encodeURIComponent(channel)}&category=${encodeURIComponent(effectiveCategory)}${force ? `&t=${Date.now()}` : ''}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      if (requestId !== requestIdRef.current) return;
      setPayload(data);
      setCachedFeed(channel, effectiveCategory, data);
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return;
      setPayload({ items: [], sources: [], fetchedAt: null, errors: [], partial: false });
      setError(loadError?.message || 'Unable to load news');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }

  async function loadFullArticle(item) {
    const requestId = ++articleRequestRef.current;
    const cached = getCachedArticle(item);
    if (cached) {
      setArticleState({ status: 'ready', data: cached, error: '' });
      return;
    }

    setArticleState({ status: 'loading', data: null, error: '' });
    try {
      const response = await fetch(`/api/news-article?url=${encodeURIComponent(item.link)}&source=${encodeURIComponent(item.source || '')}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      if (requestId !== articleRequestRef.current) return;
      const normalized = {
        ...data,
        title: data.title || item.title,
        image: data.image || item.image,
        publishedAt: data.publishedAt || item.publishedAt,
        blocks: Array.isArray(data.blocks) && data.blocks.length ? data.blocks : fallbackBlocks(item),
        text: data.text || item.content || item.summary || '',
      };
      setCachedArticle(item, normalized);
      setArticleState({ status: 'ready', data: normalized, error: '' });
    } catch (loadError) {
      if (requestId !== articleRequestRef.current) return;
      const fallback = {
        title: item.title,
        image: item.image,
        publishedAt: item.publishedAt,
        blocks: fallbackBlocks(item),
        text: item.content || item.summary || '',
        wordCount: wordCount(item.content || item.summary || ''),
        readingMinutes: readMinutes(item),
        full: false,
        method: 'feed-fallback',
      };
      setArticleState({ status: 'fallback', data: fallback, error: loadError?.message || 'Full article unavailable' });
    }
  }

  useEffect(() => {
    setCategory(CHANNELS[channel][0].id);
    setSource('all');
    setQuery('');
    setSavedOnly(false);
    setVisibleCount(PAGE_SIZE);
  }, [channel]);

  useEffect(() => {
    setSource('all');
    setVisibleCount(PAGE_SIZE);
    loadNews();
    return () => { requestIdRef.current += 1; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, effectiveCategory]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, source, savedOnly]);

  useEffect(() => {
    if (!selected) return undefined;
    document.documentElement.classList.add('newsroom-reader-open');
    const onEscape = (event) => {
      if (event.key === 'Escape') closeReader();
    };
    window.addEventListener('keydown', onEscape);
    return () => {
      document.documentElement.classList.remove('newsroom-reader-open');
      window.removeEventListener('keydown', onEscape);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const savedIds = useMemo(() => new Set(savedItems.map((item) => item.id)), [savedItems]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (payload.items || []).filter((item) => {
      if (source !== 'all' && item.source !== source) return false;
      if (savedOnly && !savedIds.has(item.id)) return false;
      if (!needle) return true;
      return `${item.title} ${item.summary} ${item.content} ${item.source}`.toLowerCase().includes(needle);
    });
  }, [payload.items, query, source, savedOnly, savedIds]);

  const lead = filtered[0] || payload.items?.[0] || null;
  const displayed = filtered.slice(0, visibleCount);
  const sidebarSaved = savedItems.slice(0, 4);
  const heroSources = payload.sources?.length || 0;

  function switchChannel(next) {
    setChannel(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openArticle(item) {
    setSelected(item);
    setReaderProgress(0);
    setSpeaking(false);
    setReaderDark(false);
    window.speechSynthesis?.cancel();
    loadFullArticle(item);
  }

  function closeReader() {
    articleRequestRef.current += 1;
    setSelected(null);
    setArticleState({ status: 'idle', data: null, error: '' });
    setReaderProgress(0);
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }

  function toggleSaved(item) {
    setSavedItems((current) => {
      const exists = current.some((entry) => entry.id === item.id);
      const next = exists ? current.filter((entry) => entry.id !== item.id) : [{ ...item, savedAt: new Date().toISOString() }, ...current].slice(0, 80);
      try { localStorage.setItem('bes-news-saved-items', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  function speakArticle() {
    if (!selected || !window.speechSynthesis) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const text = articleState.data?.text || selected.content || selected.summary || '';
    const utterance = new SpeechSynthesisUtterance(`${articleState.data?.title || selected.title}. ${text}`);
    utterance.lang = channel === 'vi' ? 'vi-VN' : 'en-GB';
    utterance.rate = channel === 'vi' ? 1 : 0.88;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  function handleReaderScroll(event) {
    const target = event.currentTarget;
    const available = target.scrollHeight - target.clientHeight;
    setReaderProgress(available > 0 ? Math.min(100, Math.max(0, (target.scrollTop / available) * 100)) : 100);
  }

  const readerData = articleState.data;
  const readerMinutes = readerData?.readingMinutes || readMinutes(readerData || selected);
  const readerBlocks = readerData?.blocks || (selected ? fallbackBlocks(selected) : []);
  const readerOutline = useMemo(() => readerBlocks
    .map((block, index) => block?.type === 'heading' && block?.text ? ({ id: headingId(block.text, index), text: block.text }) : null)
    .filter(Boolean), [readerBlocks]);
  const relatedItems = useMemo(() => (payload.items || [])
    .filter((item) => item.id !== selected?.id && (item.category === selected?.category || item.source === selected?.source))
    .slice(0, 5), [payload.items, selected]);

  function scrollReaderToTop() {
    readerBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function scrollReaderToSection(id) {
    const container = readerBodyRef.current;
    const target = container?.querySelector(`#${id}`);
    if (!container || !target) return;
    container.scrollTo({ top: Math.max(0, target.offsetTop - 88), behavior: 'smooth' });
  }

  return (
    <div className="page newsroom-v823-page">
      <section className="newsroom-v823-hero">
        <div className="newsroom-v823-hero-copy">
          <span className="newsroom-v823-kicker">{t.kicker}</span>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
          <div className="newsroom-v823-hero-actions">
            <button type="button" className={channel === 'vi' ? 'primary active' : 'primary'} onClick={() => switchChannel('vi')}>
              <span>VI</span>{t.heroPrimary}
            </button>
            <button type="button" className={channel === 'en' ? 'secondary active' : 'secondary'} onClick={() => switchChannel('en')}>
              <span>EN</span>{t.heroSecondary}
            </button>
          </div>
          <div className="newsroom-v823-feature-row">
            <span><b>✓</b>{t.fullFeature}</span>
            <span><b>◉</b>{t.listenFeature}</span>
            <span><b>★</b>{t.saveFeature}</span>
          </div>
          <div className="newsroom-v823-hero-stats">
            <div><strong>{payload.items?.length || 0}</strong><span>{t.feedLabel}</span></div>
            <div><strong>{heroSources}</strong><span>{t.sourceLabel}</span></div>
            <div><strong>100%</strong><span>{t.contentLabel}</span></div>
          </div>
        </div>

        <div className="newsroom-v823-hero-art" aria-label={lead?.title || t.featured}>
          <div className="newsroom-v823-paper-stack" aria-hidden="true"><i /><i /><i /></div>
          <button type="button" className="newsroom-v823-hero-story" onClick={() => lead && openArticle(lead)} disabled={!lead}>
            <span className="newsroom-v823-hero-story-media"><ArticleThumb item={lead} eager /><b>{channel === 'vi' ? 'VI' : 'EN'}</b></span>
            <span className="newsroom-v823-hero-story-copy">
              <small>{lead ? `${lead.source} · ${formatDate(lead.publishedAt, language, true)}` : t.loading}</small>
              <strong>{lead?.title || t.loading}</strong>
              <em>{lead?.summary || t.subtitle}</em>
              <span>{t.read} <b>→</b></span>
            </span>
          </button>
          <div className="newsroom-v823-floating-card card-a"><span>EDU</span><b>{channel === 'vi' ? 'Giáo dục' : 'Education'}</b><small>Live feed</small></div>
          <div className="newsroom-v823-floating-card card-b"><span>AA</span><b>{t.fullFeature}</b><small>{t.noDistraction}</small></div>
        </div>
      </section>

      <section className="newsroom-v823-command panel">
        <div className="newsroom-v823-channel-tabs" aria-label="News language">
          <button type="button" className={channel === 'vi' ? 'active' : ''} onClick={() => switchChannel('vi')}><span>VI</span><b>{t.viTab}</b></button>
          <button type="button" className={channel === 'en' ? 'active' : ''} onClick={() => switchChannel('en')}><span>EN</span><b>{t.enTab}</b></button>
        </div>
        <div className="newsroom-v823-category-tabs">
          {CHANNELS[channel].map((item) => (
            <button key={item.id} type="button" className={effectiveCategory === item.id ? 'active' : ''} onClick={() => setCategory(item.id)}>{item.label}</button>
          ))}
        </div>
        <div className="newsroom-v823-filter-row">
          <label className="newsroom-v823-search">
            <span>⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} />
            {query ? <button type="button" onClick={() => setQuery('')} aria-label="Clear search">×</button> : null}
          </label>
          <label className="newsroom-v823-source-filter">
            <span>{t.source}</span>
            <select value={source} onChange={(event) => setSource(event.target.value)}>
              <option value="all">{t.allSources}</option>
              {(payload.sources || []).map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          <button type="button" className="newsroom-v823-refresh" onClick={() => loadNews({ force: true })} disabled={loading}>
            <span className={loading ? 'is-spinning' : ''}>↻</span>{t.refresh}
          </button>
        </div>
      </section>

      {payload.partial ? <div className="newsroom-v823-notice warning">{t.partial}</div> : null}
      {error ? <div className="newsroom-v823-notice error">{t.failed}<small>{error}</small></div> : null}

      <section className="newsroom-v823-layout">
        <main className="newsroom-v823-feed panel">
          <header className="newsroom-v823-feed-head">
            <div>
              <span className="eyebrow">{channel === 'vi' ? 'VIETNAM EDUCATION DESK' : 'ENGLISH NEWS DESK'}</span>
              <h2>{savedOnly ? t.savedPanel : t.latest}</h2>
              <p>{loading ? t.loading : `${filtered.length} ${t.articles} · ${payload.fetchedAt ? `${t.updated} ${formatDate(payload.fetchedAt, language, true)}` : ''}`}</p>
            </div>
            <div className="newsroom-v823-view-toggle">
              <button type="button" className={!savedOnly ? 'active' : ''} onClick={() => setSavedOnly(false)}>{t.allStories}</button>
              <button type="button" className={savedOnly ? 'active' : ''} onClick={() => setSavedOnly(true)}>★ {savedItems.length}</button>
            </div>
          </header>

          {loading ? (
            <div className="newsroom-v823-loading"><span /><span /><span /><p>{t.loading}</p></div>
          ) : displayed.length ? (
            <div className="newsroom-v823-story-list">
              {displayed.map((item, index) => (
                <article key={item.id} className={`newsroom-v823-story ${index === 0 ? 'is-lead' : ''}`}>
                  <button type="button" className="newsroom-v823-story-open" onClick={() => openArticle(item)}>
                    <span className="newsroom-v823-story-media"><ArticleThumb item={item} /><b>{item.category}</b></span>
                    <span className="newsroom-v823-story-copy">
                      <small><SourceMark name={item.source} />{item.source}<i>·</i>{formatDate(item.publishedAt, language, true)}</small>
                      <strong>{item.title}</strong>
                      <em>{item.summary || item.content || t.read}</em>
                      <span>{readMinutes(item)} {t.readTime}<b>{t.read} →</b></span>
                    </span>
                  </button>
                  <button type="button" className={`newsroom-v823-save ${savedIds.has(item.id) ? 'active' : ''}`} onClick={() => toggleSaved(item)} aria-label={savedIds.has(item.id) ? t.saved : t.save}>★</button>
                </article>
              ))}
              {visibleCount < filtered.length ? <button type="button" className="newsroom-v823-load-more" onClick={() => setVisibleCount((value) => value + PAGE_SIZE)}>{t.loadMore}<span>{visibleCount}/{filtered.length}</span></button> : null}
            </div>
          ) : (
            <div className="newsroom-v823-empty"><span>NW</span><h3>{savedOnly ? t.noSaved : t.empty}</h3></div>
          )}
        </main>

        <aside className="newsroom-v823-sidebar">
          <section className="newsroom-v823-side-card newsroom-v823-featured-card">
            <header><span>01</span><div><small>{t.featured}</small><strong>{lead?.source || 'Brian Newsroom'}</strong></div></header>
            {lead ? <button type="button" onClick={() => openArticle(lead)}><ArticleThumb item={lead} /><b>{lead.title}</b><span>{t.read} →</span></button> : <p>{t.loading}</p>}
          </section>

          <section className="newsroom-v823-side-card">
            <header><span>★</span><div><small>{t.readingDesk}</small><strong>{t.savedPanel}</strong></div></header>
            <div className="newsroom-v823-saved-list">
              {sidebarSaved.length ? sidebarSaved.map((item) => (
                <button key={item.id} type="button" onClick={() => openArticle(item)}><SourceMark name={item.source} /><span><b>{item.title}</b><small>{item.source}</small></span><i>→</i></button>
              )) : <p>{t.noSaved}</p>}
            </div>
            <button type="button" className="newsroom-v823-side-action" onClick={() => setSavedOnly((value) => !value)}>{savedOnly ? t.allStories : t.savedOnly}</button>
          </section>

          <section className="newsroom-v823-side-card">
            <header><span>●</span><div><small>{t.sourceLabel}</small><strong>{t.activeSources}</strong></div></header>
            <div className="newsroom-v823-source-list">
              {(payload.sources || []).map((name) => <button key={name} type="button" className={source === name ? 'active' : ''} onClick={() => setSource(source === name ? 'all' : name)}><SourceMark name={name} /><span>{name}</span><b>{payload.items.filter((item) => item.source === name).length}</b></button>)}
            </div>
          </section>
        </aside>
      </section>

      {selected ? (
        <div className={`newsroom-v824-reader-screen ${readerDark ? 'is-dark' : ''}`} role="dialog" aria-modal="true" aria-label={selected.title}>
          <div className="newsroom-v824-reader-progress"><i style={{ width: `${readerProgress}%` }} /></div>

          <header className="newsroom-v824-reader-toolbar">
            <div className="newsroom-v824-reader-toolbar-left">
              <button type="button" className="newsroom-v824-reader-back" onClick={closeReader}>
                <span aria-hidden="true">←</span><b>{t.backToNews}</b>
              </button>
              <div className="newsroom-v824-reader-source">
                <SourceMark name={selected.source} />
                <span>
                  <small>{t.readerMode}</small>
                  <strong>{selected.source}</strong>
                </span>
              </div>
            </div>

            <div className="newsroom-v824-reader-toolbar-actions">
              <div className="newsroom-v824-reader-action-group">
                <button type="button" onClick={() => toggleSaved(selected)} className={savedIds.has(selected.id) ? 'active' : ''} title={savedIds.has(selected.id) ? t.saved : t.save}>★ <span>{savedIds.has(selected.id) ? t.saved : t.save}</span></button>
                <button type="button" onClick={speakArticle} disabled={articleState.status === 'loading'} title={speaking ? t.stop : t.listen}>{speaking ? '■' : '▶'} <span>{speaking ? t.stop : t.listen}</span></button>
              </div>
              <div className="newsroom-v824-reader-action-group newsroom-v824-reader-font-control" aria-label={t.appearance}>
                <button type="button" onClick={() => setFontSize((value) => Math.max(15, value - 1))} aria-label="Decrease font size">A−</button>
                <b>{fontSize}</b>
                <button type="button" onClick={() => setFontSize((value) => Math.min(28, value + 1))} aria-label="Increase font size">A+</button>
              </div>
              <div className="newsroom-v824-reader-action-group">
                <button type="button" className={readerDark ? 'active' : ''} onClick={() => setReaderDark((value) => !value)} title={readerDark ? t.lightReader : t.darkReader}>{readerDark ? '☀' : '☾'} <span>{readerDark ? t.lightReader : t.darkReader}</span></button>
                <a href={selected.link} target="_blank" rel="noreferrer">↗ <span>{t.original}</span></a>
                <button type="button" className="close" onClick={closeReader} aria-label={t.close}>×</button>
              </div>
            </div>
          </header>

          <div className="newsroom-v824-reader-scroll" onScroll={handleReaderScroll} ref={readerBodyRef}>
            <div className="newsroom-v824-reader-workspace">
              <article className="newsroom-v824-reader-article" style={{ '--reader-font-size': `${fontSize}px` }}>
                <header className="newsroom-v824-reader-article-head">
                  <div className="newsroom-v824-reader-meta">
                    <span>{selected.category}</span>
                    <b>{formatDate(readerData?.publishedAt || selected.publishedAt, language)}</b>
                    <i>{readerMinutes} {t.readTime}</i>
                  </div>
                  <h1>{readerData?.title || selected.title}</h1>
                  {readerData?.dek ? <p className="newsroom-v824-reader-dek">{readerData.dek}</p> : selected.summary ? <p className="newsroom-v824-reader-dek">{selected.summary}</p> : null}
                  <div className="newsroom-v824-reader-byline">
                    <div><SourceMark name={selected.source} /><span><strong>{readerData?.author || selected.source}</strong><small>{articleState.status === 'loading' ? t.fullLoading : articleState.status === 'ready' && readerData?.full ? t.fullReady : t.fallbackReady}</small></span></div>
                    <button type="button" onClick={speakArticle} disabled={articleState.status === 'loading'}>{speaking ? '■' : '▶'} {speaking ? t.stop : t.listen}</button>
                  </div>
                  {(readerData?.image || selected.image) ? <figure className="newsroom-v824-reader-cover"><img src={readerData?.image || selected.image} alt="" referrerPolicy="no-referrer" /></figure> : null}
                </header>

                {articleState.status === 'loading' ? (
                  <div className="newsroom-v824-full-loading"><span /><span /><span /><strong>{t.fullLoading}</strong><p>{language === 'vi' ? 'Hệ thống đang đọc bài gốc, lọc phần thừa và dựng lại nội dung.' : 'The app is reading the original page, removing clutter and rebuilding the article.'}</p></div>
                ) : (
                  <>
                    {articleState.status === 'fallback' ? <div className="newsroom-v824-reader-warning"><b>!</b><span><strong>{t.fullFailed}</strong><small>{articleState.error}</small></span><a href={selected.link} target="_blank" rel="noreferrer">{t.original} ↗</a></div> : null}
                    <div className="newsroom-v824-reader-content"><ArticleBlocks blocks={readerBlocks} /></div>
                  </>
                )}

                <footer className="newsroom-v824-reader-footer">
                  <div><SourceMark name={selected.source} /><p>{t.readerNote}</p></div>
                  <a href={selected.link} target="_blank" rel="noreferrer">{t.original} ↗</a>
                </footer>
              </article>

              <aside className="newsroom-v824-reader-rail" aria-label={t.readingDesk}>
                <section className="newsroom-v824-reader-rail-card newsroom-v824-reader-status-card">
                  <span className="eyebrow">{t.readerMode}</span>
                  <strong>{articleState.status === 'loading' ? t.fullLoading : articleState.status === 'ready' && readerData?.full ? t.fullReady : t.fallbackReady}</strong>
                  <div><span>{readerProgress < 1 ? 0 : Math.round(readerProgress)}%</span><i><b style={{ width: `${readerProgress}%` }} /></i></div>
                  <small>{readerMinutes} {t.readTime} · {readerData?.wordCount || wordCount(readerData?.text || selected.content || selected.summary || '')} words</small>
                </section>

                <section className="newsroom-v824-reader-rail-card">
                  <header><span>☷</span><strong>{t.articleOutline}</strong></header>
                  <div className="newsroom-v824-reader-outline">
                    {readerOutline.length ? readerOutline.map((item, index) => (
                      <button key={item.id} type="button" onClick={() => scrollReaderToSection(item.id)}><span>{String(index + 1).padStart(2, '0')}</span><b>{item.text}</b></button>
                    )) : <p>{t.noOutline}</p>}
                  </div>
                </section>

                <section className="newsroom-v824-reader-rail-card">
                  <header><span>↗</span><strong>{t.related}</strong></header>
                  <div className="newsroom-v824-reader-related">
                    {relatedItems.length ? relatedItems.map((item) => (
                      <button key={item.id} type="button" onClick={() => openArticle(item)}>
                        <ArticleThumb item={item} />
                        <span><b>{item.title}</b><small>{item.source} · {readMinutes(item)} {t.readTime}</small></span>
                      </button>
                    )) : <p>{t.empty}</p>}
                  </div>
                </section>
              </aside>
            </div>
          </div>

          {readerProgress > 12 ? <button type="button" className="newsroom-v824-reader-top" onClick={scrollReaderToTop}>↑ <span>{t.backToTop}</span></button> : null}
        </div>
      ) : null}
    </div>
  );
}
