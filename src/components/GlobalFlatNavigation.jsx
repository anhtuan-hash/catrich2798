import React, { useEffect, useMemo, useRef, useState } from 'react';
import { APPS } from '../data/apps.js';
import { getAppDesignProfile } from '../data/designProfiles.js';
import { getFirstAllowedRoute, hasRouteAccess, hasToolAccess } from '../utils/permissions.js';
import { launchRoute } from '../utils/motion.js';
import { loadLauncherConfig, loadLauncherConfigFromCloud, normalizeLauncherConfig, subscribeLauncherConfig } from '../utils/launcherPreferences.js';
import { isAppHiddenForUser } from '../utils/appVisibility.js';
import { visibilityIdForRoute } from '../data/appVisibilityRegistry.js';
import './GlobalFlatNavigation.css';

const copy = {
  vi: {
    home: 'Trang chủ', apps: 'Ứng dụng', news: 'Đọc báo', games: 'Trò chơi', dashboard: 'Bảng điều hành', homeroom: 'Chủ nhiệm',
    library: 'Thư viện', 'resource-library': 'Kho học liệu', 'knowledge-hub': 'Kho thông minh', 'work-hub': 'Công việc',
    'content-factory': 'Xưởng học liệu', 'lesson-pack': 'Gói bài dạy', 'assessment-core': 'Ngân hàng đề',
    'platform-readiness': 'Sẵn sàng nền tảng', 'automation-center': 'Tự động hóa', 'cloud-operations': 'Vận hành nền',
    'collaboration-hub': 'Cộng tác', 'data-governance': 'Quản trị dữ liệu', resources: 'Tài nguyên', contact: 'Liên hệ',
    admin: 'Quản trị', 'app-vault': 'Ứng dụng đã ẩn', settings: 'Cài đặt', qa: 'Trạng thái', trash: 'Thùng rác',
    login: 'Đăng nhập', logout: 'Đăng xuất', account: 'Tài khoản', guest: 'Khách',
    menu: 'Menu', menuTitle: 'Không gian làm việc', menuSearch: 'Tìm ứng dụng hoặc khu vực…', noMenuResult: 'Không tìm thấy mục phù hợp.',
    notifications: 'Thông báo', all: 'Tất cả', unread: 'Chưa đọc', markAll: 'Đánh dấu đã đọc', clearRead: 'Xóa mục đã đọc',
    emptyNotifications: 'Chưa có thông báo mới.', notificationHint: 'Thông báo từ các ứng dụng sẽ xuất hiện tại đây.',
    close: 'Đóng', search: 'Tìm nhanh', fontSize: 'Cỡ chữ', language: 'Ngôn ngữ', appearance: 'Giao diện',
    aiReady: 'AI sẵn sàng', aiOff: 'AI chưa cấu hình', profile: 'Hồ sơ và tùy chọn', openSettings: 'Mở cài đặt',
    workspace: 'Công việc', teaching: 'Dạy học', resourcesGroup: 'Học liệu', system: 'Hệ thống', toolsGroup: 'Ứng dụng',
    justNow: 'Vừa xong', minutesAgo: 'phút trước', hoursAgo: 'giờ trước', current: 'Đang mở',
  },
  en: {
    home: 'Home', apps: 'Apps', news: 'News', games: 'Games', dashboard: 'Dashboard', homeroom: 'Homeroom',
    library: 'Library', 'resource-library': 'Resource Hub', 'knowledge-hub': 'Smart Knowledge', 'work-hub': 'Work Hub',
    'content-factory': 'Content Factory', 'lesson-pack': 'Lesson Pack', 'assessment-core': 'Assessment',
    'platform-readiness': 'Platform Readiness', 'automation-center': 'Automation', 'cloud-operations': 'Cloud Operations',
    'collaboration-hub': 'Collaboration', 'data-governance': 'Data Governance', resources: 'Resources', contact: 'Contact',
    admin: 'Admin', 'app-vault': 'Hidden Apps', settings: 'Settings', qa: 'System health', trash: 'Trash',
    login: 'Sign in', logout: 'Logout', account: 'Account', guest: 'Guest',
    menu: 'Menu', menuTitle: 'Workspace', menuSearch: 'Find an app or workspace…', noMenuResult: 'No matching item found.',
    notifications: 'Notifications', all: 'All', unread: 'Unread', markAll: 'Mark all read', clearRead: 'Clear read',
    emptyNotifications: 'No new notifications.', notificationHint: 'Updates from your apps will appear here.',
    close: 'Close', search: 'Quick search', fontSize: 'Text size', language: 'Language', appearance: 'Appearance',
    aiReady: 'AI ready', aiOff: 'AI not configured', profile: 'Profile and preferences', openSettings: 'Open settings',
    workspace: 'Workspace', teaching: 'Teaching', resourcesGroup: 'Resources', system: 'System', toolsGroup: 'Apps',
    justNow: 'Just now', minutesAgo: 'min ago', hoursAgo: 'hr ago', current: 'Current',
  },
};

