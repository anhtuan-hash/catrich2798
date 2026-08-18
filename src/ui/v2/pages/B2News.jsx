import React, { useEffect, useMemo, useRef, useState } from 'react';
import { B2Badge, B2Button, B2PageHeader, B2SearchBox, B2SectionHeader, B2Surface, B2Tabs } from '../components/B2UI.jsx';
import { B2Status } from '../components/B2Data.jsx';
import './B2SystemWorkspaces.css';
import './B2NewsCloud.css';

const CACHE_TTL = 5 * 60 * 1000;
const memoryCache = new Map();

const CATEGORIES = {
  vi: [
    { id: 'all', label: 'Tất cả' },
    { id: 'policy', label: 'Chính sách' },
    { id: 'teaching', label: 'Phương pháp' },
    { id: 'school', label: 'Học đường' },
  ],
  en: [
    { id: 'top', label: 'Top Stories' },
    { id: 'education', label: 'Education' },
    { id: 'science', label: 'Science' },
    { id: 'learning', label: 'Learning English' },
  ],
};

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatPublished(value, language) {
  if (!value) return 'Chưa có thời gian';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function cacheKey(language, category) {
  return `${language}:${category}`;
}

async function loadFeed(language, category, signal, force = false) {
  const key = cacheKey(language, category);
  const cached = memoryCache.get(key);
  if (!force && cached && Date.now() - cached.at < CACHE_TTL) return cached.payload;
  const params = new URLSearchParams({ language, category });
  const response = await fetch(`/api/news-feed?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!response.ok) throw new Error(`News feed HTTP ${response.status}`);
  const payload = await response.json();
  memoryCache.set(key, { at: Date.now(), payload });
  return payload;
}

export default function B2News({ navigate }) {
  const [language, setLanguage] = useState('vi');
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const forceNextRef = useRef(false);

  useEffect(() => {
    const nextDefault = language === 'en' ? 'top' : 'all';
    if (!CATEGORIES[language].some((item) => item.id === category)) setCategory(nextDefault);
  }, [category, language]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError('');
    const force = forceNextRef.current;
    forceNextRef.current = false;
    loadFeed(language, category, controller.signal, force)
      .then((next) => {
        if (!active) return;
        setPayload(next);
      })
      .catch((reason) => {
        if (!active || reason?.name === 'AbortError') return;
        setError(reason?.message || 'Không thể tải nguồn tin hiện tại.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [category, language, refreshToken]);

  const items = safeArray(payload?.items);
  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase(language === 'vi' ? 'vi' : 'en');
    if (!q) return items;
    return items.filter((item) => `${item.title || ''} ${item.summary || ''} ${item.source || ''} ${item.category || ''}`.toLocaleLowerCase(language === 'vi' ? 'vi' : 'en').includes(q));
  }, [items, language, query]);
  const sources = safeArray(payload?.sources);
  const errors = safeArray(payload?.errors);

  const refresh = () => {
    forceNextRef.current = true;
    setRefreshToken((value) => value + 1);
  };

  return <>
    <B2PageHeader
      eyebrow="TEACH · LIVE READING FEED"
      title="News & Reading"
      description="Không gian đọc tin riêng của Metro Next. Dữ liệu lấy trực tiếp từ News Feed hiện hữu; không chạy ticker, thời tiết hay bộ đếm nền toàn cục."
      actions={<>
        <B2Button variant="primary" onClick={() => navigate?.('tool/reading-studio')}>Mở Reading Studio</B2Button>
        <B2Button onClick={refresh} disabled={loading}>{loading ? 'Đang tải…' : 'Làm mới'}</B2Button>
      </>}
      aside={<B2Badge tone={payload?.partial ? 'amber' : error ? 'red' : 'green'}>{payload?.partial ? 'PARTIAL FEED' : error ? 'FEED ERROR' : 'LIVE RSS'}</B2Badge>}
    />

    <section className="b2-news-toolbar" aria-label="Bộ lọc News & Reading">
      <div className="b2-news-language" role="group" aria-label="Ngôn ngữ nguồn tin">
        <button type="button" className={language === 'vi' ? 'is-active' : ''} onClick={() => { setLanguage('vi'); setCategory('all'); }}>Tiếng Việt</button>
        <button type="button" className={language === 'en' ? 'is-active' : ''} onClick={() => { setLanguage('en'); setCategory('top'); }}>English</button>
      </div>
      <B2Tabs items={CATEGORIES[language]} value={category} onChange={setCategory} />
      <B2SearchBox value={query} onChange={setQuery} placeholder="Tìm trong nguồn tin hiện tại…" />
    </section>

    <section className="b2-news-layout">
      <div>
        <B2SectionHeader
          eyebrow={language === 'en' ? 'READING FEED' : 'BẢN TIN GIÁO DỤC'}
          title={loading ? 'Đang đồng bộ nguồn tin…' : `${visible.length} bài đang hiển thị`}
          description={payload?.fetchedAt ? `Nguồn cập nhật: ${formatPublished(payload.fetchedAt, language)}` : 'Chỉ hiển thị dữ liệu News Feed nhận được từ server.'}
        />
        {error ? <div className="b2-news-message is-error" role="alert"><strong>Không tải được News Feed</strong><span>{error}</span><B2Button onClick={refresh}>Thử lại</B2Button></div> : null}
        {!error && loading ? <div className="b2-news-skeleton" aria-live="polite" aria-busy="true">{Array.from({ length: 6 }, (_, index) => <span key={index} />)}</div> : null}
        {!error && !loading && visible.length ? <div className="b2-news-list">
          {visible.map((item) => (
            <article className="b2-news-card" key={item.id || item.link}>
              <div className="b2-news-card__meta"><B2Badge tone="blue">{item.source || 'News'}</B2Badge><span>{item.category || ''}</span><time dateTime={item.publishedAt || undefined}>{formatPublished(item.publishedAt, language)}</time></div>
              <h2>{item.title}</h2>
              {item.summary ? <p>{item.summary}</p> : null}
              <footer>
                <span>{item.author || 'Nguồn RSS'}</span>
                <a href={item.link} target="_blank" rel="noopener noreferrer">Đọc bài gốc <span aria-hidden="true">↗</span></a>
              </footer>
            </article>
          ))}
        </div> : null}
        {!error && !loading && !visible.length ? <div className="b2-system-empty"><div><strong>Không có bài phù hợp</strong><p>Không tạo dữ liệu mẫu. Hãy đổi danh mục, ngôn ngữ hoặc từ khóa tìm kiếm.</p></div></div> : null}
      </div>

      <aside className="b2-system-stack">
        <B2Surface>
          <B2SectionHeader eyebrow="SOURCES" title="Nguồn đang đọc" />
          <div className="b2-news-source-list">
            {sources.length ? sources.map((source) => <div key={source}><B2Status tone="green">RSS</B2Status><strong>{source}</strong></div>) : <p>Chưa có nguồn trả về trong snapshot hiện tại.</p>}
          </div>
        </B2Surface>
        <B2Surface>
          <B2SectionHeader eyebrow="FEED HEALTH" title="Tính toàn vẹn nguồn" />
          <div className="b2-news-health">
            <div><span>Bài nhận được</span><strong>{items.length}</strong></div>
            <div><span>Nguồn hoạt động</span><strong>{sources.length}</strong></div>
            <div><span>Lỗi nguồn</span><strong>{errors.length}</strong></div>
          </div>
          {errors.length ? <details className="b2-news-errors"><summary>Chi tiết lỗi nguồn</summary>{errors.map((item) => <p key={item}>{item}</p>)}</details> : null}
        </B2Surface>
      </aside>
    </section>
  </>;
}
