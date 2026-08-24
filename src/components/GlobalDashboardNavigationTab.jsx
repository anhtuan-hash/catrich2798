import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { hasRouteAccess } from '../utils/permissions.js';
import { launchRoute } from '../utils/motion.js';
import usePrimaryNavigationHost from './usePrimaryNavigationHost.js';
import './GlobalDashboardNavigationTab.css';

export default function GlobalDashboardNavigationTab({
  currentUser,
  language = 'vi',
  route = 'home',
}) {
  const host = usePrimaryNavigationHost();

  const allowed = useMemo(
    () => Boolean(currentUser && hasRouteAccess(currentUser, 'dashboard')),
    [currentUser],
  );

  if (!host || !allowed) return null;
  const active = route === 'dashboard';
  const label = 'Dashboard';

  return createPortal(
    <button
      type="button"
      className={`brian-nav__dashboard-tab ${active ? 'is-active' : ''}`}
      aria-current={active ? 'page' : undefined}
      onClick={(event) => launchRoute({
        target: '#/dashboard',
        label: 'DB',
        color: '#0b57d0',
        sourceEl: event.currentTarget,
      })}
    >
      {label}
    </button>,
    host,
  );
}
