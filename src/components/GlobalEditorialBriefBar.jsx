import React, { useEffect, useMemo, useState } from 'react';
import { hasRouteAccess } from '../utils/permissions.js';
import { launchRoute } from '../utils/navigation.js';
import './GlobalEditorialBriefBar.css';

function notificationStorageKey(currentUser) {
  return `bes-global-notifications:${currentUser?.id || currentUser?.email || 'guest'}`;
}

function unreadNotifications(currentUser) {
  if (typeof window === 'undefined' || !currentUser) return 0;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(notificationStorageKey(currentUser)) || '[]');
    return Array.isArray(parsed)
      ? parsed.filter((item) => !item?.read && !item?.archived && !item?.dismissed).length
      : 0;
  } catch {
    return 0;
  }
}

function routeLabel(route, vi) {
  const labels = {
    home: vi ? 'Trang chủ' : 'Home',
    apps: vi ? 'Ứng dụng' : 'Apps',
    dashboard: 'Dashboard',
    homeroom: vi ? 'Chủ nhiệm' : 'Homeroom',
    settings: vi ? 'Cài đặt' : 'Settings',
    admin: vi ? 'Quản trị' : 'Admin',
  };
  return labels[route] || (vi ? 'Brian English' : 'Brian English');
}

function openRoute(target, label, sourceEl) {
  launchRoute({
    target: target.startsWith('#/') ? target : `#/${target}`,
    label: String(label || 'GO').slice(0, 2).toUpperCase(),
    color: '#ad6647',
    sourceEl,
  });
}

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="5.5" /><path d="m15 15 5 5" /></svg>;
}

function BellIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 16h10l-1.3-2V10a3.7 3.7 0 0 0-7.4 0v4L7 16Zm3.5 3h3" /></svg>;
}

function ChannelIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h3l5 4V5L7 9H4Zm11-1v8M18 6v12" /></svg>;
}

function SettingsIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm7 4 2-1-1-3-2 .2-1.3-1.5.4-2.1-3-1.2-1.2 1.7h-2L9.7 3.4l-3 1.2.4 2.1L5.8 8.2 3.7 8 3 11l2 1-2 1 .7 3 2.1-.2 1.3 1.5-.4 2.1 3 1.2 1.2-1.7h2l1.2 1.7 3-1.2-.4-2.1 1.3-1.5 2.1.2.7-3-2-1Z" /></svg>;
}

export default function GlobalEditorialBriefBar({ route = 'home', language = 'vi', currentUser }) {
  const vi = language !== 'en';
  const [unread, setUnread] = useState(() => unreadNotifications(currentUser));

  useEffect(() => {
    const sync = () => setUnread(unreadNotifications(currentUser));
    sync();
    const key = notificationStorageKey(currentUser);
    const onStorage = (event) => { if (!event.key || event.key === key) sync(); };
    const onNotification = () => window.setTimeout(sync, 0);
    window.addEventListener('storage', onStorage);
    window.addEventListener('bes-global-notification', onNotification);
    window.addEventListener('bes:notification', onNotification);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('bes-global-notification', onNotification);
      window.removeEventListener('bes:notification', onNotification);
    };
  }, [currentUser?.id, currentUser?.email]);

  const snippets = useMemo(() => {
    const current = routeLabel(route, vi);
    return vi
      ? [
          `${current} · Không gian làm việc đang sẵn sàng`,
          'Mẹo nhanh · Nhấn ⌘K để tìm ứng dụng và tài liệu',
          currentUser ? 'Kênh TTCM · Trao đổi chuyên môn ngay trong Brian' : 'Brian English · Không gian dạy học 2026–2027',
        ]
      : [
          `${current} · Workspace ready`,
          'Quick tip · Press ⌘K to find apps and resources',
          currentUser ? 'TTCM · Professional collaboration inside Brian' : 'Brian English · Teaching workspace 2026–2027',
        ];
  }, [currentUser, route, vi]);

  const canSettings = Boolean(currentUser);
  const canTtcm = Boolean(currentUser && ['admin', 'department_head', 'teacher', 'ttcm'].includes(String(currentUser?.role || '').toLowerCase()));
  const canHomeroom = Boolean(currentUser && hasRouteAccess(currentUser, 'homeroom'));

  const openNotifications = () => {
    const bell = document.querySelector('.brian-nav__bell');
    if (bell instanceof HTMLElement) bell.click();
  };

  return (
    <section className="brian-editorial-brief" aria-label={vi ? 'Tin vắn và tiện ích' : 'Briefing and utilities'}>
      <div className="brian-editorial-brief__news">
        <span className="brian-editorial-brief__label"><i />{vi ? 'TIN VẮN' : 'BRIEF'}</span>
        <div className="brian-editorial-brief__track" aria-live="off">
          {snippets.map((text, index) => (
            <React.Fragment key={text}>
              {index > 0 ? <span className="brian-editorial-brief__dot" aria-hidden="true">•</span> : null}
              <span>{text}</span>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="brian-editorial-brief__chips" aria-label={vi ? 'Tiện ích nhanh' : 'Quick utilities'}>
        <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('bes-command-palette-open'))}>
          <SearchIcon /><span>{vi ? 'Tìm nhanh' : 'Quick find'}</span><kbd>⌘K</kbd>
        </button>
        {currentUser ? (
          <button type="button" onClick={openNotifications}>
            <BellIcon /><span>{vi ? 'Thông báo' : 'Notifications'}</span>{unread > 0 ? <em>{unread > 99 ? '99+' : unread}</em> : null}
          </button>
        ) : null}
        {canTtcm ? (
          <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('bes-ttcm-open', { detail: { view: 'feed' } }))}>
            <ChannelIcon /><span>TTCM</span>
          </button>
        ) : null}
        {canHomeroom && route !== 'homeroom' ? (
          <button type="button" onClick={(event) => openRoute('#/homeroom', vi ? 'Chủ nhiệm' : 'Homeroom', event.currentTarget)}>
            <span className="brian-editorial-brief__monogram" aria-hidden="true">CN</span><span>{vi ? 'Chủ nhiệm' : 'Homeroom'}</span>
          </button>
        ) : null}
        {canSettings && route !== 'settings' ? (
          <button type="button" onClick={(event) => openRoute('#/settings', vi ? 'Cài đặt' : 'Settings', event.currentTarget)}>
            <SettingsIcon /><span>{vi ? 'Cài đặt' : 'Settings'}</span>
          </button>
        ) : null}
      </div>
    </section>
  );
}
