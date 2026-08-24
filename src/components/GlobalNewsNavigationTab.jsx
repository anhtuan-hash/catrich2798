import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { hasRouteAccess } from '../utils/permissions.js';
import { launchRoute } from '../utils/motion.js';
import usePrimaryNavigationHost from './usePrimaryNavigationHost.js';
import './GlobalNewsNavigationTab.css';

export default function GlobalNewsNavigationTab({
  currentUser,
  language = 'vi',
  route = 'home',
}) {
  const host = usePrimaryNavigationHost();

  const allowed = useMemo(
    () => Boolean(currentUser && hasRouteAccess(currentUser, 'news')),
    [currentUser],
  );

  useEffect(() => {
    if (!host) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const activeTab = host.querySelector('button.is-active');
      activeTab?.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [host, route]);

  if (!host || !allowed) return null;

  const active = route === 'news';
  const label = language === 'vi' ? 'Đọc báo' : 'News';

  return createPortal(
    <button
      type="button"
      className={`brian-nav__news-tab ${active ? 'is-active' : ''}`}
      aria-current={active ? 'page' : undefined}
      onClick={(event) => launchRoute({
        target: '#/news',
        label: language === 'vi' ? 'ĐB' : 'NW',
        color: '#167d78',
        sourceEl: event.currentTarget,
      })}
    >
      {label}
    </button>,
    host,
  );
}