const routeColors = {
  home: '#ffc69d', apps: '#f05a7e', news: '#167d78', games: '#5b2a86', dashboard: '#315fc4', homeroom: '#1f8f70',
  library: '#6fba7b', 'resource-library': '#2878d0', 'knowledge-hub': '#315fc4', 'work-hub': '#14866d',
  'content-factory': '#ef7a42', 'lesson-pack': '#315fc4', 'assessment-core': '#cc7621', 'platform-readiness': '#0f766e',
  'automation-center': '#1269b0', 'cloud-operations': '#167b68', 'collaboration-hub': '#315fc4', 'data-governance': '#a24b35',
  resources: '#d99a1e', contact: '#00a6a6', admin: '#d13438', 'app-vault': '#684cc6', settings: '#123c69',
  qa: '#123c69', trash: '#a43b57', login: '#191515',
};

const routeIcons = {
  home: '⌂', apps: '▦', news: '▤', games: '◈', dashboard: 'DB', homeroom: 'CN', library: 'TV',
  'resource-library': 'HL', 'knowledge-hub': 'KT', 'work-hub': 'CV', 'content-factory': 'CF', 'lesson-pack': 'LP',
  'assessment-core': 'ĐG', 'platform-readiness': 'PR', 'automation-center': 'AU', 'cloud-operations': 'CO',
  'collaboration-hub': 'CH', 'data-governance': 'DG', resources: 'TN', contact: '✉', admin: 'QT',
  'app-vault': 'HV', settings: '⚙', qa: '♥', trash: '⌫', login: '↪',
};

const routeGroups = {
  home: 'workspace', dashboard: 'workspace', homeroom: 'workspace', 'work-hub': 'workspace', 'collaboration-hub': 'workspace',
  apps: 'toolsGroup', games: 'toolsGroup', news: 'toolsGroup', 'content-factory': 'teaching', 'lesson-pack': 'teaching',
  'assessment-core': 'teaching', 'automation-center': 'teaching', library: 'resourcesGroup', 'resource-library': 'resourcesGroup',
  'knowledge-hub': 'resourcesGroup', resources: 'resourcesGroup', 'platform-readiness': 'system', 'cloud-operations': 'system',
  'data-governance': 'system', settings: 'system', qa: 'system', trash: 'system', admin: 'system', 'app-vault': 'system', contact: 'system',
};

const ROUTE_KEYS = Object.keys(routeColors);
const GROUP_ORDER = ['workspace', 'teaching', 'resourcesGroup', 'toolsGroup', 'system'];
const NOTIFICATION_EVENT_NAMES = ['bes-global-notification', 'bes:notification'];

function shortName(value, fallback) {
  const text = String(value || '').trim();
  if (!text) return fallback;
  if (text.includes('@')) return text.split('@')[0];
  const parts = text.split(/\s+/);
  return parts[parts.length - 1] || fallback;
}

function initial(value) {
  return String(value || 'A').trim().slice(0, 1).toUpperCase() || 'A';
}

function go(target, label, color, sourceEl) {
  launchRoute({
    target: target.startsWith('#/') ? target : `#/${target}`,
    label: String(label || target || 'GO').slice(0, 2).toUpperCase(),
    color: color || '#191515',
    sourceEl,
  });
}

