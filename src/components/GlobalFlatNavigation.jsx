import React, { useMemo } from 'react';
import { getFirstAllowedRoute, hasRouteAccess } from '../utils/permissions.js';
import { launchRoute } from '../utils/motion.js';

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

function go(route, label, sourceEl) {
  launchRoute({
    target: `#/${route}`,
    label: String(label || route || 'GO').slice(0, 2).toUpperCase(),
    color: routeColors[route] || '#191515',
    sourceEl,
  });
}

export default function GlobalFlatNavigation({
  route = 'home', language = 'vi', setLanguage, theme = 'light', setTheme,
  hasApiKey, currentUser, onLogout, fontScale = 100, setFontScale,
}) {
  const t = copy[language] || copy.vi;
  const isAdmin = currentUser?.role === 'admin';
  const baseItems = [
    { key: 'home', public: true },
    { key: 'apps' },
    { key: 'news', always: true },
    { key: 'games' },
    { key: 'department' },
    { key: 'homeroom' },
    { key: 'library' },
    { key: 'resource-library' },
  ];

  const items = useMemo(() => {
    const visible = baseItems.filter((item) => item.public || (currentUser && (item.always || hasRouteAccess(currentUser, item.key))));
    if (isAdmin) visible.push({ key: 'admin' });
    return visible;
  }, [currentUser, isAdmin]);

  const accountName = shortName(currentUser?.name || currentUser?.email, currentUser ? t.account : t.guest);
  const accountRoute = currentUser ? getFirstAllowedRoute(currentUser) : 'login';

  const increaseFontSize = () => {
    const sizes = [100, 110, 120, 130];
    const index = sizes.indexOf(Number(fontScale));
    const next = sizes[(index + 1) % sizes.length];
    setFontScale?.(next);
  };

  return (
    <nav className="global-flat-navigation" aria-label={language === 'vi' ? 'Điều hướng toàn hệ thống' : 'Global navigation'}>
      <button type="button" className="global-flat-brand" onClick={(event) => go('home', 'BE', event.currentTarget)}>
        <img className="global-flat-brand-logo" src="/brian-english-brand-mark.png" alt="Brian English logo" />
        <strong>Brian English</strong>
      </button>

      <div className="global-flat-links">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`global-flat-link ${route === item.key ? 'active' : ''}`}
            style={{ '--global-nav-accent': routeColors[item.key] }}
            onClick={(event) => go(item.key, t[item.key], event.currentTarget)}
            aria-current={route === item.key ? 'page' : undefined}
          >
            <span aria-hidden="true">{routeIcons[item.key] || '•'}</span>
            <b>{t[item.key]}</b>
          </button>
        ))}
      </div>

      <div className="global-flat-actions">
        <button type="button" className={`global-flat-mini ${hasApiKey ? 'ai-ready' : ''}`} onClick={(event) => go(currentUser ? 'settings' : 'login', 'AI', event.currentTarget)}>
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
        <button type="button" className="global-flat-account" onClick={(event) => go(accountRoute, 'ME', event.currentTarget)}>
          <span>{initial(currentUser?.name || currentUser?.email)}</span>
          <strong>{accountName}</strong>
        </button>
        {currentUser ? <button type="button" className="global-flat-logout" onClick={onLogout}>{t.logout}</button> : null}
      </div>
    </nav>
  );
}
