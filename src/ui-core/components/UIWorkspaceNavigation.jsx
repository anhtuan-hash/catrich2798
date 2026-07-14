import React, { useEffect, useMemo, useState } from 'react';
import { APPS, GAME_APPS } from '../../data/apps.js';
import { visibilityIdForRoute } from '../../data/appVisibilityRegistry.js';
import { isAppHiddenForUser } from '../../utils/appVisibility.js';
import { getFirstAllowedRoute, hasRouteAccess, hasToolAccess } from '../../utils/permissions.js';
import { launchRoute } from '../../utils/motion.js';
import { isAdminRole } from '../../utils/roles.js';
import { getWorkspaceCatalog, getWorkspaceLandingTarget, resolveToolWorkspaceId, resolveWorkspaceId } from '../runtime/workspaceRegistry.js';
import UIActivityCenter from './UIActivityCenter.jsx';

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

function openTarget(target, label, color, sourceEl) {
  launchRoute({
    target: target.startsWith('#/') ? target : `#/${target}`,
    label: String(label || 'GO').slice(0, 2).toUpperCase(),
    color: color || '#191515',
    sourceEl,
  });
}

function canUseItem(item, currentUser, snapshot) {
  if (!item || !currentUser) return false;
  if (isAdminRole(currentUser?.role)) return true;
  const visibilityId = item.route ? visibilityIdForRoute(item.route) : `tool:${item.slug}`;
  if (isAppHiddenForUser(snapshot, currentUser, visibilityId)) return false;
  return item.route ? hasRouteAccess(currentUser, item.route, item) : hasToolAccess(currentUser, item.slug);
}

const UTILITY_ROUTES = [
  ['settings', '⚙'], ['qa', '♥'], ['trash', '⌫'], ['app-vault', 'HV'], ['admin', 'AD'],
];

