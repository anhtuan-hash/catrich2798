import React, { useEffect, useMemo, useRef, useState } from 'react';
import { APPS, GAME_APPS, SPECIAL_TOOLS } from '../data/apps.js';
import { isRetiredApp } from '../data/retiredApps.js';
import { isAppHiddenForUser } from '../utils/appVisibility.js';
import { hasRouteAccess } from '../utils/permissions.js';
import {
  DASHBOARD_SOURCE_EVENTS,
  createEmptyDashboardSnapshot,
  loadDashboardSnapshot,
} from '../utils/dashboardAggregator.js';
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

const SYSTEM_APP_SLUGS = new Set(['platform-readiness', 'cloud-operations', 'data-governance']);
const WORK_APP_SLUGS = new Set(['work-dashboard', 'gradebook-studio', 'brian-team']);
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
  homeroom: () => import('./HomeroomWorkspace.jsx'),
};

const copy = {
  vi: {
    eyebrow: 'BRIAN ENGLISH · START',
    title: 'News Feed',
    subtitle: 'Công việc, lớp học và ứng dụng quan trọng — cập nhật trực tiếp trên Live Tile.',
    search: 'Tìm ứng dụng…',
    allApps: 'ứng dụng',
    today: 'Hôm nay',
    work: 'Công việc & quản lý',
    teaching: 'Dạy học & học liệu',
    studio: 'Tiện ích',
    noMatch: 'Không tìm thấy ứng dụng phù hợp.',
    reset: 'Hiện tất cả',
    open: 'Mở',
    todayWork: 'Việc hôm nay',
    nextSchedule: 'Lịch tiếp theo',
    notifications: 'Thông báo',
    noDueWork: 'Không có việc đến hạn',
    noSchedule: 'Chưa có lịch sắp tới',
    overdue: 'quá hạn',
    dueSoon: 'sắp đến hạn',
    updates: 'cập nhật',
    ttcm: 'TTCM',
    ttcmSub: 'Thông báo · tài liệu · công việc tổ',
    homeroom: 'Chủ nhiệm',
    reports: 'Báo cáo',
    quickCreate: 'Quick Create',
    quickCreateSub: 'Tạo nhanh nội dung trong Brian',
    systemHealth: 'System Health',
    systemHealthSub: 'PWA · Cloud · Security · Accessibility',
    systemReady: 'Hệ thống sẵn sàng',
    createTitle: 'Tạo nhanh',
    createActivity: 'Tạo hoạt động',
    uploadResource: 'Mở kho học liệu',
    openReport: 'Mở báo cáo',
    openHomeroom: 'Mở chủ nhiệm',
    close: 'Đóng',
  },
  en: {
    eyebrow: 'BRIAN ENGLISH · START',
    title: 'News Feed',
    subtitle: 'Work, classes and important apps — updated directly on Live Tiles.',
    search: 'Find an app…',
    allApps: 'apps',
    today: 'Today',
    work: 'Work & management',
    teaching: 'Teaching & resources',
    studio: 'Utilities',
    noMatch: 'No matching apps.',
    reset: 'Show all',
    open: 'Open',
    todayWork: 'Today’s work',
    nextSchedule: 'Next schedule',
    notifications: 'Notifications',
    noDueWork: 'Nothing due today',
    noSchedule: 'No upcoming schedule',
    overdue: 'overdue',
    dueSoon: 'due soon',
    updates: 'updates',
    ttcm: 'Department',
    ttcmSub: 'Announcements · files · department work',
    homeroom: 'Homeroom',
    reports: 'Reports',
    quickCreate: 'Quick Create',
    quickCreateSub: 'Create something in Brian',
    systemHealth: 'System Health',
    systemHealthSub: 'PWA · Cloud · Security · Accessibility',
    systemReady: 'Systems ready',
    createTitle: 'Quick create',
    createActivity: 'Create activity',
    uploadResource: 'Open resources',
    openReport: 'Open reports',
    openHomeroom: 'Open homeroom',
    close: 'Close',
  },
};

function clusterFor(item) {
  const group = `${item.group || ''} ${item.groupVi || ''}`.toLowerCase();
  if (/management|quản lý|giảng dạy/.test(group)) return 'work';
  if (/exam|teaching resources|teaching design|reading|học liệu|luyện thi|tạo hoạt động|đọc báo/.test(group)) return 'teaching';
  return 'studio';
}

function appTarget(item) {
  if (item.target) return item.target;
  return item.route ? `#/${item.route}` : `#/tool/${item.slug}`;
}

function tileSize(item, index) {
  if (item.tileSize) return item.tileSize;
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

function dateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function compactEventTime(value, language, now = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date);
  if (dateKey(date) === dateKey(now)) return time;
  const day = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit' }).format(date);
  return `${day} · ${time}`;
}

