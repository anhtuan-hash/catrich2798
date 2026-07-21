import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  WORKSPACE_EVENT,
  closeWorkspaceTab,
  loadWorkspace,
  openWorkspaceTab,
  reorderWorkspaceTabs,
  setWorkspaceActive,
  toggleWorkspacePin,
} from '../utils/workspace.js';
import { isAppHiddenForUser } from '../utils/appVisibility.js';
import { visibilityIdForRoute } from '../data/appVisibilityRegistry.js';
import { openWorkspaceLayoutManager } from '../ui-core/runtime/workspaceLayout.js';

const EXCLUDED = new Set(['login', 'register', 'setup', 'homeroom-portal']);
const COMPACT_TAB_LIMIT = 5;

function tabStatus(tab, active, language) {
  if (active) return language === 'vi' ? 'Đang sử dụng' : 'In use';
  if (tab.pinned) return language === 'vi' ? 'Đã ghim' : 'Pinned';
  const value = Number(tab.lastActiveAt || tab.openedAt || 0);
  if (!value) return language === 'vi' ? 'Đã mở gần đây' : 'Recently opened';
  const time = new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(value));
  return language === 'vi' ? `Dùng lúc ${time}` : `Used at ${time}`;
}

function routeDescriptor(route, selectedTool, profile, language) {
  if (route === 'tool' && selectedTool?.slug) {
    return {
      id: `tool:${selectedTool.slug}`,
      target: `#/tool/${selectedTool.slug}`,
      title: selectedTool.title || selectedTool.titleVi || selectedTool.slug,
      titleVi: selectedTool.titleVi || selectedTool.title || selectedTool.slug,
      icon: String(selectedTool.icon || selectedTool.title || 'AP').slice(0, 3).toUpperCase(),
      accent: profile?.accent || '#3B4CCA',
    };
  }
  const labels = {
    home: ['Home', 'Trang chủ'], apps: ['Apps', 'Ứng dụng'], news: ['Newsroom', 'Đọc báo'], games: ['Games', 'Trò chơi'],
    department: ['Department', 'Tổ chuyên môn'], homeroom: ['Homeroom', 'Chủ nhiệm'], library: ['Library', 'Thư viện'],
    'resource-library': ['Resources', 'Kho học liệu'], practice: ['Classroom', 'Lớp học'], settings: ['Settings', 'Cài đặt'],
    admin: ['Admin', 'Quản trị'], resources: ['Resources', 'Tài nguyên'], qa: ['System Health', 'Trạng thái'], trash: ['Trash', 'Thùng rác'],
  };
  const pair = labels[route] || [route, route];
  return {
    id: `route:${route}`,
    target: `#/${route}`,
    title: pair[0],
    titleVi: pair[1],
    icon: String(language === 'vi' ? pair[1] : pair[0]).slice(0, 2).toUpperCase(),
    accent: profile?.accent || '#3B4CCA',
  };
}

