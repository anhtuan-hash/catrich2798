import React, { useMemo } from 'react';
import { getFirstAllowedRoute, hasRouteAccess } from '../utils/permissions.js';
import { launchRoute } from '../utils/motion.js';

const labels = {
  vi: {
    home: 'Trang chủ',
    apps: 'Ứng dụng',
    games: 'Trò chơi',
    department: 'Tổ chuyên môn',
    library: 'Thư viện',
    admin: 'Quản trị',
    login: 'Đăng nhập',
    register: 'Đăng kí',
    subtitle: 'Hệ thống dạy học sáng tạo',
    logout: 'Thoát',
    account: 'Tài khoản',
    guest: 'Khách',
  },
  en: {
    home: 'Home',
    apps: 'Apps',
    games: 'Games',
    department: 'Department',
    library: 'Library',
    admin: 'Admin',
    login: 'Sign in',
    register: 'Register',
    subtitle: 'Brian English',
    logout: 'Logout',
    account: 'Account',
    guest: 'Guest',
  },
};

const navIcons = {
  home: '⌂',
  apps: '▦',
  games: '◆',
  department: '◎',
  library: '▤',
  admin: '⚙',
  login: '↪',
  register: '+',
};

function navTo(path, sourceEl = null) {
  const colors = { home: '#ffc69d', apps: '#f05a7e', games: '#5b2a86', department: '#3b4cca', library: '#6fba7b', admin: '#d13438', login: '#191515', register: '#00a6a6', settings: '#123c69' };
  launchRoute({
    target: `#/${path}`,
    label: String(path || 'GO').slice(0, 2),
    color: colors[path] || '#0078d4',
    sourceEl,
  });
}

function getShortName(name) {
  if (!name) return 'Teacher';
  const parts = name.trim().split(/\s+/);
  return parts.length === 1 ? parts[0] : parts[parts.length - 1];
}

function getInitial(name) {
  if (!name) return 'A';
  return name.trim().charAt(0).toUpperCase();
}

export default function Navbar({ route, language, setLanguage, theme, setTheme, hasApiKey, currentUser, onLogout }) {
  const t = labels[language] || labels.vi;
  const baseItems = [
    ['home', t.home],
    ['apps', t.apps],
    ['games', t.games],
  ];
  const navItems = currentUser
    ? (currentUser.role === 'admin' ? [...baseItems, ['admin', t.admin]] : baseItems)
    : [['home', t.home], ['login', t.login], ['register', t.register]];

  const accountLabel = useMemo(() => getShortName(currentUser?.name || currentUser?.email || t.account), [currentUser, t.account]);
  const avatar = useMemo(() => getInitial(currentUser?.name || currentUser?.email || t.account), [currentUser, t.account]);
  const accountRoute = currentUser ? getFirstAllowedRoute(currentUser) : 'login';

  return (
    <header className="topbar metro-topbar bes-navbar" aria-label="Main navigation">
      <div className="nav-wrap bes-navbar-inner">
        <button className="brand bes-brand" onClick={(event) => navTo('home', event.currentTarget)} aria-label="Brian English Studio">
          <img className="brand-logo bes-brand-logo" src="/logo-brian-english.png" alt="Brian English logo" />
          <span className="bes-brand-text">
            <strong>Brian English</strong>
            <small>{t.subtitle}</small>
          </span>
        </button>

        <nav className="nav-links bes-nav-pills" aria-label="Primary navigation">
          {navItems.map(([key, label]) => (
            <button
              key={key}
              className={`bes-nav-pill ${route === key ? 'active' : ''}`}
              onClick={(event) => navTo(key, event.currentTarget)}
              aria-current={route === key ? 'page' : undefined}
              title={label}
            >
              <span className="bes-nav-pill-icon" aria-hidden="true">{navIcons[key] || '•'}</span>
              <span className="bes-nav-pill-label">{label}</span>
            </button>
          ))}
        </nav>

        <div className="nav-actions bes-nav-actions">
          <button className="bes-account-pill" onClick={(event) => navTo(accountRoute, event.currentTarget)} title={currentUser ? accountLabel : t.account}>
            <span className="bes-account-avatar" aria-hidden="true">{avatar}</span>
            <span className="bes-account-text">
              <strong>{currentUser ? accountLabel : t.account}</strong>
              <small>{currentUser ? currentUser.role : t.guest}</small>
            </span>
          </button>
          <button
            className={`bes-ai-pill ${hasApiKey ? 'ok' : ''}`}
            onClick={(event) => navTo(currentUser ? (hasRouteAccess(currentUser, 'settings') ? 'settings' : getFirstAllowedRoute(currentUser)) : 'login', event.currentTarget)}
            title={hasApiKey ? 'AI ON' : 'AI OFF'}
          >
            {hasApiKey ? 'AI ON' : 'AI OFF'}
          </button>
          <button className="bes-mini-pill" onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')} title={language === 'vi' ? 'Đổi sang tiếng Anh' : 'Switch to Vietnamese'}>
            {language === 'vi' ? 'VI' : 'EN'}
          </button>
          <button className="bes-mini-pill" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title={language === 'vi' ? 'Đổi giao diện sáng/tối' : 'Toggle light/dark theme'}>
            {theme === 'dark' ? '☀' : '☾'}
          </button>
          {currentUser ? <button className="bes-logout-pill" onClick={onLogout}>{t.logout}</button> : null}
        </div>
      </div>
    </header>
  );
}