function smartItem({ slug, icon, tone, title, subtitle, status, detail, route, target, action, tileSize: size = 'wide' }) {
  return {
    slug,
    icon,
    tone,
    title,
    titleVi: title,
    group: subtitle,
    groupVi: subtitle,
    desc: detail || subtitle,
    descVi: detail || subtitle,
    status,
    statusVi: status,
    route,
    target,
    action,
    tileSize: size,
    featured: true,
    api: true,
    smart: true,
  };
}

export default function NewsFeed({ language = 'vi', currentUser, appVisibility }) {
  const t = copy[language] || copy.vi;
  const [query, setQuery] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [dashboard, setDashboard] = useState(() => createEmptyDashboardSnapshot(currentUser));
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const rootRef = useRef(null);
  const launchLockRef = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => () => {
    if (!launchLockRef.current) document.documentElement.classList.remove('brian-news-feed-launching');
  }, []);

  useEffect(() => {
    let alive = true;
    let refreshTimer = 0;
    const refresh = () => {
      if (!currentUser) {
        if (alive) setDashboard(createEmptyDashboardSnapshot(currentUser));
        return;
      }
      loadDashboardSnapshot(currentUser, new Date())
        .then((snapshot) => { if (alive) setDashboard(snapshot); })
        .catch(() => { if (alive) setDashboard(createEmptyDashboardSnapshot(currentUser)); });
    };
    setDashboard(createEmptyDashboardSnapshot(currentUser));
    refresh();
    refreshTimer = window.setInterval(refresh, 60000);
    DASHBOARD_SOURCE_EVENTS.forEach((eventName) => window.addEventListener(eventName, refresh));
    window.addEventListener('focus', refresh);
    return () => {
      alive = false;
      window.clearInterval(refreshTimer);
      DASHBOARD_SOURCE_EVENTS.forEach((eventName) => window.removeEventListener(eventName, refresh));
      window.removeEventListener('focus', refresh);
    };
  }, [currentUser?.id, currentUser?.email, currentUser?.role]);

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

  const appBySlug = useMemo(() => new Map(allApps.map((item) => [item.slug, item])), [allApps]);
  const nextTimelineItem = dashboard.timeline?.[0] || null;
  const nextTimelineTarget = nextTimelineItem?.target || (nextTimelineItem?.route ? `#/${nextTimelineItem.route}` : '#/dashboard');
  const nextTimelineTime = nextTimelineItem ? compactEventTime(nextTimelineItem.date, language, now) : '';
  const homeroom = dashboard.homeroom;
  const canOpenHomeroom = Boolean(currentUser && hasRouteAccess(currentUser, 'homeroom'));
  const canOpenReports = appBySlug.has('brian-team');
  const notificationCount = Number(dashboard.stats?.notifications || 0);
  const todayCount = Number(dashboard.stats?.today || 0);
  const overdueCount = Number(dashboard.stats?.overdue || 0);
  const dueSoonCount = Number(dashboard.stats?.dueSoon || 0);

  const todayTiles = useMemo(() => [
    smartItem({
      slug: 'today-work-live', icon: '✓', tone: 'blue', title: t.todayWork,
      subtitle: todayCount ? `${todayCount} ${language === 'vi' ? 'việc đến hạn' : 'items due'}` : t.noDueWork,
      status: overdueCount ? `${overdueCount} ${t.overdue}` : dueSoonCount ? `${dueSoonCount} ${t.dueSoon}` : t.noDueWork,
      detail: dashboard.attention?.[0]?.title || t.noDueWork,
      target: '#/dashboard',
    }),
    smartItem({
      slug: 'next-schedule-live', icon: '◷', tone: 'purple', title: t.nextSchedule,
      subtitle: nextTimelineTime || t.noSchedule,
      status: nextTimelineItem?.title || t.noSchedule,
      detail: nextTimelineItem?.description || nextTimelineItem?.sourceLabel || t.noSchedule,
      target: nextTimelineTarget,
    }),
    smartItem({
      slug: 'notifications-live', icon: '!', tone: notificationCount ? 'orange' : 'mint', title: t.notifications,
      subtitle: notificationCount ? `${notificationCount} ${t.updates}` : (language === 'vi' ? 'Không có cập nhật mới' : 'No new updates'),
      status: dashboard.notifications?.[0]?.title || t.ttcmSub,
      detail: dashboard.notifications?.[0]?.message || dashboard.notifications?.[0]?.description || t.ttcmSub,
      action: 'ttcm',
    }),
  ], [dashboard, dueSoonCount, language, nextTimelineItem, nextTimelineTarget, nextTimelineTime, notificationCount, overdueCount, t, todayCount]);

  const workTiles = useMemo(() => {
    const items = [];
    const dashboardApp = appBySlug.get('work-dashboard');
    const gradebook = appBySlug.get('gradebook-studio');
    if (dashboardApp) items.push({ ...dashboardApp, tileSize: 'large' });

    items.push(smartItem({
      slug: 'ttcm-live', icon: 'TT', tone: 'purple', title: t.ttcm,
      subtitle: t.ttcmSub,
      status: notificationCount ? `${notificationCount} ${t.updates}` : t.ttcmSub,
      detail: dashboard.notifications?.[0]?.title || t.ttcmSub,
      action: 'ttcm', tileSize: 'wide',
    }));

    if (canOpenHomeroom) {
      const classSummary = homeroom
        ? `${homeroom.className} · ${homeroom.studentCount} ${language === 'vi' ? 'HS' : 'students'}`
        : (language === 'vi' ? 'Mở không gian lớp chủ nhiệm' : 'Open homeroom workspace');
      const attendance = homeroom
        ? `${homeroom.absentToday} ${language === 'vi' ? 'vắng/trễ hôm nay' : 'absent/late today'}`
        : t.openHomeroom;
      items.push(smartItem({
        slug: 'homeroom-live', icon: 'CN', tone: 'mint', title: t.homeroom,
        subtitle: classSummary, status: attendance,
        detail: homeroom ? `${homeroom.reminders} ${language === 'vi' ? 'nhắc việc' : 'reminders'} · ${homeroom.alerts} ${language === 'vi' ? 'cảnh báo' : 'alerts'}` : t.openHomeroom,
        route: 'homeroom', tileSize: 'wide',
      }));
    }

    if (gradebook) items.push({ ...gradebook, tileSize: 'wide' });
    if (canOpenReports) {
      items.push(smartItem({
        slug: 'reports-live', icon: 'BC', tone: 'teal', title: t.reports,
        subtitle: dashboard.stats?.pendingApproval
          ? `${dashboard.stats.pendingApproval} ${language === 'vi' ? 'mục chờ xử lý' : 'items pending'}`
          : (language === 'vi' ? 'Báo cáo tháng & tiến độ' : 'Monthly reports & progress'),
        status: language === 'vi' ? 'Mở trung tâm báo cáo' : 'Open report center',
        detail: language === 'vi' ? 'Theo dõi thời hạn và báo cáo tổ chuyên môn' : 'Track deadlines and department reports',
        target: '#/tool/brian-team', tileSize: 'wide',
      }));
    }
    return items;
  }, [appBySlug, canOpenHomeroom, canOpenReports, dashboard, homeroom, language, notificationCount, t]);

  const teachingTiles = useMemo(() => {
    const items = filteredApps.filter((item) => clusterFor(item) === 'teaching' && !WORK_APP_SLUGS.has(item.slug));
    if (!query.trim()) {
      items.push(smartItem({
        slug: 'quick-create-live', icon: '+', tone: 'purple', title: t.quickCreate,
        subtitle: t.quickCreateSub,
        status: language === 'vi' ? '+ Hoạt động · + Học liệu · + Báo cáo' : '+ Activity · + Resource · + Report',
        detail: language === 'vi' ? 'Mở menu tạo nhanh' : 'Open quick-create menu',
        action: 'quick-create', tileSize: 'square',
      }));
    }
    return items;
  }, [filteredApps, language, query, t]);

  const utilityTiles = useMemo(() => {
    const items = filteredApps.filter((item) => (
      clusterFor(item) === 'studio'
      && !WORK_APP_SLUGS.has(item.slug)
      && !SYSTEM_APP_SLUGS.has(item.slug)
    ));
    if (!query.trim() && appBySlug.has('platform-readiness')) {
      items.push(smartItem({
        slug: 'system-health-live', icon: 'SY', tone: 'blue', title: t.systemHealth,
        subtitle: t.systemHealthSub,
        status: dashboard.sourceErrors?.length
          ? `${dashboard.sourceErrors.length} ${language === 'vi' ? 'nguồn cần kiểm tra' : 'sources need attention'}`
          : t.systemReady,
        detail: language === 'vi' ? 'Gom các công cụ vận hành vào một tile' : 'System operations in one tile',
        route: 'platform-readiness', tileSize: 'wide',
      }));
    }
    return items;
  }, [appBySlug, dashboard.sourceErrors, filteredApps, language, query, t]);

  const searchClusters = useMemo(() => {
    if (!query.trim()) return [];
    const map = new Map([['work', []], ['teaching', []], ['studio', []]]);
    filteredApps.forEach((item) => map.get(clusterFor(item))?.push(item));
    return ['work', 'teaching', 'studio']
      .map((id) => ({ id, items: map.get(id) || [] }))
      .filter((entry) => entry.items.length);
  }, [filteredApps, query]);

  const dateLabel = new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  }).format(now);
  const timeLabel = new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
    hour: '2-digit', minute: '2-digit',
  }).format(now);

  const activateItem = (item) => {
    if (item.action === 'ttcm') {
      window.dispatchEvent(new CustomEvent('bes-ttcm-open', { detail: { view: 'feed' } }));
      return;
    }
    if (item.action === 'quick-create') {
      setQuickCreateOpen(true);
      return;
    }
    window.location.hash = appTarget(item);
  };

  const openApp = (item, event) => {
    if (launchLockRef.current || isRetiredApp(item)) return;
    if (item.action === 'quick-create') {
      setQuickCreateOpen(true);
      return;
    }

    preloadApp(item);
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const source = event.currentTarget;
    if (reducedMotion || typeof source?.animate !== 'function') {
      activateItem(item);
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
      activateItem(item);
      nextPaint(() => {
        const reveal = overlay.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 180,
          easing: 'cubic-bezier(.2,.8,.2,1)',
          fill: 'forwards',
        });
        reveal.finished.then(cleanup).catch(cleanup);
      });
    }).catch(cleanup);
  };

  const openQuickTarget = (item) => {
    setQuickCreateOpen(false);
    preloadApp(item);
    window.setTimeout(() => activateItem(item), 40);
  };

  const renderTile = (item, index, clusterIndex = 0) => {
    const title = localized(item, 'title', language);
    const desc = localized(item, 'desc', language);
    const status = localized(item, 'status', language);
    const group = localized(item, 'group', language);
    const color = TILE_COLORS[item.tone] || TILE_COLORS.blue;
    const size = tileSize(item, index);
    const motionIndex = index + (clusterIndex * 7);
    const cycle = 6.4 + ((motionIndex % 5) * 0.52);
    const delay = -((motionIndex % 9) * 0.71);
    return (
      <button
        type="button"
        key={item.slug}
        className={`brian-live-tile is-${size} is-live ${item.smart ? 'is-smart' : ''}`}
        style={{ '--tile-color': color, '--tile-delay': `${delay}s`, '--tile-cycle': `${cycle}s` }}
        onPointerEnter={() => preloadApp(item)}
        onFocus={() => preloadApp(item)}
        onClick={(event) => openApp(item, event)}
        aria-label={`${t.open}: ${title}`}
      >
        <span className="brian-live-tile__topline">
          <span className="brian-live-tile__icon" aria-hidden="true">{item.icon || title.slice(0, 2)}</span>
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
          <span>{item.smart ? 'BRIAN · LIVE' : item.api ? 'BRIAN · ONLINE' : 'BRIAN · LOCAL'}</span>
          <span aria-hidden="true">→</span>
        </span>
      </button>
    );
  };

  const sections = query.trim()
    ? searchClusters
    : [
      { id: 'today', items: todayTiles },
      { id: 'work', items: workTiles },
      { id: 'teaching', items: teachingTiles },
      { id: 'studio', items: utilityTiles },
    ].filter((section) => section.items.length);

  const quickActions = [
    appBySlug.get('textlab-activities') ? { item: appBySlug.get('textlab-activities'), label: t.createActivity, icon: '+' } : null,
    appBySlug.get('resource-library-hub') ? { item: appBySlug.get('resource-library-hub'), label: t.uploadResource, icon: 'RL' } : null,
    canOpenReports ? { item: smartItem({ slug: 'reports-quick', icon: 'BC', tone: 'teal', title: t.reports, target: '#/tool/brian-team' }), label: t.openReport, icon: 'BC' } : null,
    canOpenHomeroom ? { item: smartItem({ slug: 'homeroom-quick', icon: 'CN', tone: 'mint', title: t.homeroom, route: 'homeroom' }), label: t.openHomeroom, icon: 'CN' } : null,
  ].filter(Boolean);

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

      {sections.length ? (
        <div className="brian-news-feed__clusters">
          {sections.map((section, sectionIndex) => (
            <section key={section.id} className={`brian-news-feed__cluster is-${section.id}`}>
              <h2>{t[section.id]}</h2>
              <div className="brian-news-feed__tiles">
                {section.items.map((item, index) => renderTile(item, index, sectionIndex))}
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

      {quickCreateOpen ? (
        <div className="brian-news-feed__quick-backdrop" role="presentation" onMouseDown={() => setQuickCreateOpen(false)}>
          <section className="brian-news-feed__quick-panel" role="dialog" aria-modal="true" aria-label={t.createTitle} onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div><span>+</span><h2>{t.createTitle}</h2></div>
              <button type="button" onClick={() => setQuickCreateOpen(false)} aria-label={t.close}>×</button>
            </header>
            <div className="brian-news-feed__quick-grid">
              {quickActions.map((action) => (
                <button type="button" key={action.item.slug} onClick={() => openQuickTarget(action.item)}>
                  <span>{action.icon}</span>
                  <strong>{action.label}</strong>
                  <em>→</em>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
