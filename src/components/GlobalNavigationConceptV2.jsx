import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { hasRouteAccess } from '../utils/permissions.js';
import { launchRoute } from '../utils/motion.js';
import './GlobalNavigationConceptV2.css';

function Icon({ name }) {
  const common = { viewBox: '0 0 24 24', 'aria-hidden': true, focusable: false };
  if (name === 'home') return <svg {...common}><path d="M3.5 11.2 12 4l8.5 7.2V21h-6v-6h-5v6h-6z" /></svg>;
  if (name === 'work') return <svg {...common}><rect x="4" y="7" width="16" height="13" rx="3" /><path d="M9 7V4h6v3M4 11h16M10 11v2h4v-2" /></svg>;
  if (name === 'homeroom') return <svg {...common}><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3.5 20c.4-4 2.2-6 5.5-6s5.1 2 5.5 6M14.2 14.5c3.8-.5 5.9 1.2 6.3 4.5" /></svg>;
  if (name === 'personnel') return <svg {...common}><circle cx="8.5" cy="8" r="3" /><circle cx="16.5" cy="9" r="2.5" /><path d="M3.5 20c.4-4 2.2-6 5-6 3.1 0 4.9 2 5.3 6M13.6 14.6c3.8-.5 6 1.2 6.4 4.5" /><path d="M18.5 4.5v3M17 6h3" /></svg>;
  if (name === 'dashboard') return <svg {...common}><path d="M12 3v9h9A9 9 0 1 1 12 3Z" /><path d="M15 3.6A9 9 0 0 1 20.4 9H15z" /></svg>;
  if (name === 'apps') return <svg {...common}><rect x="4" y="4" width="6" height="6" rx="2" /><rect x="14" y="4" width="6" height="6" rx="2" /><rect x="4" y="14" width="6" height="6" rx="2" /><rect x="14" y="14" width="6" height="6" rx="2" /></svg>;
  if (name === 'news') return <svg {...common}><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" /></svg>;
  if (name === 'games') return <svg {...common}><path d="M7.5 8h9l3 5.5c1.2 2.3-.2 5-2.6 5-1.5 0-2.2-1.1-3.2-2.6h-3.4c-1 1.5-1.7 2.6-3.2 2.6-2.4 0-3.8-2.7-2.6-5zM8 11v4M6 13h4M16.5 12.2h.1M18 14h.1" /></svg>;
  if (name === 'admin') return <svg {...common}><path d="M12 3 20 6v5c0 5.1-3.4 8.4-8 10-4.6-1.6-8-4.9-8-10V6z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></svg>;
  if (name === 'more') return <svg {...common}><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>;
  return <svg {...common}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>;
}

function routeButton({ id, label, icon, color, active, onClick }) {
  return (
    <button
      type="button"
      key={id}
      className={`brian-concept-tab is-${id} ${active ? 'is-active' : ''}`}
      style={{ '--concept-accent': color }}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
    >
      <span className="brian-concept-tab__icon"><Icon name={icon} /></span>
      <span className="brian-concept-tab__label">{label}</span>
    </button>
  );
}

