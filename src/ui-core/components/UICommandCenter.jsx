import React, { useEffect, useMemo, useRef, useState } from 'react';
import { APPS, GAME_APPS, SPECIAL_TOOLS } from '../../data/apps.js';
import { getAppDesignProfile } from '../../data/designProfiles.js';
import { visibilityIdForRoute } from '../../data/appVisibilityRegistry.js';
import { isAppHiddenForUser } from '../../utils/appVisibility.js';
import { getFirstAllowedRoute, hasRouteAccess, hasToolAccess } from '../../utils/permissions.js';
import { launchRoute } from '../../utils/motion.js';
import { isAdminRole, isDepartmentLeaderRole } from '../../utils/roles.js';
import { loadLauncherConfig, normalizeLauncherConfig, subscribeLauncherConfig } from '../../utils/launcherPreferences.js';
import { getAppUsage, recordAppUsage, subscribeAppUsage } from '../../utils/appUsage.js';
import { UIOverlayPortal, UIOverlaySurface } from './UIOverlays.jsx';
import { getWorkspaceCatalog, getWorkspaceLandingTarget, resolveToolWorkspaceId, resolveWorkspaceId } from '../runtime/workspaceRegistry.js';
import { getWorkspaceResumeVisit, loadWorkspaceMemory, WORKSPACE_MEMORY_EVENT } from '../runtime/workspaceMemory.js';
import { openActivityCenter } from '../runtime/activityCenter.js';
import {
  buildUniversalSearchEntries,
  openUniversalSearchEntry,
  subscribeUniversalSearchIndex,
  UNIVERSAL_SEARCH_INDEX_EVENT,
} from '../runtime/universalSearchIndex.js';
import {
  COMMAND_CENTER_OPEN_EVENT,
  COMMAND_CENTER_UPDATED_EVENT,
  LEGACY_COMMAND_PALETTE_OPEN_EVENT,
  clearCommandHistory,
  isCommandPinned,
  loadCommandCenterState,
  parseCommandQuery,
  recordCommandQuery,
  scoreCommandEntry,
  setCommandCenterMode,
  toggleCommandPinned,
} from '../runtime/commandCenter.js';

const ROUTES = [
  ['home', 'Trang chủ', 'Home', '⌂', '#FFC69D'],
  ['apps', 'Ứng dụng', 'Apps', '▦', '#F05A7E'],
  ['news', 'Đọc báo', 'Newsroom', '▤', '#167D78'],
  ['games', 'Trò chơi', 'Games', '◈', '#5B2A86'],
  ['department', 'Tổ chuyên môn', 'Department', '▦', '#3B4CCA'],
  ['homeroom', 'Giáo viên chủ nhiệm', 'Homeroom', '♙', '#1F8F70'],
  ['library', 'Thư viện', 'Library', '▤', '#6FBA7B'],
  ['resource-library', 'Kho học liệu', 'Resource Library', '▥', '#2878D0'],
  ['knowledge-hub', 'Kho học liệu thông minh', 'Smart Knowledge', 'K', '#315FC4'],
  ['work-hub', 'Trung tâm công việc', 'Work Hub', 'WH', '#14866D'],
  ['assessment-core', 'Ngân hàng câu hỏi', 'Assessment Core', 'AC', '#CC7621'],
  ['resources', 'Tài nguyên', 'Resources', 'RE', '#D99A1E'],
  ['settings', 'Cài đặt', 'Settings', '⚙', '#123C69'],
  ['qa', 'Trạng thái hệ thống', 'System Health', '♥', '#123C69'],
  ['platform-readiness', 'Sẵn sàng nền tảng', 'Platform Readiness', 'PR', '#0F766E'],
  ['cloud-operations', 'Vận hành nền', 'Cloud Operations', 'CO', '#167B68'],
  ['data-governance', 'Quản trị dữ liệu', 'Data Governance', 'DG', '#A24B35'],
  ['production-hardening', 'Sẵn sàng Production', 'Production Hardening', 'PH', '#0F766E', 'leader'],
  ['ai-governance', 'Quản trị AI', 'AI Governance', 'AI', '#6D45C6', 'admin'],
  ['app-vault', 'Ứng dụng đã ẩn', 'Hidden Apps', 'HV', '#684CC6', 'admin'],
  ['admin', 'Quản trị', 'Admin', 'AD', '#D13438', 'admin'],
  ['trash', 'Thùng rác', 'Trash', '⌫', '#A43B57'],
];

