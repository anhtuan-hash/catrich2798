import React, { useEffect, useMemo, useState } from 'react';
import { APPS, GAME_APPS, SPECIAL_TOOLS } from '../data/apps.js';
import { isAppHiddenForUser } from '../utils/appVisibility.js';
import { hasRouteAccess } from '../utils/permissions.js';
import { launchRoute } from '../utils/navigation.js';
import './NewsFeed.css';

const TILE_COLORS = {
  blue: '#0875c1',
  mint: '#008b7c',
  orange: '#c95022',
  red: '#b6264f',
  teal: '#008f9c',
  purple: '#6543b5',
};

const CLUSTER_ORDER = ['work', 'teaching', 'studio'];

const copy = {
  vi: {
    eyebrow: 'BRIAN ENGLISH · START',
    title: 'News Feed',
    subtitle: 'Mọi ứng dụng của Brian, trên một màn hình Live Tile.',
    search: 'Tìm ứng dụng…',
    allApps: 'ứng dụng',
    work: 'Công việc & quản lý',
    teaching: 'Dạy học & học liệu',
    studio: 'Tiện ích & hệ thống',
    noMatch: 'Không tìm thấy ứng dụng phù hợp.',
    reset: 'Hiện tất cả',
    open: 'Mở',
    live: 'LIVE',
  },
  en: {
    eyebrow: 'BRIAN ENGLISH · START',
    title: 'News Feed',
    subtitle: 'Every Brian app, on one Live Tile start screen.',
    search: 'Find an app…',
    allApps: 'apps',
    work: 'Work & management',
    teaching: 'Teaching & resources',
    studio: 'Utilities & system',
    noMatch: 'No matching apps.',
    reset: 'Show all',
    open: 'Open',
    live: 'LIVE',
  },
};

function clusterFor(item) {
  const group = `${item.group || ''} ${item.groupVi || ''}`.toLowerCase();
  if (/management|quản lý|giảng dạy/.test(group)) return 'work';
  if (/exam|teaching resources|teaching design|reading|học liệu|luyện thi|tạo hoạt động|đọc báo/.test(group)) return 'teaching';
  return 'studio';
}

function appTarget(item) {
  return item.route ? `#/${item.route}` : `#/tool/${item.slug}`;
}

function tileSize(item, index) {
  if (item.slug === 'work-dashboard') return 'large';
  if (item.featured && index % 3 !== 2) return 'wide';
  return 'square';
}

function localized(item, key, language) {
  if (language === 'vi') return item[`${key}Vi`] || item[key] || '';
  return item[key] || item[`${key}Vi`] || '';
}

function canSeeItem(item, currentUser, appVisibility) {
  if (!item || item.slug === 'news-feed') return false;
  if (isAppHiddenForUser(appVisibility?.snapshot, currentUser, `tool:${item.slug}`)) return false;
  if (item.route) return hasRouteAccess(currentUser, item.route, item);
  return hasRouteAccess(currentUser, 'tool', item);
}

