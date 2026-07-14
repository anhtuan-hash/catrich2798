import React, { useEffect, useMemo, useState } from 'react';
import { APPS, GAME_APPS } from '../../data/apps.js';
import { visibilityIdForRoute } from '../../data/appVisibilityRegistry.js';
import { isAppHiddenForUser } from '../../utils/appVisibility.js';
import { hasRouteAccess, hasToolAccess } from '../../utils/permissions.js';
import { launchRoute } from '../../utils/motion.js';
import { isAdminRole } from '../../utils/roles.js';
import { UIOverlayClose, UIOverlayHeader, UIOverlayPortal, UIOverlaySurface } from './UIOverlays.jsx';
import { getWorkspaceCatalog, getWorkspaceLandingTarget, resolveToolWorkspaceId, resolveWorkspaceId } from '../runtime/workspaceRegistry.js';
import { loadWorkspaceMemory, WORKSPACE_MEMORY_EVENT } from '../runtime/workspaceMemory.js';

function canUseItem(item, currentUser, snapshot) {
  if (!item || !currentUser) return false;
  if (isAdminRole(currentUser?.role)) return true;
  const visibilityId = item.route ? visibilityIdForRoute(item.route) : `tool:${item.slug}`;
  if (isAppHiddenForUser(snapshot, currentUser, visibilityId)) return false;
  return item.route ? hasRouteAccess(currentUser, item.route, item) : hasToolAccess(currentUser, item.slug);
}

function timeLabel(timestamp, language) {
  const elapsed = Math.max(0, Date.now() - Number(timestamp || 0));
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return language === 'vi' ? 'vừa xong' : 'just now';
  if (minutes < 60) return language === 'vi' ? `${minutes} phút trước` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return language === 'vi' ? `${hours} giờ trước` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return language === 'vi' ? `${days} ngày trước` : `${days}d ago`;
}