const SCOPES = [
  ['all', 'Tất cả', 'All', '⌕'],
  ['apps', 'Ứng dụng', 'Apps', '#'],
  ['pages', 'Trang', 'Pages', '/'],
  ['workspaces', 'Không gian', 'Workspaces', '@'],
  ['actions', 'Lệnh', 'Actions', '>'],
  ['content', 'Nội dung', 'Content', '~'],
];

function entryMode(entry) {
  if (entry?.kind === 'tool') return 'apps';
  if (entry?.kind === 'route') return 'pages';
  if (entry?.kind === 'workspace') return 'workspaces';
  if (entry?.kind === 'content') return 'content';
  return 'actions';
}

function formatTime(value, language) {
  const number = Number(value || 0);
  if (!number) return '';
  try {
    return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(number));
  } catch {
    return '';
  }
}

function canUse(entry, currentUser, visibilitySnapshot) {
  if (!currentUser) return entry.route === 'home';
  if (isAdminRole(currentUser.role)) return true;
  if (entry.adminOnly) return false;
  if (entry.leaderOnly && !isDepartmentLeaderRole(currentUser.role)) return false;
  const visibilityId = entry.kind === 'tool' ? entry.id : visibilityIdForRoute(entry.route, entry.app);
  if (isAppHiddenForUser(visibilitySnapshot, currentUser, visibilityId)) return false;
  if (entry.kind === 'tool') return entry.route ? hasRouteAccess(currentUser, entry.route, entry.app) : hasToolAccess(currentUser, entry.slug);
  return hasRouteAccess(currentUser, entry.route);
}

function buildNavigationEntries(language, currentUser, visibilitySnapshot) {
  const routeEntries = ROUTES.map(([route, vi, en, icon, color, guard]) => ({
    id: `route:${route}`,
    kind: 'route',
    route,
    target: `#/${route}`,
    title: language === 'vi' ? vi : en,
    subtitle: language === 'vi' ? 'Trang hệ thống' : 'System page',
    icon,
    color,
    adminOnly: guard === 'admin',
    leaderOnly: guard === 'leader',
    workspaceId: resolveWorkspaceId({ route }),
    keywords: `${vi} ${en} ${route} page trang`,
    priority: route === 'home' ? 8 : route === 'settings' ? 5 : 1,
  }));
  const toolEntries = [...APPS, ...GAME_APPS, ...SPECIAL_TOOLS].map((app) => {
    const profile = getAppDesignProfile(app.slug);
    return {
      id: `tool:${app.slug}`,
      kind: 'tool',
      slug: app.slug,
      route: app.route || '',
      target: app.route ? `#/${app.route}` : `#/tool/${app.slug}`,
      app,
      title: language === 'vi' ? app.titleVi || app.title : app.title,
      subtitle: language === 'vi' ? app.descVi || app.desc || '' : app.desc || app.descVi || '',
      icon: String(app.icon || app.title || 'AP').slice(0, 4).toUpperCase(),
      color: profile.accent,
      workspaceId: resolveToolWorkspaceId(app),
      keywords: `${app.slug} ${app.title || ''} ${app.titleVi || ''} ${app.desc || ''} ${app.descVi || ''} ${app.group || ''} ${app.groupVi || ''}`,
      priority: app.featured ? 6 : 2,
    };
  });
  return [...routeEntries, ...toolEntries].filter((entry) => canUse(entry, currentUser, visibilitySnapshot));
}

