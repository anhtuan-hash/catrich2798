import { useEffect, useMemo, useState } from 'react';
import { hasRouteAccess } from '../utils/permissions.js';
import { launchRoute } from '../utils/motion.js';
import './StatusMenuBar.css';

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

function TickerItem({ sourceLine, headline }) {
  return (
    <span className="brian-briefing-bar__ticker-item">
      <span className="brian-briefing-bar__source">{sourceLine}</span>
      <span className="brian-briefing-bar__separator" aria-hidden="true">•</span>
      <strong>{headline}</strong>
      <span className="brian-briefing-bar__google-dots" aria-hidden="true"><i /><i /><i /><i /></span>
    </span>
  );
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

  if (!allowed) return null;

  const item = items.length ? items[index % items.length] : null;
  const fallback = language === 'en'
    ? 'Open News to see the latest education and English-language headlines.'
    : 'Mở Đọc báo để xem các tin giáo dục và tiếng Anh mới nhất.';
  const headline = item?.title || fallback;
  const source = item?.source || 'English Hub News';
  const time = compactTime(item?.publishedAt, language);
  const sourceLine = `${source}${time ? ` · ${time}` : ''}`;
  const tickerSeconds = Math.max(17, Math.min(38, Math.ceil((headline.length + sourceLine.length) / 5.4)));

  const openNews = (event) => launchRoute({
    target: '#/news',
    label: language === 'en' ? 'NEWS' : 'TIN',
    color: '#1a73e8',
    sourceEl: event.currentTarget,
  });

  const advance = () => {
    if (items.length < 2) return;
    setIndex((current) => (current + 1) % items.length);
  };

  return (
    <aside
      className={`brian-briefing-bar ${route === 'news' ? 'is-news-route' : ''} ${paused ? 'is-paused' : ''}`}
      aria-label={language === 'en' ? 'News briefing' : 'Tin vắn'}
      style={{ '--briefing-duration': `${tickerSeconds}s` }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <button
        type="button"
        className="brian-briefing-bar__headline"
        onClick={openNews}
        title={`${sourceLine} — ${headline}`}
        aria-label={`${sourceLine}. ${headline}`}
      >
        <span className="brian-briefing-bar__ticker-viewport" aria-hidden="true">
          <span
            key={`${item?.id || item?.link || index}-${index}`}
            className="brian-briefing-bar__ticker-track"
            onAnimationIteration={advance}
          >
            <TickerItem sourceLine={sourceLine} headline={headline} />
          </span>
        </span>
      </button>
    </aside>
  );
}