export default function GlobalNavigationConceptV2({
  route = 'home',
  language = 'vi',
  currentUser,
  selectedTool,
}) {
  const [navHost, setNavHost] = useState(null);
  const [primaryHost, setPrimaryHost] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);
  const vi = language !== 'en';
  const isAdmin = String(currentUser?.role || '').toLowerCase() === 'admin';

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    let cancelled = false;
    const connect = () => {
      if (cancelled) return;
      const nav = document.querySelector('.bes-top-chrome > .brian-nav');
      const primary = nav?.querySelector(':scope > .brian-nav__primary');
      if (!nav || !primary) return;
      nav.classList.add('brian-nav--concept-v2');
      setNavHost(nav);
      setPrimaryHost(primary);
    };
    connect();
    const frame = window.requestAnimationFrame(connect);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      document.querySelector('.brian-nav--concept-v2')?.classList.remove('brian-nav--concept-v2');
    };
  }, []);

  useEffect(() => {
    if (!moreOpen) return undefined;
    const close = (event) => {
      if (!moreRef.current?.contains(event.target)) setMoreOpen(false);
    };
    const escape = (event) => {
      if (event.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('pointerdown', close);
    window.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', escape);
    };
  }, [moreOpen]);

  const access = useMemo(() => ({
    work: Boolean(currentUser && hasRouteAccess(currentUser, 'work-hub')),
    homeroom: Boolean(currentUser && hasRouteAccess(currentUser, 'homeroom')),
    dashboard: Boolean(currentUser && hasRouteAccess(currentUser, 'dashboard')),
    apps: Boolean(currentUser && (isAdmin || hasRouteAccess(currentUser, 'apps'))),
    news: Boolean(currentUser && hasRouteAccess(currentUser, 'news')),
    games: Boolean(currentUser && hasRouteAccess(currentUser, 'games')),
  }), [currentUser, isAdmin]);

  const openRoute = (target, label, color, event) => {
    setMoreOpen(false);
    launchRoute({ target, label: String(label).slice(0, 2).toUpperCase(), color, sourceEl: event?.currentTarget });
  };

  if (!navHost || !primaryHost) return null;

  const tabs = [
    { id: 'home', label: vi ? 'Trang chủ' : 'Home', icon: 'home', color: '#2563eb', active: route === 'home', target: '#/home' },
    access.work ? { id: 'work', label: vi ? 'Công việc' : 'Work', icon: 'work', color: '#2563eb', active: route === 'work-hub', target: '#/work-hub' } : null,
    access.homeroom ? { id: 'homeroom', label: vi ? 'Chủ nhiệm' : 'Homeroom', icon: 'homeroom', color: '#16a34a', active: route === 'homeroom', target: '#/homeroom' } : null,
    { id: 'personnel', label: vi ? 'Nhân sự' : 'Personnel', icon: 'personnel', color: '#7c3aed', active: route === 'tool' && selectedTool?.slug === 'brian-team', target: '#/tool/brian-team' },
    access.dashboard ? { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', color: '#f97316', active: route === 'dashboard', target: '#/dashboard' } : null,
    access.apps ? { id: 'apps', label: vi ? 'Ứng dụng' : 'Apps', icon: 'apps', color: '#0f766e', active: route === 'apps', target: '#/apps' } : null,
  ].filter(Boolean);

  const extraItems = [
    access.news ? { id: 'news', label: vi ? 'Đọc báo' : 'News', icon: 'news', color: '#0f766e', target: '#/news', active: route === 'news' } : null,
    access.games ? { id: 'games', label: vi ? 'Trò chơi' : 'Games', icon: 'games', color: '#7c3aed', target: '#/games', active: route === 'games' } : null,
    isAdmin ? { id: 'admin', label: vi ? 'Quản trị' : 'Admin', icon: 'admin', color: '#dc2626', target: '#/admin', active: route === 'admin' } : null,
  ].filter(Boolean);

  const navPortal = createPortal(
    <div className="brian-concept-nav" aria-label={vi ? 'Điều hướng ưu tiên' : 'Priority navigation'}>
      {tabs.map((item) => routeButton({
        ...item,
        onClick: (event) => openRoute(item.target, item.label, item.color, event),
      }))}
      <div className="brian-concept-more" ref={moreRef}>
        <button
          type="button"
          className={`brian-concept-tab is-more ${extraItems.some((item) => item.active) ? 'is-active' : ''}`}
          style={{ '--concept-accent': '#475569' }}
          aria-haspopup="menu"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((value) => !value)}
        >
          <span className="brian-concept-tab__icon"><Icon name="more" /></span>
          <span className="brian-concept-tab__label">{vi ? 'Thêm' : 'More'}</span>
          <span className="brian-concept-tab__chevron" aria-hidden="true">⌄</span>
        </button>
        {moreOpen ? (
          <div className="brian-concept-more__menu" role="menu">
            {extraItems.length ? extraItems.map((item) => (
              <button
                type="button"
                role="menuitem"
                key={item.id}
                className={item.active ? 'is-active' : ''}
                style={{ '--concept-accent': item.color }}
                onClick={(event) => openRoute(item.target, item.label, item.color, event)}
              >
                <span><Icon name={item.icon} /></span>
                <b>{item.label}</b>
              </button>
            )) : <small>{vi ? 'Không có mục bổ sung' : 'No additional items'}</small>}
          </div>
        ) : null}
      </div>
    </div>,
    primaryHost,
  );

  const searchPortal = createPortal(
    <button
      type="button"
      className="brian-concept-search"
      onClick={() => window.dispatchEvent(new CustomEvent('bes-command-palette-open'))}
      aria-label={vi ? 'Tìm kiếm hoặc chạy lệnh, Command K' : 'Search or run a command, Command K'}
    >
      <span className="brian-concept-search__icon"><Icon name="search" /></span>
      <span className="brian-concept-search__text">{vi ? 'Tìm kiếm hoặc chạy lệnh' : 'Search or run a command'}</span>
      <kbd>⌘K</kbd>
    </button>,
    navHost,
  );

  return <>{navPortal}{searchPortal}</>;
}