function typeLabel(kind, language) {
  const vi = { route: 'Trang', tool: 'Ứng dụng', workspace: 'Không gian', action: 'Lệnh', content: 'Nội dung' };
  const en = { route: 'Page', tool: 'App', workspace: 'Workspace', action: 'Action', content: 'Content' };
  return (language === 'vi' ? vi : en)[kind] || kind;
}

export default function UICommandCenter({
  language = 'vi', setLanguage, currentUser, theme = 'light', setTheme,
  currentRoute = 'home', selectedTool = null, appVisibility,
  fontScale = 100, setFontScale,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState(() => loadCommandCenterState(currentUser).lastMode);
  const [activeIndex, setActiveIndex] = useState(0);
  const [state, setState] = useState(() => loadCommandCenterState(currentUser));
  const [launcherConfig, setLauncherConfig] = useState(() => normalizeLauncherConfig(loadLauncherConfig()));
  const [usage, setUsage] = useState(() => getAppUsage(currentUser));
  const [workspaceMemory, setWorkspaceMemory] = useState(() => loadWorkspaceMemory(currentUser));
  const [contentEntries, setContentEntries] = useState(() => buildUniversalSearchEntries({ user: currentUser, language }));
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const visibilitySnapshot = appVisibility?.snapshot;

  const copy = language === 'vi' ? {
    title: 'Trung tâm lệnh Brian', subtitle: 'Tìm ứng dụng, trang, không gian, lệnh và nội dung đã lưu trong một nơi.',
    placeholder: 'Nhập để tìm · dùng > @ / # ~ để lọc nhanh…', close: 'Đóng', open: 'Mở', pin: 'Ghim', unpin: 'Bỏ ghim',
    current: 'Đang mở', recent: 'Gần đây', pinned: 'Đã ghim', suggested: 'Gợi ý', noResults: 'Không tìm thấy kết quả phù hợp.',
    noResultsHelp: 'Thử tên ứng dụng, workspace, lệnh hoặc từ khóa trong học liệu đã lưu.', history: 'Tìm kiếm gần đây', clear: 'Xóa',
    preview: 'Xem trước lệnh', workspace: 'Không gian', shortcut: 'Phím tắt', move: 'Di chuyển', execute: 'Thực hiện',
    all: 'Tất cả', apps: 'Ứng dụng', pages: 'Trang', workspaces: 'Không gian', actions: 'Lệnh', content: 'Nội dung', source: 'Nguồn', updated: 'Cập nhật',
  } : {
    title: 'Brian Command Center', subtitle: 'Find apps, pages, workspaces, actions and saved content in one place.',
    placeholder: 'Search · use > @ / # ~ for instant scopes…', close: 'Close', open: 'Open', pin: 'Pin', unpin: 'Unpin',
    current: 'Current', recent: 'Recent', pinned: 'Pinned', suggested: 'Suggested', noResults: 'No matching results.',
    noResultsHelp: 'Try an app, workspace, action, or a phrase from saved content.', history: 'Recent searches', clear: 'Clear',
    preview: 'Command preview', workspace: 'Workspace', shortcut: 'Shortcut', move: 'Move', execute: 'Run',
    all: 'All', apps: 'Apps', pages: 'Pages', workspaces: 'Workspaces', actions: 'Actions', content: 'Content', source: 'Source', updated: 'Updated',
  };

  useEffect(() => {
    setState(loadCommandCenterState(currentUser));
    setMode(loadCommandCenterState(currentUser).lastMode);
    setUsage(getAppUsage(currentUser));
    setWorkspaceMemory(loadWorkspaceMemory(currentUser));
    setContentEntries(buildUniversalSearchEntries({ user: currentUser, language }));
  }, [currentUser?.id, currentUser?.email, language]);

  useEffect(() => {
    const unsubscribeLauncher = subscribeLauncherConfig((next) => setLauncherConfig(normalizeLauncherConfig(next)));
    const unsubscribeUsage = subscribeAppUsage(currentUser, setUsage);
    const onCommandState = () => setState(loadCommandCenterState(currentUser));
    const onWorkspaceMemory = () => setWorkspaceMemory(loadWorkspaceMemory(currentUser));
    const rebuildContentIndex = () => setContentEntries(buildUniversalSearchEntries({ user: currentUser, language }));
    const unsubscribeContentIndex = subscribeUniversalSearchIndex(rebuildContentIndex);
    const onStorage = () => {
      setState(loadCommandCenterState(currentUser));
      setWorkspaceMemory(loadWorkspaceMemory(currentUser));
    };
    window.addEventListener(COMMAND_CENTER_UPDATED_EVENT, onCommandState);
    window.addEventListener(WORKSPACE_MEMORY_EVENT, onWorkspaceMemory);
    window.addEventListener(UNIVERSAL_SEARCH_INDEX_EVENT, rebuildContentIndex);
    window.addEventListener('storage', onStorage);
    return () => {
      unsubscribeLauncher();
      unsubscribeUsage();
      unsubscribeContentIndex();
      window.removeEventListener(COMMAND_CENTER_UPDATED_EVENT, onCommandState);
      window.removeEventListener(WORKSPACE_MEMORY_EVENT, onWorkspaceMemory);
      window.removeEventListener(UNIVERSAL_SEARCH_INDEX_EVENT, rebuildContentIndex);
      window.removeEventListener('storage', onStorage);
    };
  }, [currentUser?.id, currentUser?.email, language]);

  useEffect(() => {
    const openCenter = (event) => {
      const detail = event?.detail || {};
      const requestedMode = ['all', 'apps', 'pages', 'workspaces', 'actions', 'content'].includes(detail.mode) ? detail.mode : null;
      setMode(requestedMode || loadCommandCenterState(currentUser).lastMode || 'all');
      setQuery(String(detail.query || ''));
      setOpen(true);
    };
    const keyHandler = (event) => {
      const target = event.target;
      const typing = Boolean(target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable));
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        setMode('content');
        setQuery('');
        setOpen(true);
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (event.shiftKey) {
          setMode('actions');
          setQuery('');
          setOpen(true);
        } else setOpen((value) => !value);
        return;
      }
      if (!typing && event.key === '/' && !open) {
        event.preventDefault();
        setMode('all');
        setOpen(true);
      }
    };
    window.addEventListener(COMMAND_CENTER_OPEN_EVENT, openCenter);
    window.addEventListener(LEGACY_COMMAND_PALETTE_OPEN_EVENT, openCenter);
    window.addEventListener('keydown', keyHandler);
    return () => {
      window.removeEventListener(COMMAND_CENTER_OPEN_EVENT, openCenter);
      window.removeEventListener(LEGACY_COMMAND_PALETTE_OPEN_EVENT, openCenter);
      window.removeEventListener('keydown', keyHandler);
    };
  }, [open, currentUser?.id, currentUser?.email]);

  useEffect(() => {
    if (!open) return undefined;
    setActiveIndex(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [open]);

  const navigationEntries = useMemo(
    () => buildNavigationEntries(language, currentUser, visibilitySnapshot),
    [language, currentUser?.id, currentUser?.email, currentUser?.role, visibilitySnapshot],
  );

  const workspaceEntries = useMemo(() => getWorkspaceCatalog(language).map((workspace) => {
    const resume = getWorkspaceResumeVisit(currentUser, workspace.id);
    return {
      id: `workspace:${workspace.id}`,
      kind: 'workspace',
      workspaceId: workspace.id,
      target: resume?.target || getWorkspaceLandingTarget(workspace.id),
      title: workspace.displayLabel,
      subtitle: resume
        ? `${language === 'vi' ? 'Tiếp tục' : 'Resume'}: ${language === 'vi' ? resume.titleVi : resume.title}`
        : workspace.displayDescription,
      icon: workspace.icon,
      color: workspace.accent,
      keywords: `${workspace.id} ${workspace.label} ${workspace.labelVi} ${workspace.description} ${workspace.descriptionVi} workspace không gian tiếp tục resume`,
      priority: resume ? 16 : 7,
      resumeAt: resume?.lastVisitedAt || 0,
    };
  }), [language, currentUser?.id, currentUser?.email, workspaceMemory.updatedAt]);

  const actions = useMemo(() => {
    const currentWorkspaceId = resolveWorkspaceId({ route: currentRoute, selectedTool });
    const currentResume = getWorkspaceResumeVisit(currentUser, currentWorkspaceId);
    const nextFont = [100, 110, 120, 130][([100, 110, 120, 130].indexOf(Number(fontScale)) + 1) % 4];
    const action = (id, titleVi, titleEn, subtitleVi, subtitleEn, icon, color, keywords, run, priority = 5) => ({
      id: `action:${id}`, kind: 'action', title: language === 'vi' ? titleVi : titleEn,
      subtitle: language === 'vi' ? subtitleVi : subtitleEn, icon, color, keywords, run, priority,
    });
    return [
      action('ai', 'Mở Brian AI', 'Open Brian AI', 'Trò chuyện với trợ lí trên trang hiện tại.', 'Chat with the assistant on the current page.', '✦', '#6255D9', 'AI Brian chat assistant trợ lí', () => window.dispatchEvent(new CustomEvent('bes-ai-open')), 18),
      action('ask-page', 'Hỏi AI về trang hiện tại', 'Ask AI about this page', 'Gửi ngữ cảnh đang mở sang Brian AI.', 'Send the current context to Brian AI.', '◎', '#167D78', 'ask page context phân tích trang hiện tại', () => window.dispatchEvent(new CustomEvent('bes-ai-open', { detail: { prompt: language === 'vi' ? 'Hãy phân tích trang hiện tại và gợi ý bước tiếp theo.' : 'Analyze the current page and suggest the next step.' } })), 15),
      action('activity', 'Mở Trung tâm hoạt động', 'Open Activity Center', 'Thông báo, công việc, đồng bộ, lịch sử và AI.', 'Notifications, work, sync, history and AI.', '◎', '#14866D', 'activity center hoạt động tổng quan', () => openActivityCenter('overview'), 16),
      action('notifications', 'Xem thông báo', 'View notifications', 'Mở thẳng tab Thông báo.', 'Open the Notifications tab.', '!', '#D13438', 'notification thông báo', () => openActivityCenter('notifications'), 12),
      action('work', 'Xem công việc', 'View work', 'Mở thẳng tab Công việc.', 'Open the Work tab.', '✓', '#14866D', 'work task công việc giao việc', () => openActivityCenter('work'), 11),
      action('sync', 'Xem hàng đợi đồng bộ', 'View sync queue', 'Kiểm tra dữ liệu đang chờ đồng bộ.', 'Review pending synchronization.', '↻', '#2878D0', 'sync queue đồng bộ', () => openActivityCenter('sync'), 10),
      action('history', 'Mở lịch sử phiên', 'Open session history', 'Quay lại các trang và bản nháp gần đây.', 'Return to recent pages and drafts.', '↶', '#CC7621', 'history recent lịch sử phiên', () => openActivityCenter('history'), 10),
      action('workspace-hub', 'Mở tất cả không gian', 'Open all workspaces', 'Xem tám không gian làm việc của Brian.', 'View all eight Brian workspaces.', '▦', '#3B4CCA', 'workspace hub không gian', () => window.dispatchEvent(new CustomEvent('brian:workspace-hub-open', { detail: { workspaceId: currentWorkspaceId } })), 14),
      currentResume ? action('resume', 'Tiếp tục công việc gần nhất', 'Resume recent work', language === 'vi' ? currentResume.titleVi : currentResume.title, language === 'vi' ? currentResume.titleVi : currentResume.title, '↗', currentResume.accent, 'resume continue tiếp tục gần nhất', () => launchRoute({ target: currentResume.target, label: currentResume.icon, color: currentResume.accent }), 20) : null,
      action('theme', theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode', theme === 'dark' ? 'Tối → Sáng' : 'Sáng → Tối', theme === 'dark' ? 'Dark → Light' : 'Light → Dark', theme === 'dark' ? '☀' : '☾', '#5B2A86', 'theme dark light giao diện sáng tối', () => setTheme?.(theme === 'dark' ? 'light' : 'dark'), 8),
      action('language', language === 'vi' ? 'Chuyển sang English' : 'Switch to Vietnamese', language === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt', language === 'vi' ? 'VI → EN' : 'EN → VI', language === 'vi' ? 'VI → EN' : 'EN → VI', '文', '#00A6A6', 'language ngôn ngữ vietnamese english', () => setLanguage?.(language === 'vi' ? 'en' : 'vi'), 7),
      action('font', `Tăng cỡ chữ lên ${nextFont}%`, `Set text size to ${nextFont}%`, `Hiện tại ${fontScale}%`, `Current ${fontScale}%`, 'A+', '#123C69', 'font text size cỡ chữ accessibility', () => setFontScale?.(nextFont), 7),
      action('launcher', 'Tùy biến Launcher', 'Customize Launcher', 'Ghim, ẩn, kéo thả và tạo nhóm ứng dụng.', 'Pin, hide, reorder and group apps.', '▦', '#F05A7E', 'launcher pin hide group ghim ẩn nhóm', () => { window.location.hash = '#/apps'; window.setTimeout(() => window.dispatchEvent(new CustomEvent('bes-launcher-edit')), 220); }, 9),
      action('settings', 'Mở Cài đặt', 'Open Settings', 'Giao diện, AI, tài khoản và hiệu năng.', 'Appearance, AI, account and performance.', '⚙', '#123C69', 'settings configuration cài đặt', () => { window.location.hash = '#/settings'; }, 10),
      action('home', 'Về Trang chủ', 'Go Home', 'Mở màn hình Trang chủ Brian.', 'Open the Brian home screen.', '⌂', '#FFC69D', 'home trang chủ', () => { window.location.hash = '#/home'; }, 5),
    ].filter(Boolean);
  }, [language, theme, currentRoute, selectedTool?.slug, currentUser?.id, currentUser?.email, workspaceMemory.updatedAt, fontScale, setTheme, setLanguage, setFontScale]);

  const allEntries = useMemo(() => [...workspaceEntries, ...navigationEntries, ...actions, ...contentEntries], [workspaceEntries, navigationEntries, actions, contentEntries]);
  const byId = useMemo(() => new Map(allEntries.map((entry) => [entry.id, entry])), [allEntries]);
  const pinnedEntries = useMemo(() => state.pinnedIds.map((id) => byId.get(id)).filter(Boolean), [state.pinnedIds, byId]);
  const recentEntries = useMemo(() => usage.map((item) => byId.get(item.id)).filter(Boolean).slice(0, 8), [usage, byId]);
  const launcherPinnedEntries = useMemo(() => (launcherConfig.pinned || []).map((id) => byId.get(`tool:${id}`)).filter(Boolean).slice(0, 8), [launcherConfig.pinned, byId]);

  const parsed = useMemo(() => parseCommandQuery(query, mode), [query, mode]);
  const effectiveMode = parsed.mode;

  const results = useMemo(() => {
    const pool = effectiveMode === 'all' ? allEntries : allEntries.filter((entry) => entryMode(entry) === effectiveMode);
    if (parsed.normalized) {
      return pool
        .map((entry) => ({ entry, score: scoreCommandEntry(entry, parsed.normalized) + (state.pinnedIds.includes(entry.id) ? 20 : 0) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
        .slice(0, 28)
        .map((item) => item.entry);
    }
    if (effectiveMode !== 'all') return [...pool].sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0) || a.title.localeCompare(b.title)).slice(0, 28);
    const seen = new Set();
    const output = [];
    const push = (entry, section) => {
      if (!entry || seen.has(entry.id)) return;
      seen.add(entry.id);
      output.push({ ...entry, section });
    };
    pinnedEntries.forEach((entry) => push(entry, copy.pinned));
    recentEntries.forEach((entry) => push(entry, copy.recent));
    launcherPinnedEntries.forEach((entry) => push(entry, copy.pinned));
    workspaceEntries.forEach((entry) => push(entry, copy.suggested));
    actions.forEach((entry) => push(entry, copy.suggested));
    return output.slice(0, 28);
  }, [allEntries, effectiveMode, parsed.normalized, state.pinnedIds, pinnedEntries, recentEntries, launcherPinnedEntries, workspaceEntries, actions, copy.pinned, copy.recent, copy.suggested]);

  useEffect(() => { setActiveIndex(0); }, [query, effectiveMode]);
  useEffect(() => {
    if (!open) return;
    const active = listRef.current?.querySelector(`[data-command-index="${activeIndex}"]`);
    active?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex, open]);

  const selectedEntry = results[activeIndex] || results[0] || null;
  const currentId = selectedTool?.slug ? `tool:${selectedTool.slug}` : `route:${currentRoute}`;

  const chooseMode = (nextMode) => {
    setMode(nextMode);
    setQuery((value) => {
      const parsedValue = parseCommandQuery(value, nextMode);
      return parsedValue.prefix ? parsedValue.query : value;
    });
    setState(setCommandCenterMode(currentUser, nextMode));
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const runEntry = (entry) => {
    if (!entry) return;
    if (parsed.query) setState(recordCommandQuery(currentUser, parsed.query, effectiveMode));
    setOpen(false);
    setQuery('');
    if (entry.kind === 'action') {
      entry.run?.();
      return;
    }
    if (entry.kind === 'content') {
      openUniversalSearchEntry(entry);
      return;
    }
    if (entry.kind === 'workspace') {
      launchRoute({ target: entry.target || getWorkspaceLandingTarget(entry.workspaceId), label: entry.icon, color: entry.color });
      return;
    }
    recordAppUsage(currentUser, {
      id: entry.id, target: entry.target, title: entry.title, titleVi: entry.title,
      icon: entry.icon, color: entry.color, kind: entry.kind === 'route' ? 'route' : 'tool',
    });
    launchRoute({ target: entry.target, label: String(entry.icon || entry.title || 'GO').slice(0, 2), color: entry.color || '#191515' });
  };

  const onInputKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(Math.max(0, results.length - 1), index + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      runEntry(selectedEntry);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    }
  };

  const togglePin = (entry) => {
    if (!entry) return;
    setState(toggleCommandPinned(currentUser, entry.id));
  };

  if (!open || typeof document === 'undefined') return null;

  return (
    <UIOverlayPortal open={open} placement="command" onDismiss={() => setOpen(false)} className="bui-command-center-layer">
      <UIOverlaySurface className="bui-command-center" variant="command" role="dialog" aria-modal="true" aria-labelledby="bui-command-center-title">
        <header className="bui-command-center__search">
          <span aria-hidden="true">⌕</span>
          <div>
            <strong id="bui-command-center-title">{copy.title}</strong>
            <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={onInputKeyDown} placeholder={copy.placeholder} aria-label={copy.placeholder} autoComplete="off" />
          </div>
          <kbd>ESC</kbd>
        </header>

        <nav className="bui-command-center__scopes" aria-label={copy.title}>
          {SCOPES.map(([id, vi, en, prefix]) => (
            <button key={id} type="button" className={effectiveMode === id ? 'active' : ''} onClick={() => chooseMode(id)}>
              <span>{prefix}</span><b>{language === 'vi' ? vi : en}</b>
            </button>
          ))}
        </nav>

        {state.history.length ? (
          <div className="bui-command-center__history">
            <strong>{copy.history}</strong>
            <div>
              {state.history.slice(0, 6).map((item) => (
                <button key={`${item.mode}:${item.query}`} type="button" onClick={() => { setMode(item.mode); setQuery(item.query); inputRef.current?.focus(); }}>
                  {item.query}<small>{item.count > 1 ? `×${item.count}` : ''}</small>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setState(clearCommandHistory(currentUser))}>{copy.clear}</button>
          </div>
        ) : null}

        <div className="bui-command-center__body">
          <div className="bui-command-center__results" ref={listRef} role="listbox" aria-label={copy.title}>
            {results.map((entry, index) => (
              <button
                key={entry.id}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                data-command-index={index}
                className={index === activeIndex ? 'active' : ''}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => runEntry(entry)}
                style={{ '--command-accent': entry.color || 'var(--ui-color-primary)' }}
              >
                <span className="bui-command-center__icon" aria-hidden="true">{entry.icon || '•'}</span>
                <span className="bui-command-center__copy"><strong>{entry.title}</strong><small>{entry.subtitle || typeLabel(entry.kind, language)}</small></span>
                <span className="bui-command-center__meta">
                  {entry.section ? <small>{entry.section}</small> : null}
                  {entry.id === currentId ? <b>{copy.current}</b> : null}
                  {isCommandPinned(state, entry.id) ? <i aria-label={copy.pinned}>★</i> : null}
                </span>
                <span aria-hidden="true">↵</span>
              </button>
            ))}
            {!results.length ? <div className="bui-command-center__empty"><span>⌕</span><strong>{copy.noResults}</strong><p>{copy.noResultsHelp}</p></div> : null}
          </div>

          <aside className="bui-command-center__preview" aria-live="polite">
            {selectedEntry ? (
              <>
                <div className="bui-command-center__preview-mark" style={{ '--command-accent': selectedEntry.color || 'var(--ui-color-primary)' }}>{selectedEntry.icon || '•'}</div>
                <small>{typeLabel(selectedEntry.kind, language)}</small>
                <h3>{selectedEntry.title}</h3>
                <p>{selectedEntry.subtitle}</p>
                <dl>
                  <div><dt>{copy.workspace}</dt><dd>{getWorkspaceCatalog(language).find((workspace) => workspace.id === (selectedEntry.workspaceId || resolveWorkspaceId({ route: selectedEntry.route, selectedTool: selectedEntry.app })))?.displayLabel || 'Brian'}</dd></div>
                  {selectedEntry.sourceLabel ? <div><dt>{copy.source}</dt><dd>{selectedEntry.sourceLabel}</dd></div> : null}
                  {selectedEntry.updatedAt ? <div><dt>{copy.updated}</dt><dd>{formatTime(selectedEntry.updatedAt, language)}</dd></div> : null}
                  {selectedEntry.resumeAt ? <div><dt>{copy.recent}</dt><dd>{formatTime(selectedEntry.resumeAt, language)}</dd></div> : null}
                  <div><dt>{copy.shortcut}</dt><dd>Enter ↵</dd></div>
                </dl>
                <div className="bui-command-center__preview-actions">
                  <button type="button" className="primary" onClick={() => runEntry(selectedEntry)}>{copy.open}</button>
                  <button type="button" onClick={() => togglePin(selectedEntry)}>{isCommandPinned(state, selectedEntry.id) ? copy.unpin : copy.pin}</button>
                </div>
              </>
            ) : <p>{copy.noResults}</p>}
          </aside>
        </div>

        <footer className="bui-command-center__footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> {copy.move}</span>
          <span><kbd>↵</kbd> {copy.execute}</span>
          <span><kbd>⌘K</kbd> {copy.title}</span>
          <span><kbd>⌘⇧K</kbd> {copy.actions}</span>
          <span><kbd>⌘⇧F</kbd> {copy.content}</span>
        </footer>
      </UIOverlaySurface>
    </UIOverlayPortal>
  );
}
