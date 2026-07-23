import React, { useEffect, useMemo, useRef, useState } from 'react';
import { hasRouteAccess } from '../utils/permissions.js';
import { launchRoute } from '../utils/motion.js';
import './GlobalCompactNavigation.css';

const copy = {
  vi: {
    home: 'Trang chủ', apps: 'Ứng dụng', admin: 'Quản trị', search: 'Tìm ứng dụng, tài liệu…',
    theme: 'Đổi chế độ sáng tối', notifications: 'Thông báo', noNotifications: 'Chưa có thông báo mới.',
    markAll: 'Đánh dấu tất cả đã đọc', account: 'Tài khoản', guest: 'Khách', profile: 'Hồ sơ & cài đặt',
    manageApps: 'Quản lý ứng dụng', hiddenApps: 'Ứng dụng đã ẩn', display: 'Cỡ chữ', language: 'Ngôn ngữ',
    logout: 'Đăng xuất', chatbot: 'Chatbot', login: 'Đăng nhập', unread: 'chưa đọc',
  },
  en: {
    home: 'Home', apps: 'Apps', admin: 'Admin', search: 'Find apps and resources…',
    theme: 'Toggle color mode', notifications: 'Notifications', noNotifications: 'No new notifications.',
    markAll: 'Mark all as read', account: 'Account', guest: 'Guest', profile: 'Profile & settings',
    manageApps: 'Manage apps', hiddenApps: 'Hidden apps', display: 'Text size', language: 'Language',
    logout: 'Log out', chatbot: 'Chatbot', login: 'Sign in', unread: 'unread',
  },
};

const FONT_SIZES = [100, 110, 120, 130];
const NOTIFICATION_EVENTS = ['bes-global-notification', 'bes:notification'];

function go(target, label, sourceEl) {
  launchRoute({
    target: target.startsWith('#/') ? target : `#/${target}`,
    label: String(label || 'GO').slice(0, 2).toUpperCase(),
    color: '#2f6b4f',
    sourceEl,
  });
}

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

function storageKey(currentUser) {
  return `bes-global-notifications:${currentUser?.id || currentUser?.email || 'guest'}`;
}

function readNotifications(key) {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed.slice(0, 60) : [];
  } catch {
    return [];
  }
}

function writeNotifications(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value.slice(0, 60)));
  } catch {
    // Notifications remain available for the current session.
  }
}