export default function NewsFeed({ language = 'vi', currentUser, appVisibility }) {
  const t = copy[language] || copy.vi;
  const [query, setQuery] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [launching, setLaunching] = useState(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const allApps = useMemo(
    () => [...APPS, ...GAME_APPS, ...SPECIAL_TOOLS].filter((item) => canSeeItem(item, currentUser, appVisibility)),
    [appVisibility?.snapshot, currentUser?.id, currentUser?.email, currentUser?.role],
  );

  const filteredApps = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return allApps;
    return allApps.filter((item) => [
      localized(item, 'title', language),
      localized(item, 'desc', language),
      localized(item, 'group', language),
      localized(item, 'status', language),
    ].join(' ').toLowerCase().includes(needle));
  }, [allApps, language, query]);

  const clusters = useMemo(() => {
    const map = new Map(CLUSTER_ORDER.map((id) => [id, []]));
    filteredApps.forEach((item) => map.get(clusterFor(item))?.push(item));
    return CLUSTER_ORDER.map((id) => ({ id, items: map.get(id) || [] })).filter((entry) => entry.items.length);
  }, [filteredApps]);

  const dateLabel = new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  }).format(now);
  const timeLabel = new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
    hour: '2-digit', minute: '2-digit',
  }).format(now);

  const openApp = (item, event) => {
    const target = appTarget(item);
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reducedMotion) {
      launchRoute({ target });
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const color = TILE_COLORS[item.tone] || TILE_COLORS.blue;
    setLaunching({
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      color,
      title: localized(item, 'title', language),
    });
    window.setTimeout(() => launchRoute({ target }), 330);
  };

  return (
    <div className="brian-news-feed" data-language={language}>
      <header className="brian-news-feed__header">
        <div className="brian-news-feed__title-block">
          <span className="brian-news-feed__eyebrow">{t.eyebrow}</span>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>

        <div className="brian-news-feed__meta">
          <div className="brian-news-feed__clock" aria-label={`${dateLabel} ${timeLabel}`}>
            <strong>{timeLabel}</strong>
            <span>{dateLabel}</span>
          </div>
          <label className="brian-news-feed__search">
            <span aria-hidden="true">⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} />
            {query ? <button type="button" onClick={() => setQuery('')} aria-label={t.reset}>×</button> : null}
          </label>
          <div className="brian-news-feed__count"><b>{allApps.length}</b> {t.allApps}</div>
        </div>
      </header>

      {clusters.length ? (
        <div className="brian-news-feed__clusters">
          {clusters.map((cluster) => (
            <section key={cluster.id} className={`brian-news-feed__cluster is-${cluster.id}`}>
              <h2>{t[cluster.id]}</h2>
              <div className="brian-news-feed__tiles">
                {cluster.items.map((item, index) => {
                  const title = localized(item, 'title', language);
                  const desc = localized(item, 'desc', language);
                  const status = localized(item, 'status', language);
                  const group = localized(item, 'group', language);
                  const color = TILE_COLORS[item.tone] || TILE_COLORS.blue;
                  const size = tileSize(item, index);
                  return (
                    <button
                      type="button"
                      key={item.slug}
                      className={`brian-live-tile is-${size} ${item.featured ? 'is-live' : ''}`}
                      style={{ '--tile-color': color, '--tile-delay': `${(index % 6) * -1.1}s` }}
                      onClick={(event) => openApp(item, event)}
                      aria-label={`${t.open}: ${title}`}
                    >
                      <span className="brian-live-tile__topline">
                        <span className="brian-live-tile__icon" aria-hidden="true">{item.icon || title.slice(0, 2)}</span>
                        {item.featured ? <em>{t.live}</em> : null}
                      </span>
                      <span className="brian-live-tile__live-window">
                        <span className="brian-live-tile__face brian-live-tile__face--primary">
                          <strong>{title}</strong>
                          <small>{group}</small>
                        </span>
                        <span className="brian-live-tile__face brian-live-tile__face--secondary">
                          <strong>{status || title}</strong>
                          <small>{desc}</small>
                        </span>
                      </span>
                      <span className="brian-live-tile__footer">
                        <span>{item.api ? 'BRIAN · ONLINE' : 'BRIAN · LOCAL'}</span>
                        <span aria-hidden="true">→</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="brian-news-feed__empty">
          <strong>{t.noMatch}</strong>
          <button type="button" onClick={() => setQuery('')}>{t.reset}</button>
        </div>
      )}

      {launching ? (
        <div
          className="brian-news-feed__launch"
          style={{
            '--launch-left': `${launching.left}px`,
            '--launch-top': `${launching.top}px`,
            '--launch-width': `${launching.width}px`,
            '--launch-height': `${launching.height}px`,
            '--launch-color': launching.color,
          }}
          aria-hidden="true"
        >
          <span>{launching.title}</span>
        </div>
      ) : null}
    </div>
  );
}
