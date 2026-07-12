import React, { useEffect, useMemo, useState } from 'react';
import { APPS } from '../data/apps.js';
import { getAppDesignProfile } from '../data/designProfiles.js';
import { getFirstAllowedRoute, hasRouteAccess, hasToolAccess } from '../utils/permissions.js';
import { launchRoute } from '../utils/motion.js';
import { loadLauncherConfig, loadLauncherConfigFromCloud, normalizeLauncherConfig, subscribeLauncherConfig } from '../utils/launcherPreferences.js';

const copy = {
  vi: {
    home: 'Trang chủ', apps: 'Ứng dụng', news: 'Đọc báo', games: 'Trò chơi', department: 'Tổ chuyên môn', homeroom: 'Chủ nhiệm',
    library: 'Thư viện', 'resource-library': 'Kho học liệu', resources: 'Tài nguyên', contact: 'Liên hệ', admin: 'Quản trị',
    login: 'Đăng nhập', settings: 'Cài đặt', logout: 'Thoát', subtitle: 'Hệ thống dạy học sáng tạo',
    account: 'Tài khoản', guest: 'Khách', aiReady: 'AI sẵn sàng', aiOff: 'AI chưa cài', fontSize: 'Tăng cỡ chữ',
  },
  en: {
    home: 'Home', apps: 'Apps', news: 'News', games: 'Games', department: 'Department', homeroom: 'Homeroom',
    library: 'Library', 'resource-library': 'Resources Hub', resources: 'Resources', contact: 'Contact', admin: 'Admin',
    login: 'Sign in', settings: 'Settings', logout: 'Logout', subtitle: 'Brian English',
    account: 'Account', guest: 'Guest', aiReady: 'AI ready', aiOff: 'AI not set', fontSize: 'Increase text size',
  },
};

const routeColors = {
  home: '#ffc69d', apps: '#f05a7e', news: '#167d78', games: '#5b2a86', department: '#3b4cca', homeroom: '#1f8f70',
  library: '#6fba7b', 'resource-library': '#2878d0', resources: '#d99a1e', contact: '#00a6a6', admin: '#d13438',
  settings: '#123c69', login: '#191515',
};

const routeIcons = {
  home: '⌂', apps: '▦', news: '▤', games: '◈', department: '▦', homeroom: '♙', library: '▤', 'resource-library': '▥',
  resources: '▦', contact: '✉', admin: '☼', settings: '⚙', login: '↪',
};

const ROUTE_KEYS = ['home', 'apps', 'news', 'games', 'department', 'homeroom', 'library', 'resource-library', 'resources', 'contact', 'admin', 'settings'];

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
      target: `#/tool/${app.slug}`,
      label: appLabel(app, language),
      icon: String(app.icon || app.title || 'AP').slice(0, 2).toUpperCase(),
      color: profile.accent,
      app,
    });
  });
  return registry;
}

function canShow(entry, currentUser) {
  if (!entry) return false;
  if (!currentUser) return entry.route === 'home';
  if (currentUser.role === 'admin') return true;
  if (entry.kind === 'tool') return hasToolAccess(currentUser, entry.slug);
  return hasRouteAccess(currentUser, entry.route);
}