function normalizeNotification(detail = {}) {
  return {
    id: String(detail.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    title: String(detail.title || detail.subject || 'Brian English'),
    message: String(detail.message || detail.body || detail.description || ''),
    target: String(detail.target || detail.href || ''),
    createdAt: detail.createdAt || detail.created_at || new Date().toISOString(),
    read: Boolean(detail.read),
  };
}

function timeLabel(value, language) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

export default function GlobalCompactNavigation({
  route = 'home', language = 'vi', setLanguage, theme = 'light', setTheme,
  currentUser, onLogout, fontScale = 100, setFontScale,
}) {
  const t = copy[language] || copy.vi;
  const isAdmin = String(currentUser?.role || '').toLowerCase() === 'admin';
  const rootRef = useRef(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const key = useMemo(() => storageKey(currentUser), [currentUser?.id, currentUser?.email]);
  const [notifications, setNotifications] = useState(() => readNotifications(key));

  useEffect(() => {
    setNotifications(readNotifications(key));
  }, [key]);

  useEffect(() => {
    const closeMenus = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setAccountOpen(false);
        setNotificationOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setAccountOpen(false);
        setNotificationOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeMenus);
    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('hashchange', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeMenus);
      window.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('hashchange', closeOnEscape);
    };
  }, []);

  useEffect(() => {
    const receive = (event) => {
      const incoming = normalizeNotification(event.detail || {});
      setNotifications((current) => {
        const next = [incoming, ...current.filter((item) => item.id !== incoming.id)].slice(0, 60);
        writeNotifications(key, next);
        return next;
      });
    };
    const syncStorage = (event) => {
      if (event.key === key) setNotifications(readNotifications(key));
    };
    NOTIFICATION_EVENTS.forEach((name) => window.addEventListener(name, receive));
    window.addEventListener('storage', syncStorage);
    return () => {
      NOTIFICATION_EVENTS.forEach((name) => window.removeEventListener(name, receive));
      window.removeEventListener('storage', syncStorage);
    };
  }, [key]);

  const accountName = shortName(currentUser?.name || currentUser?.email, currentUser ? t.account : t.guest);
  const unreadCount = notifications.filter((item) => !item.read).length;
  const canShowApps = Boolean(currentUser && (isAdmin || hasRouteAccess(currentUser, 'apps')));

  const openRoute = (target, label, event) => {
    setAccountOpen(false);
    setNotificationOpen(false);
    go(target, label, event?.currentTarget);
  };

  const markAllRead = () => {
    const next = notifications.map((item) => ({ ...item, read: true }));
    setNotifications(next);
    writeNotifications(key, next);
  };

  const openNotification = (item, event) => {
    const next = notifications.map((entry) => entry.id === item.id ? { ...entry, read: true } : entry);
    setNotifications(next);
    writeNotifications(key, next);
    if (item.target) openRoute(item.target, item.title, event);
  };

  return (
    <>
      <nav ref={rootRef} className="brian-nav" aria-label={language === 'vi' ? 'Điều hướng chính' : 'Main navigation'}>
        <button type="button" className="brian-nav__brand" onClick={(event) => openRoute('#/home', 'BE', event)}>
          <img src="/brian-english-brand-mark.png" alt="" aria-hidden="true" />
          <span>Brian English</span>
        </button>

        <div className="brian-nav__primary" aria-label={language === 'vi' ? 'Khu vực chính' : 'Primary areas'}>
          <button type="button" className={route === 'home' ? 'is-active' : ''} onClick={(event) => openRoute('#/home', t.home, event)}>{t.home}</button>
          {canShowApps ? <button type="button" className={route === 'apps' ? 'is-active' : ''} onClick={(event) => openRoute('#/apps', t.apps, event)}>{t.apps}</button> : null}
          {isAdmin ? <button type="button" className={route === 'admin' ? 'is-active' : ''} onClick={(event) => openRoute('#/admin', t.admin, event)}>{t.admin}</button> : null}
        </div>

        <button
          type="button"
          className="brian-nav__search"
          onClick={() => window.dispatchEvent(new CustomEvent('bes-command-palette-open'))}
          aria-label={`${t.search} · Command K`}
        >
          <span aria-hidden="true">⌕</span>
          <b>{t.search}</b>
          <kbd>⌘K</kbd>
        </button>

        <div className="brian-nav__actions">
          <button type="button" className="brian-nav__icon" onClick={() => setTheme?.(theme === 'dark' ? 'light' : 'dark')} aria-label={t.theme} title={t.theme}>
            <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
          </button>

          {currentUser ? (
            <div className="brian-nav__popover-wrap">
              <button
                type="button"
                className={`brian-nav__icon brian-nav__bell ${notificationOpen ? 'is-open' : ''}`}
                onClick={() => { setNotificationOpen((value) => !value); setAccountOpen(false); }}
                aria-label={`${t.notifications}${unreadCount ? `, ${unreadCount} ${t.unread}` : ''}`}
                aria-expanded={notificationOpen}
              >
                <span aria-hidden="true">♢</span>
                {unreadCount ? <em>{unreadCount > 9 ? '9+' : unreadCount}</em> : null}
              </button>
              {notificationOpen ? (
                <section className="brian-nav__popover brian-nav__notifications" aria-label={t.notifications}>
                  <header><strong>{t.notifications}</strong>{unreadCount ? <button type="button" onClick={markAllRead}>{t.markAll}</button> : null}</header>
                  <div className="brian-nav__notification-list">
                    {notifications.length ? notifications.slice(0, 8).map((item) => (
                      <button type="button" key={item.id} className={item.read ? '' : 'is-unread'} onClick={(event) => openNotification(item, event)}>
                        <span><b>{item.title}</b><small>{timeLabel(item.createdAt, language)}</small></span>
                        {item.message ? <p>{item.message}</p> : null}
                      </button>
                    )) : <p className="brian-nav__empty">{t.noNotifications}</p>}
                  </div>
                </section>
              ) : null}
            </div>
          ) : null}

          {currentUser ? (
            <div className="brian-nav__popover-wrap">
              <button
                type="button"
                className={`brian-nav__account ${accountOpen ? 'is-open' : ''}`}
                onClick={() => { setAccountOpen((value) => !value); setNotificationOpen(false); }}
                aria-expanded={accountOpen}
              >
                <span>{initial(currentUser?.name || currentUser?.email)}</span>
                <strong>{accountName}</strong>
                <i aria-hidden="true">⌄</i>
              </button>
              {accountOpen ? (
                <section className="brian-nav__popover brian-nav__account-menu" aria-label={t.account}>
                  <header><span>{initial(currentUser?.name || currentUser?.email)}</span><div><strong>{currentUser?.name || accountName}</strong><small>{currentUser?.email || ''}</small></div></header>
                  <button type="button" onClick={(event) => openRoute('#/settings', t.profile, event)}><span aria-hidden="true">◎</span>{t.profile}</button>
                  <button type="button" onClick={(event) => openRoute('#/apps', t.manageApps, event)}><span aria-hidden="true">▦</span>{t.manageApps}</button>
                  {isAdmin ? <button type="button" onClick={(event) => openRoute('#/app-vault', t.hiddenApps, event)}><span aria-hidden="true">HV</span>{t.hiddenApps}</button> : null}

                  <div className="brian-nav__menu-section">
                    <small>{t.display}</small>
                    <div className="brian-nav__font-options">
                      {FONT_SIZES.map((size) => <button type="button" key={size} className={Number(fontScale) === size ? 'is-selected' : ''} onClick={() => setFontScale?.(size)}>{size}%</button>)}
                    </div>
                  </div>

                  <button type="button" onClick={() => setLanguage?.(language === 'vi' ? 'en' : 'vi')}><span aria-hidden="true">文</span>{t.language}<b>{language === 'vi' ? 'VI' : 'EN'}</b></button>
                  <div className="brian-nav__menu-divider" />
                  <button type="button" className="is-logout" onClick={onLogout}><span aria-hidden="true">↗</span>{t.logout}</button>
                </section>
              ) : null}
            </div>
          ) : (
            <button type="button" className="brian-nav__login" onClick={(event) => openRoute('#/login', t.login, event)}>{t.login}</button>
          )}
        </div>
      </nav>

      {currentUser ? (
        <button
          type="button"
          className="brian-chatbot-fab"
          onClick={() => window.dispatchEvent(new CustomEvent('bes-chatbot-drawer-open'))}
          aria-label={t.chatbot}
          title={t.chatbot}
        >
          <span aria-hidden="true">✦</span><b>{t.chatbot}</b>
        </button>
      ) : null}
    </>
  );
}