export default function UIWorkspaceHub({
  currentUser,
  route = 'home',
  selectedTool = null,
  language = 'vi',
  appVisibility,
}) {
  const [open, setOpen] = useState(false);
  const [preferredWorkspaceId, setPreferredWorkspaceId] = useState('');
  const [memory, setMemory] = useState(() => loadWorkspaceMemory(currentUser));
  const activeWorkspaceId = resolveWorkspaceId({ route, selectedTool });
  const catalog = useMemo(() => getWorkspaceCatalog(language), [language]);

  useEffect(() => setMemory(loadWorkspaceMemory(currentUser)), [currentUser?.id, currentUser?.email]);

  useEffect(() => {
    const onOpen = (event) => {
      setPreferredWorkspaceId(String(event?.detail?.workspaceId || activeWorkspaceId));
      setOpen(true);
    };
    const onMemory = (event) => setMemory(event?.detail || loadWorkspaceMemory(currentUser));
    const onStorage = (event) => {
      if (!String(event?.key || '').startsWith('brian-workspace-memory-v12:')) return;
      setMemory(loadWorkspaceMemory(currentUser));
    };
    window.addEventListener('brian:workspace-hub-open', onOpen);
    window.addEventListener(WORKSPACE_MEMORY_EVENT, onMemory);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('brian:workspace-hub-open', onOpen);
      window.removeEventListener(WORKSPACE_MEMORY_EVENT, onMemory);
      window.removeEventListener('storage', onStorage);
    };
  }, [currentUser?.id, currentUser?.email, activeWorkspaceId]);

  const counts = useMemo(() => {
    const output = Object.fromEntries(catalog.map((workspace) => [workspace.id, 0]));
    [...APPS, ...GAME_APPS].forEach((item) => {
      if (!canUseItem(item, currentUser, appVisibility?.snapshot)) return;
      const id = resolveToolWorkspaceId(item);
      output[id] = (output[id] || 0) + 1;
    });
    return output;
  }, [catalog, currentUser?.id, currentUser?.email, currentUser?.role, appVisibility?.snapshot]);

  const openTarget = (target, workspace) => {
    setOpen(false);
    launchRoute({ target, label: workspace.icon, color: workspace.accent });
  };

  const copy = language === 'vi'
    ? {
        trigger: 'Không gian', title: 'Không gian làm việc', subtitle: 'Tám nhóm lớn dùng chung một UI Core. Tiếp tục công việc cũ hoặc mở nhóm ứng dụng phù hợp.',
        current: 'Đang sử dụng', continue: 'Tiếp tục', browse: 'Mở không gian', apps: 'ứng dụng', recent: 'Lần mở gần nhất', none: 'Chưa có phiên làm việc trước', close: 'Đóng',
      }
    : {
        trigger: 'Workspaces', title: 'Workspace Hub', subtitle: 'Eight product areas share one UI Core. Resume previous work or open the right app group.',
        current: 'Current', continue: 'Continue', browse: 'Open workspace', apps: 'apps', recent: 'Last opened', none: 'No previous session', close: 'Close',
      };

  const activeWorkspace = catalog.find((workspace) => workspace.id === activeWorkspaceId) || catalog[0];

  return (
    <>
      <button
        type="button"
        className="bui-workspace-hub-trigger"
        style={{ '--workspace-accent': activeWorkspace.accent }}
        onClick={() => { setPreferredWorkspaceId(activeWorkspaceId); setOpen(true); }}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={copy.title}
      >
        <span aria-hidden="true">{activeWorkspace.icon}</span>
        <b>{activeWorkspace.displayLabel}</b>
        <small>{copy.trigger}</small>
      </button>

      <UIOverlayPortal open={open} placement="center" onDismiss={() => setOpen(false)} className="bui-workspace-hub-layer">
        <UIOverlaySurface variant="dialog" className="bui-workspace-hub" role="dialog" aria-modal="true" aria-labelledby="bui-workspace-hub-title">
          <UIOverlayHeader className="bui-workspace-hub__header">
            <div>
              <span className="bui-workspace-hub__eyebrow">BRIAN WORKSPACE OS</span>
              <h2 id="bui-workspace-hub-title">{copy.title}</h2>
              <p>{copy.subtitle}</p>
            </div>
            <UIOverlayClose onClick={() => setOpen(false)} label={copy.close} />
          </UIOverlayHeader>

          <div className="bui-workspace-hub__grid">
            {catalog.map((workspace) => {
              const resume = memory.byWorkspace?.[workspace.id] || null;
              const active = workspace.id === activeWorkspaceId;
              const preferred = workspace.id === preferredWorkspaceId;
              return (
                <article
                  key={workspace.id}
                  className={`bui-workspace-card${active ? ' is-active' : ''}${preferred ? ' is-preferred' : ''}`}
                  style={{ '--workspace-accent': workspace.accent }}
                  data-workspace={workspace.id}
                >
                  <header>
                    <span className="bui-workspace-card__icon" aria-hidden="true">{workspace.icon}</span>
                    <div><strong>{workspace.displayLabel}</strong><small>{counts[workspace.id] || 0} {copy.apps}</small></div>
                    {active ? <em>{copy.current}</em> : null}
                  </header>
                  <p>{workspace.displayDescription}</p>
                  <div className="bui-workspace-card__resume">
                    <span>{copy.recent}</span>
                    {resume ? <><strong>{language === 'vi' ? resume.titleVi : resume.title}</strong><small>{timeLabel(resume.lastVisitedAt, language)}</small></> : <small>{copy.none}</small>}
                  </div>
                  <footer>
                    {resume ? <button type="button" className="bui-button bui-button--primary" onClick={() => openTarget(resume.target, workspace)}>{copy.continue}</button> : null}
                    <button type="button" className="bui-button bui-button--secondary" onClick={() => openTarget(getWorkspaceLandingTarget(workspace.id), workspace)}>{copy.browse}</button>
                  </footer>
                </article>
              );
            })}
          </div>
        </UIOverlaySurface>
      </UIOverlayPortal>
    </>
  );
}
