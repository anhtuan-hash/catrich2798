import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { hasRouteAccess } from '../utils/permissions.js';
import { launchRoute } from '../utils/motion.js';
import './GlobalPublicNewsBriefing.css';

const MAX_ITEMS = 8;
const REFRESH_MS = 5 * 60 * 1000;

function cacheKey(language) {
  return `bes-public-news-briefing:${language === 'en' ? 'en' : 'vi'}`;
}

function fallbackItems(language) {
  return language === 'en'
    ? [
      { id: 'fallback-1', source: 'English Hub', title: 'Connecting to the latest education and English-learning headlines.', link: '' },
      { id: 'fallback-2', source: 'English Hub', title: 'News Brief automatically refreshes from public news sources.', link: '' },
    ]
    : [
      { id: 'fallback-1', source: 'English Hub', title: 'Đang kết nối các tin giáo dục và học tiếng Anh mới nhất.', link: '' },
      { id: 'fallback-2', source: 'English Hub', title: 'Tin vắn tự động làm mới từ các nguồn tin công khai.', link: '' },
    ];
}

function readCache(language) {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(cacheKey(language)) || 'null');
    return Array.isArray(parsed?.items) ? parsed.items.slice(0, MAX_ITEMS) : [];
  } catch {
    return [];
  }
}

function saveCache(language, items) {
  try {
    window.sessionStorage.setItem(cacheKey(language), JSON.stringify({ savedAt: Date.now(), items }));
  } catch {
    // The briefing remains available without browser storage.
  }
}

function compactTime(value, language) {
  const date = new Date(value || 0);
  if (!value || Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function GlobalPublicNewsBriefing({ currentUser, language = 'vi', route = 'home' }) {
  const hasPrivateBriefing = Boolean(currentUser && hasRouteAccess(currentUser, 'news'));
  const [host, setHost] = useState(null);
  const [items, setItems] = useState(() => (typeof window === 'undefined' ? fallbackItems(language) : (readCache(language).length ? readCache(language) : fallbackItems(language))));
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (hasPrivateBriefing || typeof document === 'undefined') return undefined;
    const findHost = () => setHost(document.querySelector('.bes-top-chrome'));
    findHost();
    const observer = new MutationObserver(findHost);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [hasPrivateBriefing]);

  useEffect(() => {
    if (!host || hasPrivateBriefing) return undefined;
    const placeBeforeNavigation = () => {
      const briefing = host.querySelector(':scope > .brian-public-briefing');
      const navigation = host.querySelector(':scope > .brian-nav');
      if (briefing && navigation && briefing.nextElementSibling !== navigation) host.insertBefore(briefing, navigation);
    };
    const frame = window.requestAnimationFrame(placeBeforeNavigation);
    return () => window.cancelAnimationFrame(frame);
  }, [host, hasPrivateBriefing, items.length]);

  useEffect(() => {
    if (hasPrivateBriefing) return undefined;
    const timer = window.setInterval(() => setNow(new Date()), 30 * 1000);
    return () => window.clearInterval(timer);
  }, [hasPrivateBriefing]);

  useEffect(() => {
    if (hasPrivateBriefing || typeof window === 'undefined') return undefined;
    let active = true;
    let controller = null;

    const load = async () => {
      controller?.abort();
      controller = new AbortController();
      const channel = language === 'en' ? 'en' : 'vi';
      const category = channel === 'en' ? 'top' : 'all';
      const cached = readCache(channel);
      if (cached.length && active) setItems(cached);

      try {
        const response = await fetch(`/api/news-feed?language=${encodeURIComponent(channel)}&category=${encodeURIComponent(category)}`, {
          signal: controller.signal,
          headers: { accept: 'application/json' },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || `HTTP ${response.status}`);
        const next = Array.isArray(payload?.items) ? payload.items.slice(0, MAX_ITEMS) : [];
        if (active && next.length) {
          setItems(next);
          setIndex(0);
          saveCache(channel, next);
        } else if (active && !cached.length) {
          setItems(fallbackItems(channel));
        }
      } catch (error) {
        if (active && error?.name !== 'AbortError' && !cached.length) setItems(fallbackItems(channel));
      }
    };

    load();
    const refreshTimer = window.setInterval(load, REFRESH_MS);
    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(refreshTimer);
    };
  }, [hasPrivateBriefing, language]);

  const item = items.length ? items[index % items.length] : fallbackItems(language)[0];
  const publishedTime = compactTime(item?.publishedAt, language);
  const source = item?.source || 'English Hub';
  const sourceLine = `${language === 'en' ? 'NEWS BRIEF' : 'TIN VẮN'} · ${source}${publishedTime ? ` · ${publishedTime}` : ''}`;
  const headline = item?.title || fallbackItems(language)[0].title;
  const tickerSeconds = Math.max(15, Math.min(34, Math.ceil((sourceLine.length + headline.length) / 5.2)));

  useEffect(() => {
    if (hasPrivateBriefing || paused || items.length < 2) return undefined;
    const timer = window.setTimeout(() => setIndex((current) => (current + 1) % items.length), tickerSeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [hasPrivateBriefing, paused, items.length, index, tickerSeconds]);

  const locale = language === 'en' ? 'en-GB' : 'vi-VN';
  const clockTime = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  const clockDate = new Intl.DateTimeFormat(locale, { weekday: 'short', day: '2-digit', month: '2-digit' }).format(now);

  const openItem = (event) => {
    const link = String(item?.link || '');
    if (/^https?:\/\//i.test(link)) {
      window.open(link, '_blank', 'noopener,noreferrer');
      return;
    }
    launchRoute({
      target: currentUser ? '#/news' : '#/login',
      label: language === 'en' ? 'NEWS' : 'TIN',
      color: '#1a73e8',
      sourceEl: event.currentTarget,
    });
  };

  if (hasPrivateBriefing || !host) return null;

  return createPortal(
    <aside
      className={`brian-briefing-bar brian-public-briefing ${route === 'news' ? 'is-news-route' : ''} ${paused ? 'is-paused' : ''}`}
      aria-label={language === 'en' ? 'Public news briefing and current time' : 'Tin vắn công khai và thời gian hiện tại'}
      style={{ '--briefing-duration': `${tickerSeconds}s` }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <button
        type="button"
        className="brian-briefing-bar__headline"
        onClick={openItem}
        title={`${sourceLine} — ${headline}`}
        aria-label={`${sourceLine}. ${headline}`}
      >
        <span className="brian-briefing-bar__ticker-viewport" aria-hidden="true">
          <span key={`${item?.id || item?.link || index}-${index}`} className="brian-briefing-bar__ticker-track">
            <span className="brian-briefing-bar__ticker-item">
              <span className="brian-briefing-bar__source">{sourceLine}</span>
              <span className="brian-briefing-bar__separator" aria-hidden="true">•</span>
              <strong>{headline}</strong>
              <span className="brian-briefing-bar__google-dots" aria-hidden="true"><i /><i /><i /><i /></span>
            </span>
          </span>
        </span>
      </button>

      <div className="brian-briefing-bar__context" aria-label={language === 'en' ? 'Current time' : 'Thời gian hiện tại'}>
        <div className="brian-briefing-chip brian-briefing-chip--time" title={`${clockTime} · ${clockDate}`}>
          <span className="brian-briefing-chip__icon brian-public-briefing__clock" aria-hidden="true">◷</span>
          <span className="brian-briefing-chip__body">
            <strong className="brian-briefing-chip__primary">{clockTime}</strong>
            <small className="brian-briefing-chip__secondary">{clockDate}</small>
          </span>
        </div>
      </div>
    </aside>,
    host,
  );
}
