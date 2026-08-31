import React, { useEffect, useMemo, useRef, useState } from 'react';
import { APPS, GAME_APPS, SPECIAL_TOOLS } from '../data/apps.js';
import { isRetiredApp } from '../data/retiredApps.js';
import { isAppHiddenForUser } from '../utils/appVisibility.js';
import { hasRouteAccess } from '../utils/permissions.js';
import './NewsFeed.css';
import './NewsFeedVertical.css';

const TILE_COLORS = {
  blue: '#0875c1',
  mint: '#008b7c',
  orange: '#c95022',
  red: '#b6264f',
  teal: '#008f9c',
  purple: '#6543b5',
};

const CLUSTER_ORDER = ['work', 'teaching', 'studio'];
const LAUNCH_DURATION = 480;
const LAUNCH_EASING = 'cubic-bezier(.2,.82,.2,1)';
const preloadedApps = new Set();

const APP_PRELOADERS = {
  'work-dashboard': () => import('./WorkDashboard.jsx'),
  'gradebook-studio': () => import('./GradebookStudio.jsx'),
  'brian-team': () => import('./BrianTeamPortal.jsx'),
  'thpt-practice-hub': () => import('./THPTPracticeHub.jsx'),
  'knowledge-hub': () => import('./KnowledgeHub.jsx'),
  'platform-readiness': () => import('./PlatformReadiness.jsx'),
  'cloud-operations': () => import('./CloudOperations.jsx'),
  'data-governance': () => import('./DataGovernance.jsx'),
  'resource-library-hub': () => import('./ResourceLibrary.jsx'),
  'news-reader': () => import('./NewsReader.jsx'),
  'vietnam-tax': () => import('./VietnamTaxStudio.jsx'),
  'textlab-activities': () => import('./TextLabActivities.jsx'),
  textcare: () => import('./TextCareStudio.jsx'),
};

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
  if (!item || item.slug === 'news-feed' || isRetiredApp(item)) return false;
  if (isAppHiddenForUser(appVisibility?.snapshot, currentUser, `tool:${item.slug}`)) return false;
  if (item.route) return hasRouteAccess(currentUser, item.route, item);
  return hasRouteAccess(currentUser, 'tool', item);
}

function preloadApp(item) {
  if (!item?.slug || isRetiredApp(item) || preloadedApps.has(item.slug)) return;
  const loader = APP_PRELOADERS[item.slug];
  if (!loader) return;
  preloadedApps.add(item.slug);
  loader().catch(() => preloadedApps.delete(item.slug));
}

function nextPaint(callback) {
  window.requestAnimationFrame(() => window.requestAnimationFrame(callback));
}

export default function NewsFeed({ language = 'vi', currentUser, appVisibility }) {
  const t = copy[language] || copy.vi;
  const [query, setQuery] = useState('');
  const [now, setNow] = useState(() => new Date());
  const rootRef = useRef(null);
  const launchLockRef = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => () => {
    if (!launchLockRef.current) document.documentElement.classList.remove('brian-news-feed-launching');
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
    if (launchLockRef.current || isRetiredApp(item)) return;

    const target = appTarget(item);
    preloadApp(item);

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const source = event.currentTarget;
    if (reducedMotion || typeof source?.animate !== 'function') {
      window.location.hash = target;
      return;
    }

    const rect = source.getBoundingClientRect();
    const viewportWidth = Math.max(window.innerWidth, 1);
    const viewportHeight = Math.max(window.innerHeight, 1);
    const scaleX = Math.max(rect.width / viewportWidth, 0.001);
    const scaleY = Math.max(rect.height / viewportHeight, 0.001);
    const initialTransform = `translate3d(${rect.left}px, ${rect.top}px, 0) scale(${scaleX}, ${scaleY})`;
    const color = TILE_COLORS[item.tone] || TILE_COLORS.blue;
    const title = localized(item, 'title', language);
    const root = rootRef.current;

    launchLockRef.current = true;
    root?.classList.add('is-launching');
    source.classList.add('is-launch-source');
    document.documentElement.classList.add('brian-news-feed-launching');

    const overlay = document.createElement('div');
    overlay.className = 'brian-news-feed-launch-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.style.background = color;
    overlay.style.transform = initialTransform;

    const overlayLabel = document.createElement('span');
    overlayLabel.textContent = title;
    overlay.appendChild(overlayLabel);
    document.body.appendChild(overlay);

    const pageAnimation = root?.animate([
      { opacity: 1, transform: 'translate3d(0,0,0)' },
      { opacity: 0.18, transform: 'translate3d(-10px,0,0)' },
    ], {
      duration: 360,
      delay: 80,
      easing: 'cubic-bezier(.2,.8,.2,1)',
      fill: 'forwards',
    });

    const labelAnimation = overlayLabel.animate([
      { opacity: 0, transform: 'translate3d(34px,0,0)' },
      { opacity: 0, transform: 'translate3d(20px,0,0)', offset: 0.28 },
      { opacity: 0.92, transform: 'translate3d(0,0,0)' },
    ], {
      duration: LAUNCH_DURATION,
      easing: 'cubic-bezier(.2,.82,.2,1)',
      fill: 'forwards',
    });

    const launchAnimation = overlay.animate([
      { transform: initialTransform },
      { transform: 'translate3d(0,0,0) scale(1,1)' },
    ], {
      duration: LAUNCH_DURATION,
      easing: LAUNCH_EASING,
      fill: 'forwards',
    });

    const cleanup = () => {
      pageAnimation?.cancel();
      labelAnimation?.cancel();
      overlay.remove();
      root?.classList.remove('is-launching');
      source.classList.remove('is-launch-source');
      document.documentElement.classList.remove('brian-news-feed-launching');
      launchLockRef.current = false;
    };

    launchAnimation.finished.then(() => {
      // Deliberately bypass launchRoute here. News Feed already owns the exit
      // animation, so firing the global Metro route exit would double-animate.
      window.location.hash = target;

      nextPaint(() => {
        const reveal = overlay.animate([
          { opacity: 1 },
          { opacity: 0 },
        ], {
          duration: 180,
          easing: 'cubic-bezier(.2,.8,.2,1)',
          fill: 'forwards',
        });
        reveal.finished.then(cleanup).catch(cleanup);
      });
    }).catch(cleanup);
  };

  return (
    <div ref={rootRef} className="brian-news-feed" data-language={language}>
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
          {clusters.map((cluster, clusterIndex) => (
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
                  const motionIndex = index + (clusterIndex * 5);
                  const cycle = 6.2 + ((motionIndex % 5) * 0.55);
                  const delay = -((motionIndex % 9) * 0.73);
                  return (
                    <button
                      type="button"
                      key={item.slug}
                      className={`brian-live-tile is-${size} is-live`}
                      style={{ '--tile-color': color, '--tile-delay': `${delay}s`, '--tile-cycle': `${cycle}s` }}
                      onPointerEnter={() => preloadApp(item)}
                      onFocus={() => preloadApp(item)}
                      onClick={(event) => openApp(item, event)}
                      aria-label={`${t.open}: ${title}`}
                    >
                      <span className="brian-live-tile__topline">
                        <span className="brian-live-tile__icon" aria-hidden="true">{item.icon || title.slice(0, 2)}</span>
                        <em>{t.live}</em>
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
    </div>
  );
}
