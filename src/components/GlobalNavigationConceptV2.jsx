import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { hasRouteAccess } from '../utils/permissions.js';
import { launchRoute } from '../utils/motion.js';
import './GlobalNavigationConceptV2.css';

function Icon({ name }) {
  const common = { viewBox: '0 0 24 24', 'aria-hidden': true, focusable: false };
  if (name === 'home') return <svg {...common}><path d="M3.5 11.2 12 4l8.5 7.2V21h-6v-6h-5v6h-6z" /></svg>;
  if (name === 'work') return <svg {...common}><rect x="4" y="7" width="16" height="13" rx="3" /><path d="M9 7V4h6v3M4 11h16M10 11v2h4v-2" /></svg>;
  if (name === 'homeroom') return <svg {...common}><path d="m4 9 8-5 8 5-8 5z" /><path d="M7 11.2V17c2.8 2 7.2 2 10 0v-5.8M20 9v6" /></svg>;
  if (name === 'personnel') return <svg {...common}><circle cx="8.5" cy="8" r="3" /><circle cx="16.5" cy="9" r="2.5" /><path d="M3.5 20c.4-4 2.2-6 5-6 3.1 0 4.9 2 5.3 6M13.6 14.6c3.8-.5 6 1.2 6.4 4.5" /></svg>;
  if (name === 'dashboard') return <svg {...common}><path d="M5 20V11M12 20V5M19 20v-7" /><path d="M3 20h18" /></svg>;
  if (name === 'apps') return <svg {...common}><rect x="4" y="4" width="6" height="6" rx="2" /><rect x="14" y="4" width="6" height="6" rx="2" /><rect x="4" y="14" width="6" height="6" rx="2" /><rect x="14" y="14" width="6" height="6" rx="2" /></svg>;
  return <svg {...common}><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 4.5 4.5" /></svg>;
}

function RouteButton({ id, label, icon, active, onClick }) {
  return (
    <button
      type="button"
      className={`brian-concept-tab is-${id} ${active ? 'is-active' : ''}`}
      style={{ '--concept-accent': '#2563eb' }}
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

  const access = useMemo(() => ({
    work: Boolean(currentUser && hasRouteAccess(currentUser, 'work-hub')),
    homeroom: Boolean(currentUser && hasRouteAccess(currentUser, 'homeroom')),
    dashboard: Boolean(currentUser && hasRouteAccess(currentUser, 'dashboard')),
    apps: Boolean(currentUser && (isAdmin || hasRouteAccess(currentUser, 'apps'))),
  }), [currentUser, isAdmin]);

  const openRoute = (target, label, event) => {
    launchRoute({
      target,
      label: String(label).slice(0, 2).toUpperCase(),
      color: '#2563eb',
      sourceEl: event?.currentTarget,
    });
  };

  if (!navHost || !primaryHost) return null;

  const tabs = [
    { id: 'home', label: vi ? 'Trang chủ' : 'Home', icon: 'home', active: route === 'home', target: '#/home' },
    access.work ? { id: 'work', label: vi ? 'Công việc' : 'Work', icon: 'work', active: route === 'work-hub', target: '#/work-hub' } : null,
    access.homeroom ? { id: 'homeroom', label: vi ? 'Lớp học' : 'Classes', icon: 'homeroom', active: route === 'homeroom', target: '#/homeroom' } : null,
    { id: 'personnel', label: vi ? 'Nhân sự' : 'Personnel', icon: 'personnel', active: route === 'tool' && selectedTool?.slug === 'brian-team', target: '#/tool/brian-team' },
    access.dashboard ? { id: 'dashboard', label: vi ? 'Báo cáo' : 'Reports', icon: 'dashboard', active: route === 'dashboard', target: '#/dashboard' } : null,
    access.apps ? { id: 'apps', label: vi ? 'Ứng dụng' : 'Apps', icon: 'apps', active: route === 'apps', target: '#/apps' } : null,
  ].filter(Boolean);

  const navPortal = createPortal(
    <div className="brian-concept-nav" aria-label={vi ? 'Điều hướng chính' : 'Main navigation'}>
      {tabs.map((item) => (
        <RouteButton
          key={item.id}
          {...item}
          onClick={(event) => openRoute(item.target, item.label, event)}
        />
      ))}
    </div>,
    primaryHost,
  );

  const searchPortal = createPortal(
    <button
      type="button"
      className="brian-concept-search"
      onClick={() => window.dispatchEvent(new CustomEvent('bes-command-palette-open'))}
      aria-label={vi ? 'Tìm kiếm hoặc nhập lệnh, Command K' : 'Search or enter a command, Command K'}
    >
      <span className="brian-concept-search__icon"><Icon name="search" /></span>
      <span className="brian-concept-search__text">{vi ? 'Tìm kiếm hoặc nhập lệnh...' : 'Search or enter a command...'}</span>
      <kbd>⌘K</kbd>
    </button>,
    navHost,
  );

  return <>{navPortal}{searchPortal}</>;
}
