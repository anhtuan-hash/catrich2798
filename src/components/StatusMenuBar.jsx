import { useEffect, useMemo, useState } from 'react';
import { hasRouteAccess } from '../utils/permissions.js';
import { launchRoute } from '../utils/motion.js';
import './StatusMenuBar.css';

const ROTATION_MS = 9000;
const MAX_HEADLINES = 8;

function feedCategory(language) {
  return language === 'en' ? 'top' : 'all';
}

function feedCacheKey(language) {
  const channel = language === 'en' ? 'en' : 'vi';
  return `bes-news-feed:${channel}:${feedCategory(channel)}`;
}

function readCachedHeadlines(language) {
  try {
    const raw = window.sessionStorage.getItem(feedCacheKey(language));
    const parsed = raw ? JSON.parse(raw) : null;
    const items = parsed?.data?.items;
    return Array.isArray(items) ? items.slice(0, MAX_HEADLINES) : [];
  } catch {
    return [];
  }
}

function compactTime(value, language) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function StatusMenuBar({
  currentUser,
  language = 'vi',
  route = 'home',
}) {
  const channel = language === 'en' ? 'en' : 'vi';
  const allowed = useMemo(
    () => Boolean(currentUser && hasRouteAccess(currentUser, 'news')),
    [currentUser],
  );
  const [items, setItems] = useState(() => (typeof window === 'undefined' ? [] : readCachedHeadlines(channel)));
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setIndex(0);
    if (!allowed || typeof window === 'undefined') return undefined;

    const cached = readCachedHeadlines(channel);
    setItems(cached);

    const controller = new AbortController();
    const category = feedCategory(channel);

    fetch(`/api/news-feed?language=${encodeURIComponent(channel)}&category=${encodeURIComponent(category)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
        const next = Array.isArray(data.items) ? data.items.slice(0, MAX_HEADLINES) : [];
        if (next.length) {
          setItems(next);
          try {
            window.sessionStorage.setItem(feedCacheKey(channel), JSON.stringify({ savedAt: Date.now(), data }));
          } catch { /* cache is optional */ }
        }
      })
      .catch((error) => {
        if (error?.name !== 'AbortError' && !cached.length) setItems([]);
      });

    return () => controller.abort();
  }, [allowed, channel]);

  useEffect(() => {
    if (paused || items.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % items.length);
    }, ROTATION_MS);
    return () => window.clearInterval(timer);
  }, [items.length, paused]);

  if (!allowed) return null;

  const item = items.length ? items[index % items.length] : null;
  const fallback = language === 'en'
    ? 'Open News to see the latest education and English-language headlines.'
    : 'Mở Đọc báo để xem các tin giáo dục và tiếng Anh mới nhất.';
  const headline = item?.title || fallback;
  const source = item?.source || 'English Hub News';
  const time = compactTime(item?.publishedAt, language);

  const openNews = (event) => launchRoute({
    target: '#/news',
    label: language === 'en' ? 'NEWS' : 'TIN',
    color: '#167d78',
    sourceEl: event.currentTarget,
  });

  const move = (step) => {
    if (items.length < 2) return;
    setIndex((current) => (current + step + items.length) % items.length);
  };

  return (
    <aside
      className={`brian-briefing-bar ${route === 'news' ? 'is-news-route' : ''}`}
      aria-label={language === 'en' ? 'News briefing' : 'Tin vắn'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <button type="button" className="brian-briefing-bar__label" onClick={openNews}>
        <i aria-hidden="true" />
        <span>{language === 'en' ? 'BRIEF' : 'TIN VẮN'}</span>
      </button>

      <button type="button" className="brian-briefing-bar__headline" onClick={openNews} title={headline}>
        <small>{source}{time ? ` · ${time}` : ''}</small>
        <strong key={`${item?.id || item?.link || index}-${index}`}>{headline}</strong>
      </button>

      <div className="brian-briefing-bar__actions">
        {items.length > 1 ? (
          <div className="brian-briefing-bar__pager" aria-label={language === 'en' ? 'Change headline' : 'Chuyển tin'}>
            <button type="button" onClick={() => move(-1)} aria-label={language === 'en' ? 'Previous headline' : 'Tin trước'}>‹</button>
            <span>{index + 1}/{items.length}</span>
            <button type="button" onClick={() => move(1)} aria-label={language === 'en' ? 'Next headline' : 'Tin tiếp theo'}>›</button>
          </div>
        ) : null}
        <button type="button" className="brian-briefing-bar__open" onClick={openNews}>
          {language === 'en' ? 'News' : 'Đọc báo'} <span aria-hidden="true">→</span>
        </button>
      </div>
    </aside>
  );
}
