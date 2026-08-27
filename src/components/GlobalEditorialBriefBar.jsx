import React, { useEffect, useMemo, useState } from 'react';
import { launchRoute } from '../utils/navigation.js';
import './GlobalEditorialBriefBar.css';

const NEWS_CACHE_TTL = 10 * 60 * 1000;
const MAX_HEADLINES = 8;

function newsChannel(language) {
  return language === 'en'
    ? { channel: 'en', category: 'top' }
    : { channel: 'vi', category: 'all' };
}

function newsCacheKey(language) {
  const { channel, category } = newsChannel(language);
  return `bes-news-feed-v2:${channel}:${category}`;
}

function readCachedNews(language) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(newsCacheKey(language));
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || Date.now() - Number(parsed.savedAt || 0) > NEWS_CACHE_TTL) return null;
    return parsed.data || null;
  } catch {
    return null;
  }
}

function writeCachedNews(language, data) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(newsCacheKey(language), JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    // News remains available for the current render when storage is unavailable.
  }
}

function normalizeHeadlines(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return items
    .filter((item) => String(item?.title || '').trim())
    .slice(0, MAX_HEADLINES)
    .map((item, index) => ({
      id: String(item?.id || item?.link || `${index}-${item.title}`),
      title: String(item.title || '').trim(),
      source: String(item.source || item.publisher || '').trim(),
    }));
}

function openRoute(target, label, sourceEl) {
  launchRoute({
    target: target.startsWith('#/') ? target : `#/${target}`,
    label: String(label || 'GO').slice(0, 2).toUpperCase(),
    color: '#0b57d0',
    sourceEl,
  });
}

function SettingsIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm7 4 2-1-1-3-2 .2-1.3-1.5.4-2.1-3-1.2-1.2 1.7h-2L9.7 3.4l-3 1.2.4 2.1L5.8 8.2 3.7 8 3 11l2 1-2 1 .7 3 2.1-.2 1.3 1.5-.4 2.1 3 1.2 1.2-1.7h2l1.2 1.7 3-1.2-.4-2.1 1.3-1.5 2.1.2.7-3-2-1Z" /></svg>;
}

function TickerGroup({ items, openNews, duplicate = false }) {
  return (
    <span className="brian-editorial-brief__ticker-group" aria-hidden={duplicate ? 'true' : undefined}>
      {items.map((item, index) => (
        <React.Fragment key={`${duplicate ? 'copy-' : ''}${item.id}`}>
          {index > 0 ? <span className="brian-editorial-brief__dot" aria-hidden="true">◆</span> : null}
          <button type="button" className="brian-editorial-brief__headline" onClick={openNews} tabIndex={duplicate ? -1 : undefined}>
            {item.source ? <small>{item.source}</small> : null}
            <span>{item.title}</span>
          </button>
        </React.Fragment>
      ))}
    </span>
  );
}

export default function GlobalEditorialBriefBar({ language = 'vi', currentUser }) {
  const vi = language !== 'en';
  const initialCache = readCachedNews(language);
  const [payload, setPayload] = useState(initialCache);
  const [loading, setLoading] = useState(() => !initialCache);

  useEffect(() => {
    let alive = true;
    const cached = readCachedNews(language);
    if (cached) {
      setPayload(cached);
      setLoading(false);
      return () => { alive = false; };
    }

    const { channel, category } = newsChannel(language);
    setLoading(true);
    fetch(`/api/news-feed?language=${encodeURIComponent(channel)}&category=${encodeURIComponent(category)}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`);
        if (!alive) return;
        setPayload(data);
        writeCachedNews(language, data);
      })
      .catch(() => {
        if (alive) setPayload(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => { alive = false; };
  }, [language]);

  const headlines = useMemo(() => normalizeHeadlines(payload), [payload]);
  const tickerItems = headlines.length ? headlines : [{
    id: 'news-fallback',
    title: loading
      ? (vi ? 'Đang cập nhật dòng tin mới nhất từ Đọc báo…' : 'Updating the latest Newsroom headlines…')
      : (vi ? 'Mở Đọc báo để xem dòng tin giáo dục mới nhất.' : 'Open Newsroom for the latest education headlines.'),
    source: 'Brian Newsroom',
  }];

  const openNews = (event) => openRoute('#/news', vi ? 'Đọc báo' : 'News', event.currentTarget);
  const openSettings = (event) => {
    if (!currentUser) return;
    openRoute('#/settings', vi ? 'Cài đặt' : 'Settings', event.currentTarget);
  };

  return (
    <section className="brian-editorial-brief" aria-label={vi ? 'Tin vắn từ Đọc báo' : 'Newsroom headlines'}>
      <div className="brian-editorial-brief__news">
        <button type="button" className="brian-editorial-brief__label" onClick={openNews} title={vi ? 'Mở ứng dụng Đọc báo' : 'Open Newsroom'}>
          <i />{vi ? 'TIN VẮN' : 'NEWSWIRE'}
        </button>
        <div className="brian-editorial-brief__track" aria-live="off">
          <div className={`brian-editorial-brief__ticker ${headlines.length ? 'is-running' : ''}`}>
            <TickerGroup items={tickerItems} openNews={openNews} />
            {headlines.length ? <TickerGroup items={tickerItems} openNews={openNews} duplicate /> : null}
          </div>
        </div>
      </div>

      {currentUser ? (
        <div className="brian-editorial-brief__chips" aria-label={vi ? 'Tiện ích nhanh' : 'Quick utility'}>
          <button type="button" onClick={openSettings}>
            <SettingsIcon /><span>{vi ? 'Cài đặt' : 'Settings'}</span>
          </button>
        </div>
      ) : null}
    </section>
  );
}