export default function UIWorkspaceNavigation({
  route = 'home', selectedTool = null, language = 'vi', setLanguage, theme = 'light', setTheme,
  hasApiKey, currentUser, onLogout, fontScale = 100, setFontScale, appVisibility,
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const catalog = useMemo(() => getWorkspaceCatalog(language), [language]);
  const activeWorkspaceId = resolveWorkspaceId({ route, selectedTool });
  const snapshot = appVisibility?.snapshot;
  const isAdmin = isAdminRole(currentUser?.role);

  useEffect(() => {
    const close = () => setDrawerOpen(false);
    const onKeyDown = (event) => { if (event.key === 'Escape') close(); };
    window.addEventListener('hashchange', close);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('hashchange', close);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const workspaceCounts = useMemo(() => {
    const counts = Object.fromEntries(catalog.map((workspace) => [workspace.id, 0]));
    [...APPS, ...GAME_APPS].forEach((item) => {
      if (!canUseItem(item, currentUser, snapshot)) return;
      const workspaceId = resolveToolWorkspaceId(item);
      counts[workspaceId] = (counts[workspaceId] || 0) + 1;
    });
    return counts;
  }, [catalog, currentUser?.id, currentUser?.email, currentUser?.role, snapshot]);

  const visibleWorkspaces = useMemo(() => catalog.filter((workspace) => {
    if (!currentUser) return workspace.id === 'teaching';
    if (isAdmin) return true;
    if (workspaceCounts[workspace.id] > 0) return true;
    const targetRoute = String(workspace.landingTarget || '').replace(/^#\//, '').split('?')[0];
    return hasRouteAccess(currentUser, targetRoute);
  }), [catalog, currentUser?.id, currentUser?.email, currentUser?.role, isAdmin, workspaceCounts]);

  const accountName = shortName(currentUser?.name || currentUser?.email, language === 'vi' ? 'Tài khoản' : 'Account');
  const accountRoute = currentUser ? getFirstAllowedRoute(currentUser) : 'login';
  const copy = language === 'vi' ? {
    nav: 'Điều hướng theo không gian', home: 'Trang chủ', all: 'Tất cả không gian', more: 'Hệ thống', search: 'Tìm nhanh',
    font: 'Cỡ chữ', aiReady: 'AI sẵn sàng', aiOff: 'Chưa cài AI', logout: 'Thoát', close: 'Đóng',
    utilities: 'Tiện ích hệ thống', workspaceApps: 'ứng dụng', settings: 'Cài đặt', qa: 'Trạng thái', trash: 'Thùng rác',
    'app-vault': 'Ứng dụng ẩn', admin: 'Quản trị',
  } : {
    nav: 'Workspace navigation', home: 'Home', all: 'All workspaces', more: 'System', search: 'Quick search',
    font: 'Text size', aiReady: 'AI ready', aiOff: 'AI not set', logout: 'Logout', close: 'Close',
    utilities: 'System utilities', workspaceApps: 'apps', settings: 'Settings', qa: 'System health', trash: 'Trash',
    'app-vault': 'Hidden apps', admin: 'Admin',
  };

  const increaseFontSize = () => {
    const sizes = [100, 110, 120, 130];
    const index = sizes.indexOf(Number(fontScale));
    setFontScale?.(sizes[(index + 1) % sizes.length]);
  };

  const utilityRoutes = UTILITY_ROUTES.filter(([routeId]) => {
    if (['app-vault', 'admin'].includes(routeId) && !isAdmin) return false;
    return currentUser && hasRouteAccess(currentUser, routeId);
  });

  return (
    <nav className="bui-workspace-navigation" aria-label={copy.nav} data-ui="workspace-primary-navigation">
      <button type="button" className="bui-workspace-brand" onClick={(event) => openTarget('#/home', 'BE', '#FFC69D', event.currentTarget)}>
        <img src="/brian-english-brand-mark.png" alt="Brian English" />
        <strong>Brian English</strong>
      </button>

      <div className="bui-workspace-nav-track">
        <button
          type="button"
          className={`bui-workspace-nav-item is-home${route === 'home' ? ' active' : ''}`}
          onClick={(event) => openTarget('#/home', 'HO', '#FFC69D', event.currentTarget)}
          aria-current={route === 'home' ? 'page' : undefined}
          title={copy.home}
        >
          <span aria-hidden="true">⌂</span><b>{copy.home}</b>
        </button>

        {visibleWorkspaces.map((workspace) => {
          const active = workspace.id === activeWorkspaceId && route !== 'home';
          return (
            <button
              key={workspace.id}
              type="button"
              className={`bui-workspace-nav-item${active ? ' active' : ''}`}
              style={{ '--workspace-accent': workspace.accent }}
              onClick={(event) => openTarget(getWorkspaceLandingTarget(workspace.id), workspace.icon, workspace.accent, event.currentTarget)}
              aria-current={active ? 'page' : undefined}
              title={`${workspace.displayLabel} · ${workspaceCounts[workspace.id] || 0} ${copy.workspaceApps}`}
            >
              <span aria-hidden="true">{workspace.icon}</span>
              <b>{workspace.displayLabel}</b>
              <small>{workspaceCounts[workspace.id] || 0}</small>
            </button>
          );
        })}
      </div>

      <div className="bui-workspace-nav-actions">
        <button type="button" className="bui-workspace-action" onClick={() => window.dispatchEvent(new CustomEvent('brian:workspace-hub-open', { detail: { workspaceId: activeWorkspaceId } }))} title={copy.all}>
          <span aria-hidden="true">▦</span><small>{copy.all}</small>
        </button>
        <UIActivityCenter currentUser={currentUser} route={route} selectedTool={selectedTool} language={language} />
        <button type="button" className="bui-workspace-action" onClick={() => window.dispatchEvent(new CustomEvent('brian:command-center-open'))} title={`${copy.search} · ⌘K / Ctrl+K`}>
          <span aria-hidden="true">⌕</span><small>⌘K</small>
        </button>
        <button type="button" className={`bui-workspace-action is-ai${hasApiKey ? ' active' : ''}`} onClick={(event) => openTarget(currentUser ? '#/settings' : '#/login', 'AI', hasApiKey ? '#2BB7B3' : '#F7D23B', event.currentTarget)} title={hasApiKey ? copy.aiReady : copy.aiOff}>
          <span aria-hidden="true">AI</span><small>{hasApiKey ? 'ON' : 'OFF'}</small>
        </button>
        <button type="button" className="bui-workspace-action" onClick={increaseFontSize} title={`${copy.font}: ${fontScale}%`}><span>A+</span><small>{fontScale}%</small></button>
        <button type="button" className="bui-workspace-action is-compact" onClick={() => setLanguage?.(language === 'vi' ? 'en' : 'vi')}>{language === 'vi' ? 'VI' : 'EN'}</button>
        <button type="button" className="bui-workspace-action is-compact" onClick={() => setTheme?.(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">{theme === 'dark' ? '☀' : '☾'}</button>
        <button type="button" className={`bui-workspace-action bui-workspace-system-toggle${drawerOpen ? ' active' : ''}`} onClick={() => setDrawerOpen((value) => !value)} aria-expanded={drawerOpen}>
          <span aria-hidden="true">☰</span><small>{copy.more}</small>
        </button>
        <button type="button" className="bui-workspace-account" onClick={(event) => openTarget(`#/${accountRoute}`, 'ME', '#191515', event.currentTarget)}>
          <span>{initial(currentUser?.name || currentUser?.email)}</span><strong>{accountName}</strong>
        </button>
      </div>

      {drawerOpen ? (
        <div className="bui-workspace-system-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDrawerOpen(false); }}>
          <section className="bui-workspace-system-drawer" role="dialog" aria-modal="true" aria-label={copy.utilities}>
            <header><div><span>BRIAN SYSTEM</span><h2>{copy.utilities}</h2></div><button type="button" onClick={() => setDrawerOpen(false)} aria-label={copy.close}>×</button></header>
            <div className="bui-workspace-system-grid">
              {utilityRoutes.map(([routeId, icon]) => (
                <button key={routeId} type="button" onClick={(event) => { setDrawerOpen(false); openTarget(`#/${routeId}`, icon, '#123C69', event.currentTarget); }}>
                  <span aria-hidden="true">{icon}</span><b>{copy[routeId] || routeId}</b>
                </button>
              ))}
            </div>
            {currentUser ? <footer><button type="button" className="is-danger" onClick={onLogout}>{copy.logout}</button></footer> : null}
          </section>
        </div>
      ) : null}
    </nav>
  );
}
