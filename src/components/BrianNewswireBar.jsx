import React, { useEffect, useMemo, useRef, useState } from 'react';
import './BrianNewswireBar.css';

const FEED_TTL = 8 * 60 * 1000;
const ROTATE_MS = 6500;
const CACHE_KEY = 'bes-news-feed-v2:vi:all';
const OPEN_ITEM_KEY = 'bes-newswire-open-item-v1';

const TEXT = {
  vi: {
    label: 'TIN VẮN',
    sublabel: 'BRIAN NEWSWIRE',
    all: 'Xem tất cả',
    pause: 'Tạm dừng',
    play: 'Tiếp tục',
    prev: 'Tin trước',
    next: 'Tin tiếp',
    category: 'GIÁO DỤC',
    now: 'vừa xong',
    minute: 'phút trước',
    hour: 'giờ trước',
    today: 'hôm nay',
    loading: 'Đang cập nhật tin mới…',
  },
  en: {
    label: 'BRIEFING',
    sublabel: 'BRIAN NEWSWIRE',
    all: 'View all',
    pause: 'Pause',
    play: 'Resume',
    prev: 'Previous story',
    next: 'Next story',
    category: 'EDUCATION',
    now: 'just now',
    minute: 'min ago',
    hour: 'hr ago',
    today: 'today',
    loading: 'Updating headlines…',
  },
};

function readCache() {
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || Date.now() - Number(parsed.savedAt || 0) > FEED_TTL) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    window.sessionStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    // Session cache is optional.
  }
}

function relativeTime(value, language, t) {
  if (!value) return t.today;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t.today;
  const diff = Math.max(0, Date.now() - date.getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t.now;
  if (mins < 60) return language === 'vi' ? `${mins} ${t.minute}` : `${mins} ${t.minute}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return language === 'vi' ? `${hours} ${t.hour}` : `${hours} ${t.hour}`;
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-GB', { day: '2-digit', month: '2-digit' }).format(date);
}

function categoryLabel(item, t) {
  const raw = String(item?.category || '').trim();
  if (!raw || raw === 'all' || raw === 'top') return t.category;
  return raw.replace(/[-_]+/g, ' ').toUpperCase();
}

function Icon({ name }) {
  const paths = {
    prev: 'm15.4 7.4-1.4-1.4L8 12l6 6 1.4-1.4L10.8 12z',
    next: 'm8.6 16.6 1.4 1.4 6-6-6-6-1.4 1.4 4.6 4.6z',
    pause: 'M7 5h4v14H7zm6 0h4v14h-4z',
    play: 'M8 5v14l11-7z',
    arrow: 'm9 18 6-6-6-6 1.4-1.4 7.4 7.4-7.4 7.4z',
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={paths[name]} /></svg>;
}

export default function BrianNewswireBar({ language = 'vi' }) {
  const t = TEXT[language] || TEXT.vi;
  const [items, setItems] = useState(() => readCache()?.items || []);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [loading, setLoading] = useState(() => !readCache()?.items?.length);
  const requestRef = useRef(0);

  const visibleItems = useMemo(
    () => items.filter((item) => item?.title).slice(0, 12),
    [items],
  );
  const current = visibleItems[activeIndex] || null;

  useEffect(() => {
    const cached = readCache();
    if (cached?.items?.length) {
      setItems(cached.items);
      setLoading(false);
      return undefined;
    }

    const requestId = ++requestRef.current;
    let cancelled = false;
    setLoading(true);

    fetch('/api/news-feed?language=vi&category=all')
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`);
        if (cancelled || requestId !== requestRef.current) return;
        setItems(Array.isArray(data?.items) ? data.items : []);
        writeCache(data);
      })
      .catch(() => {
        if (!cancelled && requestId === requestRef.current) setItems([]);
      })
      .finally(() => {
        if (!cancelled && requestId === requestRef.current) setLoading(false);
      });

    return () => {
      cancelled = true;
      requestRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (activeIndex < visibleItems.length) return;
    setActiveIndex(0);
  }, [activeIndex, visibleItems.length]);

  useEffect(() => {
    if (paused || hovered || visibleItems.length < 2) return undefined;
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const delay = prefersReducedMotion ? 10000 : ROTATE_MS;
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % visibleItems.length);
    }, delay);
    return () => window.clearInterval(timer);
  }, [hovered, paused, visibleItems.length]);

  const move = (delta) => {
    if (!visibleItems.length) return;
    setActiveIndex((index) => (index + delta + visibleItems.length) % visibleItems.length);
  };

  const openItem = () => {
    if (!current) return;
    try {
      window.sessionStorage.setItem(OPEN_ITEM_KEY, JSON.stringify(current));
    } catch {
      // Navigation still works without the hand-off cache.
    }
    window.location.hash = '#/news';
  };

  const openAll = () => {
    window.location.hash = '#/news';
  };

  if (!loading && !current) return null;

  return (
    <section
      className="brian-newswire"
      aria-label={language === 'vi' ? 'Thanh tin vắn Brian' : 'Brian newswire'}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="brian-newswire__identity">
        <span className="brian-newswire__live" aria-hidden="true" />
        <span className="brian-newswire__label">
          <strong>{t.label}</strong>
          <small>{t.sublabel}</small>
        </span>
      </div>

      <div className="brian-newswire__divider" aria-hidden="true" />

      <div className="brian-newswire__clock" aria-label={new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date())}>
        {new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date())}
      </div>

      <div className="brian-newswire__divider is-short" aria-hidden="true" />

      <div className="brian-newswire__story-wrap" aria-live="polite">
        {loading && !current ? (
          <div className="brian-newswire__story is-loading">{t.loading}</div>
        ) : current ? (
          <button
            key={current.id || current.link || activeIndex}
            type="button"
            className="brian-newswire__story"
            onClick={openItem}
            title={current.title}
          >
            <span className="brian-newswire__category">{categoryLabel(current, t)}</span>
            <strong>{current.title}</strong>
            <span className="brian-newswire__sep" aria-hidden="true">•</span>
            <time>{relativeTime(current.publishedAt, language, t)}</time>
          </button>
        ) : null}
      </div>

      <div className="brian-newswire__controls">
        <button type="button" onClick={() => move(-1)} aria-label={t.prev} title={t.prev} disabled={visibleItems.length < 2}><Icon name="prev" /></button>
        <button type="button" onClick={() => setPaused((value) => !value)} aria-label={paused ? t.play : t.pause} title={paused ? t.play : t.pause} className={paused ? 'is-paused' : ''}><Icon name={paused ? 'play' : 'pause'} /></button>
        <button type="button" onClick={() => move(1)} aria-label={t.next} title={t.next} disabled={visibleItems.length < 2}><Icon name="next" /></button>
      </div>

      <button type="button" className="brian-newswire__all" onClick={openAll}>
        <span>{t.all}</span><Icon name="arrow" />
      </button>
    </section>
  );
}

export { OPEN_ITEM_KEY };