function appLabel(app, language) {
  return language === 'vi' ? app.titleVi || app.title : app.title;
}

function buildRegistry(language) {
  const t = copy[language] || copy.vi;
  const registry = new Map();
  ROUTE_KEYS.forEach((route) => {
    registry.set(`route:${route}`, {
      id: `route:${route}`,
      kind: 'route',
      route,
      group: routeGroups[route] || 'toolsGroup',
      target: `#/${route}`,
      label: t[route] || route,
      icon: routeIcons[route] || '•',
      color: routeColors[route] || '#191515',
    });
  });
  APPS.forEach((app) => {
    const profile = getAppDesignProfile(app.slug);
    registry.set(`tool:${app.slug}`, {
      id: `tool:${app.slug}`,
      kind: 'tool',
      slug: app.slug,
      group: 'toolsGroup',
      target: `#/tool/${app.slug}`,
      label: appLabel(app, language),
      icon: String(app.icon || app.title || 'AP').slice(0, 2).toUpperCase(),
      color: profile.accent,
      app,
    });
  });
  return registry;
}

function canShow(entry, currentUser, visibilitySnapshot) {
  if (!entry) return false;
  if (!currentUser) return entry.route === 'home';
  if (String(currentUser.role || '').toLowerCase() === 'admin') return true;
  const visibilityId = entry.kind === 'tool' ? entry.id : visibilityIdForRoute(entry.route);
  if (isAppHiddenForUser(visibilitySnapshot, currentUser, visibilityId)) return false;
  if (entry.kind === 'tool') return hasToolAccess(currentUser, entry.slug);
  return hasRouteAccess(currentUser, entry.route);
}

function notificationStorageKey(currentUser) {
  const identity = currentUser?.id || currentUser?.email || 'guest';
  return `bes-global-notifications:${identity}`;
}

function readStoredNotifications(key) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed.slice(0, 100) : [];
  } catch {
    return [];
  }
}

function normalizeNotification(detail = {}) {
  const createdAt = detail.createdAt || detail.created_at || new Date().toISOString();
  const id = String(detail.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  return {
    id,
    title: String(detail.title || detail.subject || 'Brian English'),
    message: String(detail.message || detail.body || detail.description || ''),
    source: String(detail.source || detail.app || ''),
    kind: String(detail.kind || detail.type || 'info').replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'info',
    target: String(detail.target || detail.href || detail.url || ''),
    createdAt,
    read: Boolean(detail.read || detail.readAt || detail.read_at),
  };
}

function relativeTime(value, language, t) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return '';
  const diff = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t.justNow;
  if (minutes < 60) return `${minutes} ${t.minutesAgo}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${t.hoursAgo}`;
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(timestamp));
}

function resolveSafeNotificationTarget(target) {
  const value = String(target || '').trim();
  if (!value) return null;
  if (value.startsWith('#/')) return { type: 'route', value };
  try {
    const url = new URL(value, window.location.origin);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return { type: 'url', value: url.href };
  } catch {
    return null;
  }
}