export default function WorkspaceTabs({ currentUser, route, selectedTool, activeProfile, language = 'vi', appVisibility }) {
  const [workspace, setWorkspace] = useState(() => loadWorkspace(currentUser));
  const [showAll, setShowAll] = useState(false);
  const draggedRef = useRef('');
  const current = useMemo(() => routeDescriptor(route, selectedTool, activeProfile, language), [route, selectedTool?.slug, activeProfile?.accent, language]);

  useEffect(() => {
    setWorkspace(loadWorkspace(currentUser));
  }, [currentUser?.id, currentUser?.email]);

  useEffect(() => {
    if (!currentUser || EXCLUDED.has(route)) return;
    setWorkspace(openWorkspaceTab(currentUser, current, { activate: true }));
  }, [currentUser?.id, currentUser?.email, current.id, current.target]);

  useEffect(() => {
    const onUpdate = (event) => setWorkspace(event?.detail || loadWorkspace(currentUser));
    const onStorage = (event) => {
      if (!event?.key?.startsWith('bes-workspace-tabs:')) return;
      setWorkspace(loadWorkspace(currentUser));
    };
    window.addEventListener(WORKSPACE_EVENT, onUpdate);
    window.addEventListener('storage', onStorage);
    let channel = null;
    try {
      channel = new BroadcastChannel('bes-workspace-v1085');
      channel.onmessage = () => setWorkspace(loadWorkspace(currentUser));
    } catch { channel = null; }
    return () => {
      window.removeEventListener(WORKSPACE_EVENT, onUpdate);
      window.removeEventListener('storage', onStorage);
      channel?.close?.();
    };
  }, [currentUser?.id, currentUser?.email]);

  const visibleTabs = workspace.tabs.filter((tab) => {
    const visibilityId = tab.id?.startsWith('tool:') ? tab.id : visibilityIdForRoute(String(tab.id || '').replace(/^route:/, ''));
    return !isAppHiddenForUser(appVisibility?.snapshot, currentUser, visibilityId);
  });

  const activeTab = visibleTabs.find((tab) => tab.id === workspace.activeId);
  const compactTabs = [
    ...(activeTab ? [activeTab] : []),
    ...visibleTabs
      .filter((tab) => tab.id !== activeTab?.id)
      .sort((a, b) => Number(b.lastActiveAt || b.openedAt || 0) - Number(a.lastActiveAt || a.openedAt || 0)),
  ].slice(0, COMPACT_TAB_LIMIT);
  const displayedTabs = showAll ? visibleTabs : compactTabs;
  const hiddenCount = Math.max(0, visibleTabs.length - compactTabs.length);

  if (!currentUser || EXCLUDED.has(route) || visibleTabs.length < 2) return null;

  const openTab = (tab) => {
    setWorkspace(setWorkspaceActive(currentUser, tab.id));
    if (window.location.hash !== tab.target) window.location.hash = tab.target;
  };

  const closeTab = (event, tab) => {
    event.stopPropagation();
    const next = closeWorkspaceTab(currentUser, tab.id);
    setWorkspace(next);
    if (workspace.activeId === tab.id) {
      const fallback = next.tabs.find((item) => item.id === next.activeId) || next.tabs[0];
      if (fallback) window.location.hash = fallback.target;
      else window.location.hash = '#/apps';
    }
  };

  return (
    <nav
      className="bes-workspace-tabs bes-recent-apps-v12408"
      data-expanded={showAll ? 'true' : 'false'}
      aria-label={language === 'vi' ? 'Ứng dụng gần đây' : 'Recent applications'}
    >
      <div className="bes-recent-apps-heading">
        <span className="bes-recent-apps-clock" aria-hidden="true">↺</span>
        <span>
          <strong>{language === 'vi' ? 'Ứng dụng gần đây' : 'Recent apps'}</strong>
          <small>{visibleTabs.length} {language === 'vi' ? 'ứng dụng đang mở' : 'apps open'}</small>
        </span>
      </div>

      <div className="bes-workspace-tabs-viewport">
        <div className="bes-workspace-tabs-track">
        {displayedTabs.map((tab) => {
          const active = tab.id === workspace.activeId;
          return (
            <div
              key={tab.id}
              className={`bes-workspace-tab${active ? ' is-active' : ''}${tab.pinned ? ' is-pinned' : ''}`}
              style={{ '--workspace-tab-accent': tab.accent }}
              draggable={showAll}
              onDragStart={() => { draggedRef.current = tab.id; }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (!draggedRef.current || draggedRef.current === tab.id) return;
                setWorkspace(reorderWorkspaceTabs(currentUser, draggedRef.current, tab.id));
                draggedRef.current = '';
              }}
            >
              <button type="button" className="bes-workspace-tab-main" onClick={() => openTab(tab)} title={language === 'vi' ? tab.titleVi : tab.title}>
                <span className="bes-workspace-tab-mark">{tab.icon}</span>
                <span className="bes-workspace-tab-copy">
                  <strong>{language === 'vi' ? tab.titleVi : tab.title}</strong>
                  <small>{tabStatus(tab, active, language)}</small>
                </span>
              </button>
              <button
                type="button"
                className="bes-workspace-tab-pin"
                aria-label={tab.pinned ? (language === 'vi' ? 'Bỏ ghim tab' : 'Unpin tab') : (language === 'vi' ? 'Ghim tab' : 'Pin tab')}
                title={tab.pinned ? (language === 'vi' ? 'Bỏ ghim' : 'Unpin') : (language === 'vi' ? 'Ghim' : 'Pin')}
                onClick={(event) => { event.stopPropagation(); setWorkspace(toggleWorkspacePin(currentUser, tab.id)); }}
              >{tab.pinned ? (language === 'vi' ? 'Bỏ ghim' : 'Unpin') : (language === 'vi' ? 'Ghim' : 'Pin')}</button>
              {!tab.pinned ? <button type="button" className="bes-workspace-tab-close" onClick={(event) => closeTab(event, tab)} aria-label={language === 'vi' ? 'Đóng tab' : 'Close tab'}>×</button> : null}
            </div>
          );
        })}
        </div>
      </div>

      <div className="bes-recent-apps-actions">
        {visibleTabs.length > COMPACT_TAB_LIMIT ? (
          <button type="button" className="bes-workspace-all" onClick={() => setShowAll((value) => !value)} aria-expanded={showAll}>
            <span aria-hidden="true">{showAll ? '−' : '▦'}</span>
            <b>{showAll ? (language === 'vi' ? 'Thu gọn' : 'Collapse') : (language === 'vi' ? `Tất cả ${visibleTabs.length}` : `All ${visibleTabs.length}`)}</b>
            {!showAll && hiddenCount ? <i>+{hiddenCount}</i> : null}
          </button>
        ) : null}
        <button type="button" className="bes-workspace-layout" onClick={() => openWorkspaceLayoutManager()} title={language === 'vi' ? 'Chia màn hình làm việc' : 'Split workspace'}>
          <span aria-hidden="true">◫</span><b>{language === 'vi' ? 'Chia màn hình' : 'Split view'}</b>
        </button>
        <button type="button" className="bes-workspace-new" onClick={() => { window.location.hash = '#/apps'; }} title={language === 'vi' ? 'Mở ứng dụng khác' : 'Open another app'}>
          <span aria-hidden="true">＋</span><b>{language === 'vi' ? 'Mở ứng dụng' : 'Open app'}</b>
        </button>
      </div>
    </nav>
  );
}
