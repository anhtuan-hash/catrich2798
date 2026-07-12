import React, { useEffect, useMemo, useRef, useState } from 'react';
import RouteHero from '../components/RouteHero.jsx';

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
    kicker: 'NEWSROOM READER',
    title: 'Đọc báo mỗi ngày',
    subtitle: 'Tin giáo dục Việt Nam và báo tiếng Anh trong một không gian đọc tập trung, rõ nguồn và cập nhật tự động.',
    viTab: 'Tin giáo dục Việt Nam',
    enTab: 'English News',
    search: 'Tìm trong tiêu đề, nội dung hoặc nguồn...',
    refresh: 'Làm mới',
    loading: 'Đang tải các nguồn tin mới nhất...',
    empty: 'Chưa có bài phù hợp với bộ lọc này.',
    latest: 'Bài mới',
    articles: 'bài',
    source: 'Nguồn',
    allSources: 'Tất cả nguồn',
    read: 'Đọc bài',
    original: 'Mở bài gốc',
    close: 'Đóng bài',
    saved: 'Đã lưu',
    save: 'Lưu bài',
    listen: 'Nghe bài',
    stop: 'Dừng đọc',
    feedNote: 'Nội dung tóm tắt được cung cấp bởi RSS của nguồn báo. Bản quyền bài viết thuộc về tòa soạn tương ứng.',
    partial: 'Một vài nguồn đang phản hồi chậm; danh sách dưới đây là dữ liệu đã tải được.',
    failed: 'Không tải được nguồn tin. Hãy nhấn Làm mới sau ít phút.',
    readTime: 'phút đọc',
    updated: 'Cập nhật',
  },
  en: {
    kicker: 'NEWSROOM READER',
    title: 'Daily news reading',
    subtitle: 'Vietnamese education news and English-language reporting in one focused, source-attributed reader.',
    viTab: 'Vietnam Education',
    enTab: 'English News',
    search: 'Search titles, summaries or sources...',
    refresh: 'Refresh',
    loading: 'Loading the latest feeds...',
    empty: 'No articles match the current filters.',
    latest: 'Latest stories',
    articles: 'articles',
    source: 'Source',
    allSources: 'All sources',
    read: 'Read story',
    original: 'Open original',
    close: 'Close story',
    saved: 'Saved',
    save: 'Save story',
    listen: 'Listen',
    stop: 'Stop',
    feedNote: 'Summaries are supplied by each publisher’s RSS feed. Copyright remains with the original newsroom.',
    partial: 'Some publishers are responding slowly; the list shows the sources that loaded successfully.',
    failed: 'News feeds could not be loaded. Try Refresh again in a few minutes.',
    readTime: 'min read',
    updated: 'Updated',
  },
};

const CACHE_TTL = 10 * 60 * 1000;

function formatDate(value, language) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function readMinutes(item) {
  const words = `${item?.content || ''} ${item?.summary || ''}`.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}

function cacheKey(language, category) {
  return `bes-news-feed:${language}:${category}`;
}