export default function GlobalFlatNavigation({
  route = 'home', selectedTool = null, language = 'vi', setLanguage, theme = 'light', setTheme,
  hasApiKey, currentUser, onLogout, fontScale = 100, setFontScale, appVisibility: externalAppVisibility,
}) {
  const t = copy[language] || copy.vi;
  const isAdmin = String(currentUser?.role || '').toLowerCase() === 'admin';
  const appVisibility = externalAppVisibility || { snapshot: {} };
  const [launcherConfig, setLauncherConfig] = useState(() => normalizeLauncherConfig(loadLauncherConfig()));
  const [activePanel, setActivePanel] = useState(null);
  const [menuQuery, setMenuQuery] = useState('');
  const [notificationFilter, setNotificationFilter] = useState('all');
  const storageKey = useMemo(() => notificationStorageKey(currentUser), [currentUser?.id, currentUser?.email]);
  const [notificationState, setNotificationState] = useState(() => ({
    key: storageKey,
    items: readStoredNotifications(storageKey),
  }));
  const panelRef = useRef(null);
  const lastTriggerRef = useRef(null);

  const notifications = notificationState.key === storageKey ? notificationState.items : [];
  const updateNotifications = (updater) => {
    setNotificationState((current) => {
      const base = current.key === storageKey ? current.items : readStoredNotifications(storageKey);
      const nextItems = typeof updater === 'function' ? updater(base) : updater;
      return { key: storageKey, items: Array.isArray(nextItems) ? nextItems.slice(0, 100) : base };
    });
  };

  useEffect(() => {
    let active = true;
    loadLauncherConfigFromCloud()
      .then(({ config }) => { if (active) setLauncherConfig(normalizeLauncherConfig(config)); })
      .catch((error) => console.warn('[Launcher] cloud navigation fallback', error));
    const unsubscribe = subscribeLauncherConfig((next) => setLauncherConfig(normalizeLauncherConfig(next)));
    return () => { active = false; unsubscribe(); };
  }, []);

  useEffect(() => {
    setNotificationState({ key: storageKey, items: readStoredNotifications(storageKey) });
  }, [storageKey]);

  useEffect(() => {
    if (notificationState.key !== storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(notificationState.items.slice(0, 100)));
    } catch {
      /* optional */
    }
  }, [notificationState, storageKey]);

  useEffect(() => {
    const onNotification = (event) => {
      const next = normalizeNotification(event.detail || {});
      updateNotifications((current) => [next, ...current.filter((item) => item.id !== next.id)]);
    };
    const onOpen = (event) => {
      lastTriggerRef.current = event?.detail?.trigger || document.activeElement;
      setActivePanel('notifications');
    };
    const onStorage = (event) => {
      if (event.key === storageKey) {
        setNotificationState({ key: storageKey, items: readStoredNotifications(storageKey) });
      }
    };
    NOTIFICATION_EVENT_NAMES.forEach((name) => window.addEventListener(name, onNotification));
    window.addEventListener('bes-notification-center-open', onOpen);
    window.addEventListener('storage', onStorage);
    return () => {
      NOTIFICATION_EVENT_NAMES.forEach((name) => window.removeEventListener(name, onNotification));
      window.removeEventListener('bes-notification-center-open', onOpen);
      window.removeEventListener('storage', onStorage);
    };
  }, [storageKey]);

  const closePanel = () => {
    setActivePanel(null);
    window.setTimeout(() => lastTriggerRef.current?.focus?.(), 0);
  };

  const togglePanel = (panel, trigger) => {
    lastTriggerRef.current = trigger || document.activeElement;
    setActivePanel((current) => current === panel ? null : panel);
    if (panel !== 'menu') setMenuQuery('');
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closePanel();
    };
    const onRoute = () => {
      setActivePanel(null);
      setMenuQuery('');
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('hashchange', onRoute);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('hashchange', onRoute);
    };
  }, []);

  useEffect(() => {
    if (!activePanel) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => panelRef.current?.focus?.(), 40);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(timer);
    };
  }, [activePanel]);

  const registry = useMemo(() => buildRegistry(language), [language]);
  const entries = useMemo(() => {
    const navItems = Array.isArray(launcherConfig?.nav) ? launcherConfig.nav : [];
    const requested = navItems.length ? navItems : ['route:home', 'route:apps', 'route:news', 'route:games'];
    const ids = ['route:home', 'route:apps', ...requested];
    if (isAdmin) ids.push('route:admin');
    const seen = new Set();
    return ids
      .map((id) => registry.get(id))
      .filter((entry) => {
        if (!entry || seen.has(entry.id) || !canShow(entry, currentUser, appVisibility?.snapshot)) return false;
        seen.add(entry.id);
        return true;
      })
      .slice(0, 7);
  }, [launcherConfig?.nav, registry, currentUser, isAdmin, appVisibility?.snapshot]);

  const drawerEntries = useMemo(() => {
    const requestedIds = Array.isArray(launcherConfig?.order) ? launcherConfig.order : [];
    const baseIds = [
      ...entries.map((entry) => entry.id),
      ...requestedIds,
      'route:dashboard', 'route:homeroom', 'route:work-hub', 'route:library', 'route:resource-library',
      'route:knowledge-hub', 'route:content-factory', 'route:lesson-pack', 'route:assessment-core',
      'route:automation-center', 'route:collaboration-hub', 'route:settings', 'route:trash',
    ];
    if (isAdmin) baseIds.push('route:platform-readiness', 'route:cloud-operations', 'route:data-governance', 'route:app-vault', 'route:qa', 'route:admin');
    APPS.forEach((app) => baseIds.push(`tool:${app.slug}`));
    const seen = new Set();
    return baseIds.map((id) => registry.get(id)).filter((entry) => {
      if (!entry || seen.has(entry.id) || !canShow(entry, currentUser, appVisibility?.snapshot)) return false;
      seen.add(entry.id);
      return true;
    });
  }, [entries, launcherConfig?.order, registry, currentUser, isAdmin, appVisibility?.snapshot]);

  const filteredDrawerEntries = useMemo(() => {
    const locale = language === 'vi' ? 'vi-VN' : 'en-US';
    const query = menuQuery.trim().toLocaleLowerCase(locale);
    if (!query) return drawerEntries;
    return drawerEntries.filter((entry) => `${entry.label} ${entry.slug || ''} ${entry.route || ''}`.toLocaleLowerCase(locale).includes(query));
  }, [drawerEntries, menuQuery, language]);

  const menuGroups = useMemo(() => GROUP_ORDER.map((group) => ({
    id: group,
    label: t[group],
    entries: filteredDrawerEntries.filter((entry) => entry.group === group),
  })).filter((group) => group.entries.length), [filteredDrawerEntries, t]);

  const accountName = shortName(currentUser?.name || currentUser?.email, currentUser ? t.account : t.guest);
  const accountRoute = currentUser ? getFirstAllowedRoute(currentUser) : 'login';
  const activeId = route === 'tool' && selectedTool?.slug ? `tool:${selectedTool.slug}` : `route:${route}`;
  const activeEntry = registry.get(activeId);
  const activeLabel = selectedTool ? appLabel(selectedTool, language) : activeEntry?.label || t.home;
  const activeColor = activeEntry?.color || getAppDesignProfile(selectedTool?.slug || '').accent || routeColors.home;
  const unreadCount = notifications.filter((item) => !item.read).length;
  const visibleNotifications = notificationFilter === 'unread' ? notifications.filter((item) => !item.read) : notifications;

  const increaseFontSize = () => {
    const sizes = [100, 110, 120, 130];
    const index = sizes.indexOf(Number(fontScale));
    setFontScale?.(sizes[(index + 1) % sizes.length]);
  };

  const markNotificationRead = (id) => {
    updateNotifications((current) => current.map((item) => item.id === id ? { ...item, read: true } : item));
  };

  const openNotification = (item, event) => {
    markNotificationRead(item.id);
    const target = resolveSafeNotificationTarget(item.target);
    if (!target) return;
    closePanel();
    if (target.type === 'route') go(target.value, item.title, activeColor, event.currentTarget);
    else window.location.assign(target.value);
  };

  return (
    <nav className="brian-global-shell" aria-label={language === 'vi' ? 'Điều hướng toàn hệ thống' : 'Global navigation'}>
      <div className="brian-shell-bar">
        <button type="button" className="brian-shell-brand" onClick={(event) => go('#/home', 'BE', routeColors.home, event.currentTarget)}>
          <img src="/brian-english-brand-mark.png" alt="" />
          <span><strong>Brian English</strong><small>Teaching Studio</small></span>
        </button>

        <div className="brian-shell-context" style={{ '--context-accent': activeColor }}>
          <span aria-hidden="true">{activeEntry?.icon || String(selectedTool?.icon || 'BR').slice(0, 2)}</span>
          <div><small>{t.current}</small><strong>{activeLabel}</strong></div>
        </div>

        <div className="brian-shell-primary" data-custom-launcher="true">
          {entries.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={activeId === entry.id ? 'active' : ''}
              style={{ '--nav-accent': entry.color }}
              onClick={(event) => go(entry.target, entry.label, entry.color, event.currentTarget)}
              aria-current={activeId === entry.id ? 'page' : undefined}
              title={entry.label}
            >
              <span aria-hidden="true">{entry.icon}</span><b>{entry.label}</b>
            </button>
          ))}
        </div>

        <div className="brian-shell-actions">
          <button type="button" className="brian-shell-icon-button global-command-trigger" onClick={() => window.dispatchEvent(new CustomEvent('bes-command-palette-open'))} aria-label={t.search} title={`${t.search} · ⌘K / Ctrl+K`}>
            <span aria-hidden="true">⌕</span><small>⌘K</small>
          </button>
          {currentUser ? (
            <button
              type="button"
              className={`brian-shell-icon-button ${activePanel === 'notifications' ? 'active' : ''}`}
              onClick={(event) => togglePanel('notifications', event.currentTarget)}
              aria-label={`${t.notifications}: ${unreadCount}`}
              aria-expanded={activePanel === 'notifications'}
              aria-controls="brian-shell-panel-notifications"
            >
              <span aria-hidden="true">♢</span>{unreadCount > 0 ? <b className="brian-shell-badge">{unreadCount > 99 ? '99+' : unreadCount}</b> : null}
            </button>
          ) : null}
          <button
            type="button"
            className={`brian-shell-menu-button ${activePanel === 'menu' ? 'active' : ''}`}
            onClick={(event) => togglePanel('menu', event.currentTarget)}
            aria-expanded={activePanel === 'menu'}
            aria-controls="brian-shell-panel-menu"
          >
            <span aria-hidden="true">☰</span><b>{t.menu}</b>
          </button>
          <button
            type="button"
            className={`brian-shell-account ${activePanel === 'account' ? 'active' : ''}`}
            onClick={(event) => currentUser ? togglePanel('account', event.currentTarget) : go(`#/${accountRoute}`, 'ME', '#191515', event.currentTarget)}
            aria-expanded={currentUser ? activePanel === 'account' : undefined}
            aria-controls={currentUser ? 'brian-shell-panel-account' : undefined}
          >
            <span>{initial(currentUser?.name || currentUser?.email)}</span><strong>{accountName}</strong>
          </button>
        </div>
      </div>

      {activePanel ? (
        <div className="brian-shell-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) closePanel(); }}>
          <section
            ref={panelRef}
            id={`brian-shell-panel-${activePanel}`}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            className={`brian-shell-panel brian-shell-panel-${activePanel}`}
            aria-label={activePanel === 'notifications' ? t.notifications : activePanel === 'menu' ? t.menuTitle : t.profile}
            data-testid={`brian-shell-panel-${activePanel}`}
          >
            <header className="brian-shell-panel-header">
              <div>
                <small>BRIAN ENGLISH</small>
                <h2>{activePanel === 'notifications' ? t.notifications : activePanel === 'menu' ? t.menuTitle : t.profile}</h2>
              </div>
              <button type="button" onClick={closePanel} aria-label={t.close}>×</button>
            </header>

            {activePanel === 'menu' ? (
              <div className="brian-shell-menu-content">
                <label className="brian-shell-menu-search">
                  <span aria-hidden="true">⌕</span>
                  <input value={menuQuery} onChange={(event) => setMenuQuery(event.target.value)} placeholder={t.menuSearch} autoFocus />
                  {menuQuery ? <button type="button" onClick={() => setMenuQuery('')} aria-label={t.close}>×</button> : null}
                </label>
                <div className="brian-shell-menu-groups">
                  {menuGroups.map((group) => (
                    <section key={group.id} className="brian-shell-menu-group">
                      <h3>{group.label}</h3>
                      <div className="brian-shell-menu-grid">
                        {group.entries.map((entry) => (
                          <button key={entry.id} type="button" className={activeId === entry.id ? 'active' : ''} style={{ '--item-accent': entry.color }} onClick={(event) => { closePanel(); go(entry.target, entry.label, entry.color, event.currentTarget); }}>
                            <span aria-hidden="true">{entry.icon}</span>
                            <div><b>{entry.label}</b><small>{entry.kind === 'tool' ? t.toolsGroup : group.label}</small></div>
                          </button>
                        ))}
                      </div>
                    </section>
                  ))}
                  {!menuGroups.length ? <div className="brian-shell-empty"><span>⌕</span><strong>{t.noMenuResult}</strong></div> : null}
                </div>
              </div>
            ) : null}

            {activePanel === 'notifications' ? (
              <div className="brian-shell-notification-content">
                <div className="brian-shell-notification-toolbar">
                  <div className="brian-shell-tabs">
                    <button type="button" className={notificationFilter === 'all' ? 'active' : ''} onClick={() => setNotificationFilter('all')}>{t.all}<span>{notifications.length}</span></button>
                    <button type="button" className={notificationFilter === 'unread' ? 'active' : ''} onClick={() => setNotificationFilter('unread')}>{t.unread}<span>{unreadCount}</span></button>
                  </div>
                  <div className="brian-shell-notification-actions">
                    <button type="button" disabled={!unreadCount} onClick={() => updateNotifications((current) => current.map((item) => ({ ...item, read: true })))}>{t.markAll}</button>
                    <button type="button" disabled={!notifications.some((item) => item.read)} onClick={() => updateNotifications((current) => current.filter((item) => !item.read))}>{t.clearRead}</button>
                  </div>
                </div>
                <div className="brian-shell-notification-list" aria-live="polite">
                  {visibleNotifications.map((item) => (
                    <article key={item.id} className={`${item.read ? 'read' : 'unread'} kind-${item.kind}`}>
                      <button type="button" className="brian-shell-notification-main" onClick={(event) => openNotification(item, event)}>
                        <span className="brian-shell-notification-dot" aria-hidden="true" />
                        <div>
                          <div className="brian-shell-notification-meta"><b>{item.source || 'Brian English'}</b><time>{relativeTime(item.createdAt, language, t)}</time></div>
                          <h3>{item.title}</h3>
                          {item.message ? <p>{item.message}</p> : null}
                        </div>
                      </button>
                      {!item.read ? <button type="button" className="brian-shell-mark-read" onClick={() => markNotificationRead(item.id)} aria-label={t.markAll}>✓</button> : null}
                    </article>
                  ))}
                  {!visibleNotifications.length ? (
                    <div className="brian-shell-empty brian-shell-notification-empty"><span>♢</span><strong>{t.emptyNotifications}</strong><p>{t.notificationHint}</p></div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {activePanel === 'account' ? (
              <div className="brian-shell-account-content">
                <section className="brian-shell-profile-card">
                  <span>{initial(currentUser?.name || currentUser?.email)}</span>
                  <div><h3>{currentUser?.name || accountName}</h3><p>{currentUser?.email || currentUser?.role || ''}</p></div>
                  <em>{currentUser?.role || t.account}</em>
                </section>
                <div className="brian-shell-preferences">
                  <button type="button" onClick={increaseFontSize}><span>A+</span><div><b>{t.fontSize}</b><small>{fontScale}%</small></div></button>
                  <button type="button" onClick={() => setLanguage?.(language === 'vi' ? 'en' : 'vi')}><span>文</span><div><b>{t.language}</b><small>{language === 'vi' ? 'Tiếng Việt' : 'English'}</small></div></button>
                  <button type="button" onClick={() => setTheme?.(theme === 'dark' ? 'light' : 'dark')}><span>{theme === 'dark' ? '☀' : '☾'}</span><div><b>{t.appearance}</b><small>{theme === 'dark' ? 'Dark' : 'Light'}</small></div></button>
                  <button type="button" onClick={(event) => { closePanel(); go('#/settings', 'AI', hasApiKey ? '#2bb7b3' : '#f7d23b', event.currentTarget); }}><span>AI</span><div><b>{hasApiKey ? t.aiReady : t.aiOff}</b><small>{t.openSettings}</small></div></button>
                </div>
                <div className="brian-shell-account-footer">
                  <button type="button" onClick={(event) => { closePanel(); go('#/settings', 'ST', routeColors.settings, event.currentTarget); }}>{t.openSettings}</button>
                  <button type="button" className="danger" onClick={onLogout}>{t.logout}</button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </nav>
  );
}