export default function GlobalFlatNavigation({
  route = 'home', selectedTool = null, language = 'vi', setLanguage, theme = 'light', setTheme,
  hasApiKey, currentUser, onLogout, fontScale = 100, setFontScale,
}) {
  const t = copy[language] || copy.vi;
  const isAdmin = currentUser?.role === 'admin';
  const [launcherConfig, setLauncherConfig] = useState(() => normalizeLauncherConfig(loadLauncherConfig()));

  useEffect(() => {
    let active = true;
    loadLauncherConfigFromCloud()
      .then(({ config }) => { if (active) setLauncherConfig(normalizeLauncherConfig(config)); })
      .catch((error) => console.warn('[Launcher] cloud navigation fallback', error));
    const unsubscribe = subscribeLauncherConfig((next) => setLauncherConfig(normalizeLauncherConfig(next)));
    return () => { active = false; unsubscribe(); };
  }, []);

  const registry = useMemo(() => buildRegistry(language), [language]);
  const entries = useMemo(() => {
    const navItems = Array.isArray(launcherConfig?.nav) ? launcherConfig.nav : [];
    const requested = navItems.length ? navItems : ['route:home', 'route:apps', 'route:news', 'route:games'];
    const mandatory = ['route:home', 'route:apps'];
    const ids = [...mandatory, ...requested];
    if (isAdmin) ids.push('route:admin');
    const seen = new Set();
    return ids
      .map((id) => registry.get(id))
      .filter((entry) => {
        if (!entry || seen.has(entry.id) || !canShow(entry, currentUser)) return false;
        seen.add(entry.id);
        return true;
      })
      .slice(0, 12);
  }, [launcherConfig?.nav, registry, currentUser, isAdmin]);

  const accountName = shortName(currentUser?.name || currentUser?.email, currentUser ? t.account : t.guest);
  const accountRoute = currentUser ? getFirstAllowedRoute(currentUser) : 'login';

  const increaseFontSize = () => {
    const sizes = [100, 110, 120, 130];
    const index = sizes.indexOf(Number(fontScale));
    const next = sizes[(index + 1) % sizes.length];
    setFontScale?.(next);
  };

  const activeId = route === 'tool' && selectedTool?.slug ? `tool:${selectedTool.slug}` : `route:${route}`;

  return (
    <nav className="global-flat-navigation" aria-label={language === 'vi' ? 'Điều hướng toàn hệ thống' : 'Global navigation'}>
      <button type="button" className="global-flat-brand" onClick={(event) => go('#/home', 'BE', routeColors.home, event.currentTarget)}>
        <img className="global-flat-brand-logo" src="/brian-english-brand-mark.png" alt="Brian English logo" />
        <strong>Brian English</strong>
      </button>

      <div className="global-flat-links" data-custom-launcher="true">
        {entries.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`global-flat-link ${activeId === entry.id ? 'active' : ''} ${entry.kind === 'tool' ? 'is-tool-shortcut' : ''}`}
            style={{ '--global-nav-accent': entry.color }}
            onClick={(event) => go(entry.target, entry.label, entry.color, event.currentTarget)}
            aria-current={activeId === entry.id ? 'page' : undefined}
            title={entry.label}
          >
            <span aria-hidden="true">{entry.icon}</span>
            <b>{entry.label}</b>
          </button>
        ))}
      </div>

      <div className="global-flat-actions">
        <button type="button" className={`global-flat-mini ${hasApiKey ? 'ai-ready' : ''}`} onClick={(event) => go(currentUser ? '#/settings' : '#/login', 'AI', hasApiKey ? '#2bb7b3' : '#f7d23b', event.currentTarget)}>
          {hasApiKey ? t.aiReady : t.aiOff}
        </button>
        <button
          type="button"
          className="global-flat-mini global-font-size-btn"
          onClick={increaseFontSize}
          aria-label={`${t.fontSize}: ${fontScale}%`}
          title={`${t.fontSize}: ${fontScale}%`}
        >
          <span aria-hidden="true">A+</span><small>{fontScale}%</small>
        </button>
        <button type="button" className="global-flat-mini" onClick={() => setLanguage?.(language === 'vi' ? 'en' : 'vi')}>{language === 'vi' ? 'VI' : 'EN'}</button>
        <button type="button" className="global-flat-mini icon-only" onClick={() => setTheme?.(theme === 'dark' ? 'light' : 'dark')} aria-label={language === 'vi' ? 'Đổi chế độ sáng tối' : 'Toggle theme'}>{theme === 'dark' ? '☀' : '☾'}</button>
        <button type="button" className="global-flat-account" onClick={(event) => go(`#/${accountRoute}`, 'ME', '#191515', event.currentTarget)}>
          <span>{initial(currentUser?.name || currentUser?.email)}</span>
          <strong>{accountName}</strong>
        </button>
        {currentUser ? <button type="button" className="global-flat-logout" onClick={onLogout}>{t.logout}</button> : null}
      </div>
    </nav>
  );
}