function getCached(language, category) {
  try {
    const raw = sessionStorage.getItem(cacheKey(language, category));
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || Date.now() - parsed.savedAt > CACHE_TTL) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function setCached(language, category, data) {
  try {
    sessionStorage.setItem(cacheKey(language, category), JSON.stringify({ savedAt: Date.now(), data }));
  } catch { /* ignore quota */ }
}

function getSavedIds() {
  try {
    const value = JSON.parse(localStorage.getItem('bes-news-saved') || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function ArticleThumb({ item }) {
  if (item.image) return <img src={item.image} alt="" loading="lazy" referrerPolicy="no-referrer" />;
  return <span className="newsroom-thumb-fallback" aria-hidden="true"><i /><i /><i /></span>;
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
  const [selected, setSelected] = useState(null);
  const [savedIds, setSavedIds] = useState(getSavedIds);
  const [fontSize, setFontSize] = useState(18);
  const [speaking, setSpeaking] = useState(false);
  const readerRef = useRef(null);
  const requestIdRef = useRef(0);

  const effectiveCategory = CHANNELS[channel].some((item) => item.id === category)
    ? category
    : CHANNELS[channel][0].id;

  async function loadNews({ force = false } = {}) {
    const requestId = ++requestIdRef.current;
    setError('');
    if (!force) {
      const cached = getCached(channel, effectiveCategory);
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
      setCached(channel, effectiveCategory, data);
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return;
      setPayload({ items: [], sources: [], fetchedAt: null, errors: [], partial: false });
      setError(loadError?.message || 'Unable to load news');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    setCategory(CHANNELS[channel][0].id);
    setSource('all');
    setQuery('');
    setSelected(null);
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, [channel]);

  useEffect(() => {
    setSource('all');
    setSelected(null);
    loadNews();
    return () => {
      requestIdRef.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, effectiveCategory]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (payload.items || []).filter((item) => {
      if (source !== 'all' && item.source !== source) return false;
      if (!needle) return true;
      return `${item.title} ${item.summary} ${item.content} ${item.source}`.toLowerCase().includes(needle);
    });
  }, [payload.items, query, source]);

  function openArticle(item) {
    setSelected(item);
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    requestAnimationFrame(() => readerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function toggleSaved(item) {
    setSavedIds((current) => {
      const next = current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id];
      try { localStorage.setItem('bes-news-saved', JSON.stringify(next)); } catch { /* ignore */ }
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
    const utterance = new SpeechSynthesisUtterance(`${selected.title}. ${selected.content || selected.summary}`);
    utterance.lang = channel === 'vi' ? 'vi-VN' : 'en-GB';
    utterance.rate = channel === 'vi' ? 1 : 0.88;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  return (
    <div className="page newsroom-page">
      <RouteHero
        eyebrow={t.kicker}
        title={t.title}
        description={t.subtitle}
        accent="teal"
        icon="NW"
        className="newsroom-hero"
        tiles={channel === 'vi' ? [
          { title: 'Giáo dục', text: 'Tin tức trong nước', icon: 'VI', tone: 'teal' },
          { title: 'Chính sách', text: 'Cập nhật ngành', icon: 'CS', tone: 'blue' },
          { title: 'Phương pháp', text: 'Góc chuyên môn', icon: 'PP', tone: 'orange' },
          { title: 'Đọc tập trung', text: 'Rõ nguồn · ít nhiễu', icon: 'RD', tone: 'purple' },
        ] : [
          { title: 'Top stories', text: 'Current English news', icon: 'EN', tone: 'teal' },
          { title: 'Education', text: 'Schools and learning', icon: 'ED', tone: 'blue' },
          { title: 'Science', text: 'Ideas and discovery', icon: 'SC', tone: 'orange' },
          { title: 'Listen', text: 'Browser speech mode', icon: 'AU', tone: 'purple' },
        ]}
      />

      <section className="newsroom-mode-switch" aria-label="News language">
        <button type="button" className={channel === 'vi' ? 'active' : ''} onClick={() => setChannel('vi')}>
          <span>VI</span><strong>{t.viTab}</strong>
        </button>
        <button type="button" className={channel === 'en' ? 'active' : ''} onClick={() => setChannel('en')}>
          <span>EN</span><strong>{t.enTab}</strong>
        </button>
      </section>

      <section className="newsroom-toolbar panel">
        <div className="newsroom-category-row">
          {CHANNELS[channel].map((item) => (
            <button key={item.id} type="button" className={effectiveCategory === item.id ? 'active' : ''} onClick={() => setCategory(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="newsroom-filter-row">
          <label className="newsroom-search">
            <span>⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} />
          </label>
          <label className="newsroom-source-filter">
            <span>{t.source}</span>
            <select value={source} onChange={(event) => setSource(event.target.value)}>
              <option value="all">{t.allSources}</option>
              {(payload.sources || []).map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          <button type="button" className="newsroom-refresh" onClick={() => loadNews({ force: true })} disabled={loading}>
            <span className={loading ? 'is-spinning' : ''}>↻</span>{t.refresh}
          </button>
        </div>
      </section>

      {payload.partial ? <div className="newsroom-notice warning">{t.partial}</div> : null}
      {error ? <div className="newsroom-notice error">{t.failed}<small>{error}</small></div> : null}

      <section className="newsroom-feed-panel panel">
        <header className="newsroom-feed-head">
          <div>
            <span className="eyebrow">{channel === 'vi' ? 'VIETNAM EDUCATION' : 'ENGLISH PRESS'}</span>
            <h2>{t.latest}</h2>
          </div>
          <div className="newsroom-feed-count">
            <strong>{filtered.length}</strong>
            <span>{t.articles}</span>
            {payload.fetchedAt ? <small>{t.updated}: {formatDate(payload.fetchedAt, language)}</small> : null}
          </div>
        </header>

        {loading ? (
          <div className="newsroom-loading"><span /><span /><span /><p>{t.loading}</p></div>
        ) : filtered.length ? (
          <div className="newsroom-article-grid">
            {filtered.map((item, index) => (
              <article key={item.id} className={`newsroom-card ${index === 0 ? 'is-lead' : ''}`}>
                <button type="button" className="newsroom-card-open" onClick={() => openArticle(item)}>
                  <span className="newsroom-card-media"><ArticleThumb item={item} /><b>{item.category}</b></span>
                  <span className="newsroom-card-copy">
                    <small>{item.source} · {formatDate(item.publishedAt, language)}</small>
                    <strong>{item.title}</strong>
                    <em>{item.summary || item.content || t.read}</em>
                    <span>{readMinutes(item)} {t.readTime} <i>→</i></span>
                  </span>
                </button>
                <button type="button" className={`newsroom-save-mini ${savedIds.includes(item.id) ? 'active' : ''}`} onClick={() => toggleSaved(item)} aria-label={savedIds.includes(item.id) ? t.saved : t.save}>★</button>
              </article>
            ))}
          </div>
        ) : (
          <div className="newsroom-empty"><span>NW</span><h3>{t.empty}</h3></div>
        )}
      </section>

      {selected ? (
        <section ref={readerRef} className="newsroom-reader panel">
          <header className="newsroom-reader-head">
            <div>
              <span className="eyebrow">{selected.source} · {selected.category}</span>
              <h2>{selected.title}</h2>
              <p>{formatDate(selected.publishedAt, language)} · {readMinutes(selected)} {t.readTime}</p>
            </div>
            <button type="button" className="newsroom-reader-close" onClick={() => { setSelected(null); window.speechSynthesis?.cancel(); setSpeaking(false); }}>×<span>{t.close}</span></button>
          </header>

          <div className="newsroom-reader-controls">
            <button type="button" onClick={() => toggleSaved(selected)} className={savedIds.includes(selected.id) ? 'active' : ''}>★ {savedIds.includes(selected.id) ? t.saved : t.save}</button>
            <button type="button" onClick={speakArticle}>{speaking ? '■' : '▶'} {speaking ? t.stop : t.listen}</button>
            <span className="newsroom-font-control">
              <button type="button" onClick={() => setFontSize((value) => Math.max(15, value - 1))}>A−</button>
              <b>{fontSize}px</b>
              <button type="button" onClick={() => setFontSize((value) => Math.min(26, value + 1))}>A+</button>
            </span>
            <a href={selected.link} target="_blank" rel="noreferrer">{t.original} ↗</a>
          </div>

          {selected.image ? <img className="newsroom-reader-image" src={selected.image} alt="" referrerPolicy="no-referrer" /> : null}
          <div className="newsroom-reader-body" style={{ fontSize: `${fontSize}px` }}>
            {(selected.content || selected.summary || '').split(/\n{2,}/).filter(Boolean).map((paragraph, index) => <p key={`${selected.id}-${index}`}>{paragraph}</p>)}
            {!selected.content && !selected.summary ? <p>{t.empty}</p> : null}
          </div>
          <footer className="newsroom-reader-footer">
            <p>{t.feedNote}</p>
            <a href={selected.link} target="_blank" rel="noreferrer">{t.original} ↗</a>
          </footer>
        </section>
      ) : null}
    </div>
  );
}
