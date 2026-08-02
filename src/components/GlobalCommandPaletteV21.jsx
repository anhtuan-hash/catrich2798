import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { APPS } from '../data/apps.js';
import { getAppDesignProfile } from '../data/designProfiles.js';
import { hasRouteAccess, hasToolAccess } from '../utils/permissions.js';
import { launchRoute } from '../utils/motion.js';
import { loadLauncherConfig, normalizeLauncherConfig, subscribeLauncherConfig } from '../utils/launcherPreferences.js';
import { getAppUsage, recordAppUsage, subscribeAppUsage } from '../utils/appUsage.js';
import { isAdminRole, isDepartmentLeaderRole } from '../utils/roles.js';
import { isAppHiddenForUser } from '../utils/appVisibility.js';
import { visibilityIdForRoute } from '../data/appVisibilityRegistry.js';
import {
  clearCommandHistory,
  inferNaturalHomeroomCommand,
  normalizeCommandText,
  parseCommandQuery,
  queueHomeroomAction,
  readCommandPreferences,
  recordCommandRun,
  requestIdleTask,
  restoreCommandPreferences,
  scoreCommandEntry,
  setCommandShortcut,
  toggleCommandPin,
} from '../commandCenter/commandCenterCore.js';
import { collectRegisteredCommands } from '../commandCenter/commandRegistry.js';
import './GlobalCommandPaletteV21.css';

const ROUTES = [
  { route: 'home', vi: 'Trang chủ', en: 'Home', icon: '⌂', color: '#FFC69D' },
  { route: 'apps', vi: 'Ứng dụng', en: 'Apps', icon: '▦', color: '#F05A7E' },
  { route: 'news', vi: 'Đọc báo', en: 'Newsroom', icon: '▤', color: '#167D78' },
  { route: 'games', vi: 'Trò chơi', en: 'Games', icon: '◈', color: '#5B2A86' },
  { route: 'dashboard', vi: 'Bảng điều hành', en: 'Work Dashboard', icon: 'DB', color: '#315FC4' },
  { route: 'homeroom', vi: 'Giáo viên chủ nhiệm', en: 'Homeroom', icon: '♙', color: '#1F8F70' },
  { route: 'library', vi: 'Thư viện', en: 'Library', icon: '▤', color: '#6FBA7B' },
  { route: 'resource-library', vi: 'Kho học liệu', en: 'Resource Library', icon: '▥', color: '#2878D0' },
  { route: 'knowledge-hub', vi: 'Kho học liệu thông minh', en: 'Smart Knowledge', icon: 'K', color: '#315FC4' },
  { route: 'work-hub', vi: 'Trung tâm công việc', en: 'Work Hub', icon: 'WH', color: '#14866D' },
  { route: 'assessment-core', vi: 'Ngân hàng câu hỏi', en: 'Assessment Core', icon: 'AC', color: '#CC7621' },
  { route: 'platform-readiness', vi: 'PWA, bảo mật & tiếp cận', en: 'Platform Readiness', icon: 'PR', color: '#0F766E' },
  { route: 'automation-center', vi: 'Trung tâm tự động hóa', en: 'Automation Center', icon: 'AU', color: '#1269B0' },
  { route: 'cloud-operations', vi: 'Vận hành nền 24/7', en: 'Cloud Operations', icon: 'CO', color: '#167B68' },
  { route: 'collaboration-hub', vi: 'Không gian cộng tác', en: 'Collaboration Hub', icon: 'CH', color: '#315FC4' },
  { route: 'data-governance', vi: 'Quản trị dữ liệu', en: 'Data Governance', icon: 'DG', color: '#A24B35' },
  { route: 'production-hardening', vi: 'Sẵn sàng Production', en: 'Production Hardening', icon: 'PH', color: '#0F766E', leaderOnly: true },
  { route: 'practice', vi: 'Lớp học', en: 'Classroom', icon: '⚡', color: '#00A4EF' },
  { route: 'settings', vi: 'Cài đặt', en: 'Settings', icon: '⚙', color: '#123C69' },
  { route: 'app-vault', vi: 'Ứng dụng đã ẩn', en: 'Hidden Apps Vault', icon: 'HV', color: '#684CC6', adminOnly: true },
  { route: 'admin', vi: 'Quản trị', en: 'Admin', icon: '☼', color: '#D13438', adminOnly: true },
];

const copy = {
  vi: {
    placeholder: 'Tìm ứng dụng, lớp, học sinh hoặc lệnh…', title: 'Brian Command Center',
    all: 'Tất cả', commands: 'Lệnh', people: 'Người', classes: 'Lớp', apps: 'Ứng dụng',
    suggestions: 'Đề xuất', results: 'Kết quả', recent: 'Gần đây', pinned: 'Đã ghim', frequent: 'Dùng thường xuyên',
    contextCommands: 'Lệnh theo ngữ cảnh', students: 'Học sinh', pages: 'Ứng dụng và trang', help: 'Trợ giúp',
    empty: 'Không tìm thấy kết quả phù hợp.', current: 'Đang mở', route: 'Trang', tool: 'Ứng dụng', command: 'Lệnh',
    class: 'Lớp', student: 'Học sinh', chooseClass: 'Chọn lớp', pin: 'Ghim', unpin: 'Bỏ ghim',
    confirm: 'Xác nhận', cancel: 'Hủy', undo: 'Hoàn tác', historyCleared: 'Đã xóa lịch sử Command K.',
    localReady: 'Thiết bị', localLoading: 'Đang chuẩn bị', more: 'Thêm tác vụ', less: 'Thu gọn tác vụ',
  },
  en: {
    placeholder: 'Search apps, classes, students or commands…', title: 'Brian Command Center',
    all: 'All', commands: 'Commands', people: 'People', classes: 'Classes', apps: 'Apps',
    suggestions: 'Suggested', results: 'Results', recent: 'Recent', pinned: 'Pinned', frequent: 'Frequently used',
    contextCommands: 'Context commands', students: 'Students', pages: 'Apps and pages', help: 'Help',
    empty: 'No matching results.', current: 'Current', route: 'Page', tool: 'App', command: 'Command',
    class: 'Class', student: 'Student', chooseClass: 'Choose a class', pin: 'Pin', unpin: 'Unpin',
    confirm: 'Confirm', cancel: 'Cancel', undo: 'Undo', historyCleared: 'Command K history cleared.',
    localReady: 'On device', localLoading: 'Preparing', more: 'More actions', less: 'Collapse actions',
  },
};

function canUse(entry, currentUser, visibilitySnapshot) {
  if (!currentUser) return entry.route === 'home';
  if (isAdminRole(currentUser.role)) return true;
  if (entry.adminOnly) return false;
  const visibilityId = entry.kind === 'tool' ? entry.id : visibilityIdForRoute(entry.route, entry.app);
  if (isAppHiddenForUser(visibilitySnapshot || {}, currentUser, visibilityId)) return false;
  if (entry.leaderOnly && !isDepartmentLeaderRole(currentUser.role)) return false;
  if (entry.kind === 'tool') return entry.route ? hasRouteAccess(currentUser, entry.route, entry.app) : hasToolAccess(currentUser, entry.slug);
  return hasRouteAccess(currentUser, entry.route);
}

function decorateEntry(entry) {
  return {
    ...entry,
    normalizedTitle: entry.normalizedTitle || normalizeCommandText(entry.title),
    normalizedKeywords: entry.normalizedKeywords || normalizeCommandText(`${entry.keywords || ''} ${entry.subtitle || ''}`),
  };
}

function buildNavigationEntries(language, currentUser, visibilitySnapshot) {
  const routeEntries = ROUTES.map((item) => decorateEntry({
    id: `route:${item.route}`, kind: 'route', route: item.route, target: `#/${item.route}`,
    title: language === 'vi' ? item.vi : item.en,
    subtitle: language === 'vi' ? 'Trang hệ thống' : 'System page',
    icon: item.icon, color: item.color, adminOnly: item.adminOnly, leaderOnly: item.leaderOnly, priority: 8,
    keywords: `${item.vi} ${item.en} ${item.route}`,
  }));
  const toolEntries = (Array.isArray(APPS) ? APPS : [])
    .filter((app) => app && (app.slug || app.route))
    .map((app) => {
      const profile = getAppDesignProfile(app.slug);
      const fallbackTitle = app.titleVi || app.title || app.slug || app.route || 'Ứng dụng';
      return decorateEntry({
        id: `tool:${app.slug || app.route}`, kind: 'tool', slug: app.slug || app.route,
        target: app.route ? `#/${app.route}` : `#/tool/${app.slug}`, route: app.route || '', app,
        title: language === 'vi' ? app.titleVi || app.title || fallbackTitle : app.title || app.titleVi || fallbackTitle,
        subtitle: language === 'vi' ? app.descVi || app.desc || '' : app.desc || app.descVi || '',
        icon: String(app.icon || fallbackTitle || 'AP').slice(0, 2).toUpperCase(), color: profile?.accent || '#191515', priority: 7,
        keywords: `${app.slug || ''} ${app.route || ''} ${app.title || ''} ${app.titleVi || ''} ${app.desc || ''} ${app.descVi || ''}`,
      });
    });
  return [...routeEntries, ...toolEntries]
    .filter((entry) => entry?.id && entry?.title)
    .filter((entry) => canUse(entry, currentUser, visibilitySnapshot));
}

function kindLabel(entry, t) {
  if (entry.kind === 'tool') return t.tool;
  if (entry.kind === 'route') return t.route;
  if (entry.kind === 'class') return t.class;
  if (entry.kind === 'student') return t.student;
  if (entry.kind === 'help') return t.help;
  return t.command;
}

function searchGroup(entry, t) {
  if (entry.inferred) return t.suggestions;
  if (entry.kind === 'student') return t.students;
  if (entry.kind === 'class') return t.classes;
  if (entry.kind === 'route' || entry.kind === 'tool') return t.pages;
  if (entry.kind === 'help') return t.help;
  return t.commands;
}

function groupSearchResults(entries, t, flow) {
  if (flow) return entries.map((entry) => ({ ...entry, displayGroup: t.classes }));
  const order = [t.suggestions, t.students, t.classes, t.pages, t.commands, t.help];
  const buckets = new Map(order.map((label) => [label, []]));
  entries.forEach((entry) => {
    const group = searchGroup(entry, t);
    if (!buckets.has(group)) buckets.set(group, []);
    buckets.get(group).push(entry);
  });
  return [...buckets.entries()].flatMap(([displayGroup, items]) => items.map((entry) => ({ ...entry, displayGroup })));
}

function CommandIcon({ children }) {
  return <span className="command-v21-icon" aria-hidden="true">{children}</span>;
}

function useDebouncedValue(value, delay = 70) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function installStudentQueryBridge() {
  const onQuery = (event) => {
    const query = String(event?.detail?.query || '').trim();
    if (!query) return;
    let attempts = 0;
    const apply = () => {
      attempts += 1;
      const input = document.querySelector('.hr-filter-row input[placeholder*="Tìm học sinh"], .hr-filter-row input[placeholder*="student"]');
      if (!input && attempts < 10) {
        window.setTimeout(apply, 90);
        return;
      }
      if (!input) return;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (setter) setter.call(input, query);
      else input.value = query;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
    };
    window.setTimeout(apply, 50);
  };
  window.addEventListener('bes-homeroom-student-query', onQuery);
  return () => window.removeEventListener('bes-homeroom-student-query', onQuery);
}

export default function GlobalCommandPaletteV21({
  language = 'vi', currentUser, currentRoute = 'home', selectedTool = null, appVisibility: externalAppVisibility,
}) {
  const t = copy[language] || copy.vi;
  const appVisibility = externalAppVisibility && typeof externalAppVisibility === 'object' ? externalAppVisibility : { snapshot: {} };
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [actionMode, setActionMode] = useState(false);
  const [activeActionIndex, setActiveActionIndex] = useState(0);
  const [expandedActionEntryId, setExpandedActionEntryId] = useState('');
  const [launcherConfig, setLauncherConfig] = useState(() => normalizeLauncherConfig(loadLauncherConfig()));
  const [usage, setUsage] = useState(() => getAppUsage(currentUser));
  const [localIndex, setLocalIndex] = useState({ entries: [], classes: [], students: [], stats: null });
  const [indexLoading, setIndexLoading] = useState(false);
  const [preferences, setPreferences] = useState(() => readCommandPreferences(currentUser));
  const [flow, setFlow] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [undoState, setUndoState] = useState(null);
  const [pendingShortcutId, setPendingShortcutId] = useState('');
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const runEntryRef = useRef(null);
  const debouncedQuery = useDebouncedValue(query, 70);

  const navigationEntries = useMemo(
    () => buildNavigationEntries(language, currentUser, appVisibility?.snapshot || {}),
    [language, currentUser, appVisibility?.snapshot],
  );
  const registeredCommands = useMemo(
    () => collectRegisteredCommands({ language, currentRoute, currentUser, selectedTool }).map(decorateEntry),
    [language, currentRoute, currentUser, selectedTool],
  );
  const entries = useMemo(
    () => [...navigationEntries, ...registeredCommands, ...(localIndex.entries || [])],
    [navigationEntries, registeredCommands, localIndex.entries],
  );
  const byId = useMemo(() => new Map(entries.map((entry) => [entry.id, entry])), [entries]);

  useEffect(() => installStudentQueryBridge(), []);

  useEffect(() => {
    const unsubscribeLauncher = subscribeLauncherConfig((next) => setLauncherConfig(normalizeLauncherConfig(next)));
    const unsubscribeUsage = subscribeAppUsage(currentUser, (next) => setUsage(Array.isArray(next) ? next : []));
    return () => { unsubscribeLauncher(); unsubscribeUsage(); };
  }, [currentUser]);

  useEffect(() => {
    setUsage(getAppUsage(currentUser));
    setPreferences(readCommandPreferences(currentUser));
  }, [currentUser]);

  useEffect(() => {
    const openPalette = (event) => {
      setOpen(true);
      setFlow(null);
      setQuery(String(event?.detail?.query || ''));
    };
    const keyHandler = (event) => {
      const target = event.target;
      const typing = Boolean(target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) || Boolean(target?.isContentEditable);
      const key = String(event.key || '').toLowerCase();
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && /^[1-9]$/.test(key)) {
        const shortcutId = preferences.shortcuts?.[key];
        if (!shortcutId) return;
        event.preventDefault();
        const entry = byId.get(shortcutId);
        if (entry) runEntryRef.current?.(entry);
        else {
          setPendingShortcutId(shortcutId);
          setOpen(true);
          setQuery('');
        }
        return;
      }
      if ((event.metaKey || event.ctrlKey) && key === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
        return;
      }
      if (!typing && event.key === '/' && !open) {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === 'Escape' && open && !confirmation) {
        if (flow) { setFlow(null); setQuery(''); }
        else setOpen(false);
      }
    };
    window.addEventListener('bes-command-palette-open', openPalette);
    window.addEventListener('keydown', keyHandler);
    return () => {
      window.removeEventListener('bes-command-palette-open', openPalette);
      window.removeEventListener('keydown', keyHandler);
    };
  }, [open, flow, confirmation, preferences.shortcuts, byId]);

  useEffect(() => {
    if (!open || !currentUser) return undefined;
    let cancelled = false;
    setIndexLoading(true);
    const cancelIdle = requestIdleTask(async () => {
      try {
        const module = await import('../commandCenter/localCommandData.js');
        const next = module.loadLocalCommandIndex({ user: currentUser, language });
        if (!cancelled) setLocalIndex(next);
      } catch (error) {
        console.warn('[CommandCenter] local index unavailable', error);
      } finally {
        if (!cancelled) setIndexLoading(false);
      }
    }, 450);
    return () => { cancelled = true; cancelIdle?.(); };
  }, [open, currentUser?.id, currentUser?.authId, currentUser?.email, language]);

  useEffect(() => {
    if (!pendingShortcutId) return;
    const entry = byId.get(pendingShortcutId);
    if (!entry) return;
    setPendingShortcutId('');
    window.setTimeout(() => runEntryRef.current?.(entry), 0);
  }, [pendingShortcutId, byId]);

  useEffect(() => {
    if (!open) return undefined;
    setActiveIndex(0);
    setActionMode(false);
    setExpandedActionEntryId('');
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [open, flow]);

  useEffect(() => {
    setActiveIndex(0);
    setActionMode(false);
    setActiveActionIndex(0);
    setExpandedActionEntryId('');
  }, [debouncedQuery]);

  useEffect(() => {
    if (!undoState) return undefined;
    const timer = window.setTimeout(() => setUndoState(null), 8000);
    return () => window.clearTimeout(timer);
  }, [undoState]);

  const safeUsage = Array.isArray(usage) ? usage : [];
  const safeLauncherPinned = Array.isArray(launcherConfig?.pinned) ? launcherConfig.pinned : [];
  const launcherPinnedEntries = useMemo(
    () => safeLauncherPinned.map((id) => byId.get(`tool:${id}`) || byId.get(id)).filter(Boolean),
    [safeLauncherPinned, byId],
  );
  const commandPinnedEntries = useMemo(
    () => (preferences.pinned || []).map((id) => byId.get(id)).filter(Boolean),
    [preferences.pinned, byId],
  );
  const commandHistoryEntries = useMemo(
    () => (preferences.history || []).map((item) => byId.get(item.id)).filter(Boolean).slice(0, 8),
    [preferences.history, byId],
  );
  const recentEntries = useMemo(
    () => safeUsage.map((item) => byId.get(item.id)).filter(Boolean).slice(0, 6),
    [safeUsage, byId],
  );
  const frequentEntries = useMemo(
    () => [...safeUsage]
      .sort((a, b) => Number(b?.count || 0) - Number(a?.count || 0) || Number(b?.lastUsedAt || 0) - Number(a?.lastUsedAt || 0))
      .map((item) => byId.get(item.id)).filter(Boolean).slice(0, 6),
    [safeUsage, byId],
  );

  const parsedQuery = useMemo(() => parseCommandQuery(debouncedQuery), [debouncedQuery]);
  const inferredEntry = useMemo(
    () => (!flow ? inferNaturalHomeroomCommand(debouncedQuery, localIndex.classes || [], language) : null),
    [flow, debouncedQuery, localIndex.classes, language],
  );
  const searchPool = flow ? (localIndex.classes || []) : entries;
  const searchResults = useMemo(() => {
    const forcedParsed = flow ? { ...parsedQuery, mode: 'class' } : parsedQuery;
    if (!forcedParsed.normalized && forcedParsed.mode === 'all' && !flow) return [];
    const ranked = searchPool
      .map((entry) => ({ entry, score: scoreCommandEntry(entry, forcedParsed) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || String(a.entry?.title || '').localeCompare(String(b.entry?.title || ''), language === 'vi' ? 'vi' : 'en'))
      .slice(0, 24)
      .map((item) => item.entry);
    if (inferredEntry && !ranked.some((entry) => entry.id === inferredEntry.id)) return [decorateEntry(inferredEntry), ...ranked].slice(0, 24);
    return ranked;
  }, [searchPool, parsedQuery, language, flow, inferredEntry]);

  const defaultResults = useMemo(() => {
    if (flow) return (localIndex.classes || []).slice(0, 24).map((entry) => ({ ...entry, section: t.classes }));
    const seen = new Set();
    const output = [];
    const push = (entry, section) => {
      if (!entry?.id || !entry?.title || seen.has(entry.id)) return;
      seen.add(entry.id);
      output.push({ ...entry, section });
    };
    commandPinnedEntries.forEach((entry) => push(entry, t.pinned));
    launcherPinnedEntries.forEach((entry) => push(entry, t.pinned));
    commandHistoryEntries.forEach((entry) => push(entry, t.recent));
    recentEntries.forEach((entry) => push(entry, t.recent));
    frequentEntries.forEach((entry) => push(entry, t.frequent));
    registeredCommands.filter((entry) => entry.kind === 'command').forEach((entry) => push(entry, t.contextCommands));
    return output.slice(0, 22);
  }, [flow, localIndex.classes, commandPinnedEntries, launcherPinnedEntries, commandHistoryEntries, recentEntries, frequentEntries, registeredCommands, t]);

  const isSearching = Boolean(parsedQuery.normalized || parsedQuery.mode !== 'all');
  const rawResults = isSearching ? searchResults : defaultResults;
  const results = useMemo(() => {
    if (isSearching || flow) return groupSearchResults(rawResults, t, flow);
    return rawResults.map((entry) => ({ ...entry, displayGroup: entry.section || t.suggestions }));
  }, [rawResults, isSearching, flow, t]);
  const activeEntry = results[activeIndex] || null;
  const activeActions = Array.isArray(activeEntry?.actions) ? activeEntry.actions.slice(0, 4) : [];

  useEffect(() => {
    if (!results.length && activeIndex !== 0) setActiveIndex(0);
    else if (results.length && activeIndex > results.length - 1) setActiveIndex(results.length - 1);
  }, [results.length, activeIndex]);

  const persistPreferences = (next) => {
    setPreferences(next);
    return next;
  };

  const executeCommandAction = (action, sourceEntry = null) => {
    if (!action || typeof window === 'undefined') return;
    if (action.type === 'homeroom.navigate') {
      queueHomeroomAction(action);
      return;
    }
    if (action.type === 'select-class') {
      setFlow({ type: 'select-class', tab: action.tab || 'overview', sourceTitle: sourceEntry?.title || t.chooseClass });
      setQuery('');
      setConfirmation(null);
      window.setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }
    if (action.type === 'route' && action.target) {
      window.location.hash = action.target;
      return;
    }
    if (action.type === 'event' && action.name) {
      window.dispatchEvent(new CustomEvent(action.name, { detail: action.detail || {} }));
      return;
    }
    if (action.type === 'launcher.edit') {
      window.location.hash = '#/apps';
      window.setTimeout(() => window.dispatchEvent(new CustomEvent('bes-launcher-edit')), 220);
      return;
    }
    if (action.type === 'fill-query') {
      setOpen(true);
      setQuery(String(action.value || ''));
      return;
    }
    if (action.type === 'local.clear-history') {
      const snapshots = clearCommandHistory(currentUser);
      persistPreferences(snapshots.after);
      setUndoState({ label: t.historyCleared, snapshot: snapshots.before });
    }
  };

  const runQuickAction = (action, entry = activeEntry) => {
    if (!action?.action || !entry) return;
    setOpen(false);
    setQuery('');
    setFlow(null);
    persistPreferences(recordCommandRun(currentUser, entry));
    executeCommandAction(action.action, entry);
  };

  const runEntry = (entry) => {
    if (!entry) return;
    if (flow && entry.kind === 'class') {
      setOpen(false);
      setQuery('');
      persistPreferences(recordCommandRun(currentUser, entry));
      queueHomeroomAction({ type: 'homeroom.navigate', workspaceId: entry.metadata?.workspaceId, tab: flow.tab || 'overview' });
      setFlow(null);
      return;
    }
    if (entry.confirm) {
      setConfirmation(entry);
      return;
    }
    if (['fill-query', 'select-class', 'local.clear-history'].includes(entry.commandAction?.type)) {
      executeCommandAction(entry.commandAction, entry);
      return;
    }
    setOpen(false);
    setQuery('');
    setFlow(null);
    persistPreferences(recordCommandRun(currentUser, entry));
    if (entry.commandAction) {
      executeCommandAction(entry.commandAction, entry);
      return;
    }
    recordAppUsage(currentUser, {
      id: entry.id, target: entry.target, title: entry.title, titleVi: entry.title,
      icon: entry.icon, color: entry.color, kind: entry.kind,
    });
    launchRoute({ target: entry.target, label: String(entry.icon || entry.title || 'GO').slice(0, 2), color: entry.color || '#191515' });
  };
  runEntryRef.current = runEntry;

  const togglePin = (entry = activeEntry) => {
    if (!entry?.id || entry.kind === 'help') return;
    const wasPinned = preferences.pinned.includes(entry.id);
    let next = toggleCommandPin(currentUser, entry.id);
    if (!wasPinned) {
      const used = new Set(Object.keys(next.shortcuts || {}));
      const digit = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].find((item) => !used.has(item));
      if (digit) next = setCommandShortcut(currentUser, digit, entry.id);
    } else {
      Object.entries(next.shortcuts || {}).forEach(([digit, entryId]) => {
        if (entryId === entry.id) next = setCommandShortcut(currentUser, digit, '');
      });
    }
    persistPreferences(next);
  };

  const shortcutFor = (entryId) => Object.entries(preferences.shortcuts || {}).find(([, id]) => id === entryId)?.[0] || '';

  const onInputKeyDown = (event) => {
    if ((event.metaKey || event.ctrlKey) && String(event.key).toLowerCase() === 'p') {
      event.preventDefault();
      togglePin(activeEntry);
      return;
    }
    if ((event.altKey || event.metaKey) && /^[1-4]$/.test(event.key) && activeActions.length) {
      event.preventDefault();
      runQuickAction(activeActions[Number(event.key) - 1]);
      return;
    }
    if (event.key === 'Tab' && activeActions.length) {
      event.preventDefault();
      setActionMode(true);
      setActiveActionIndex((index) => event.shiftKey
        ? (index - 1 + activeActions.length) % activeActions.length
        : (index + 1) % activeActions.length);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActionMode(false);
      setExpandedActionEntryId('');
      if (results.length) setActiveIndex((index) => Math.min(results.length - 1, index + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActionMode(false);
      setExpandedActionEntryId('');
      if (results.length) setActiveIndex((index) => Math.max(0, index - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (actionMode && activeActions[activeActionIndex]) runQuickAction(activeActions[activeActionIndex]);
      else runEntry(activeEntry);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      if (confirmation) setConfirmation(null);
      else if (flow) { setFlow(null); setQuery(''); }
      else setOpen(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const active = listRef.current?.querySelector(`[data-command-index="${activeIndex}"]`);
    active?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex, open]);

  if (!open || typeof document === 'undefined') return null;
  const currentId = selectedTool?.slug ? `tool:${selectedTool.slug}` : `route:${currentRoute}`;
  const localStatusText = indexLoading ? t.localLoading : t.localReady;
  const localStatusTitle = indexLoading
    ? (language === 'vi' ? 'Đang lập chỉ mục từ dữ liệu đã lưu trên thiết bị.' : 'Indexing saved on-device data.')
    : localIndex.stats
      ? `${language === 'vi' ? 'Dữ liệu trên thiết bị' : 'On-device data'}: ${localIndex.stats.classCount} ${t.classes.toLowerCase()} · ${localIndex.stats.studentCount} ${t.students.toLowerCase()} · 0 network requests`
      : (language === 'vi' ? 'Command Center ưu tiên dữ liệu trên thiết bị.' : 'Command Center prioritizes on-device data.');

  return createPortal(
    <div className="global-command-palette-layer command-v21-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="global-command-palette command-v21" role="dialog" aria-modal="true" aria-label={t.title}>
        <div className="command-v21-colorbar" aria-hidden="true"><i /><i /><i /><i /></div>
        <header className="command-v21-header">
          {flow ? <button type="button" className="command-v21-back" onClick={() => { setFlow(null); setQuery(''); }} aria-label={language === 'vi' ? 'Quay lại' : 'Back'}>←</button> : <span className="command-v21-search-icon" aria-hidden="true">⌕</span>}
          <input
            ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={onInputKeyDown}
            placeholder={flow ? `${t.chooseClass}: ${flow.sourceTitle}` : t.placeholder}
            aria-label={flow ? t.chooseClass : t.placeholder} autoComplete="off" data-bes-keep-search="true"
          />
          <span className={`command-v21-local-status ${indexLoading ? 'is-loading' : ''}`} title={localStatusTitle} aria-label={localStatusTitle}><i /> <span>{localStatusText}</span></span>
          <kbd className="command-v21-esc">ESC</kbd>
        </header>

        {!flow ? <nav className="command-v21-modes" aria-label={language === 'vi' ? 'Bộ lọc tìm kiếm' : 'Search filters'}>
          {[
            ['', t.all, 'all'], ['>', t.commands, 'command'], ['@', t.people, 'person'], ['#', t.classes, 'class'], ['/', t.apps, 'app'],
          ].map(([prefix, label, mode]) => <button
            key={mode} type="button" className={parsedQuery.mode === mode ? 'active' : ''}
            onClick={() => {
              if (!prefix) setQuery(parseCommandQuery(query).value);
              else setQuery(`${prefix} ${parseCommandQuery(query).value}`.trimEnd() + ' ');
              window.setTimeout(() => inputRef.current?.focus(), 0);
            }}
          >{prefix ? <kbd>{prefix}</kbd> : null}<span>{label}</span></button>)}
        </nav> : null}

        <div className="command-v21-meta">
          <strong>{flow ? `${t.chooseClass} · ${flow.sourceTitle}` : isSearching ? t.results : t.suggestions}</strong>
          <span>{results.length}</span>
        </div>

        <div className="command-v21-results" ref={listRef} role="listbox">
          {results.map((entry, index) => {
            const shortcut = shortcutFor(entry.id);
            const pinned = preferences.pinned.includes(entry.id);
            const isActive = index === activeIndex;
            const actions = Array.isArray(entry.actions) ? entry.actions.slice(0, 4) : [];
            const expanded = expandedActionEntryId === entry.id;
            const visibleActions = expanded ? actions : actions.slice(0, 2);
            const showGroup = index === 0 || results[index - 1]?.displayGroup !== entry.displayGroup;
            return <React.Fragment key={entry.id}>
              {showGroup ? <div className="command-v21-group" role="presentation"><span>{entry.displayGroup}</span></div> : null}
              <div
                role="option" aria-selected={isActive} data-command-index={index}
                className={`command-v21-result-shell ${isActive ? 'active' : ''} ${entry.inferred ? 'is-inferred' : ''}`}
                style={{ '--command-accent': entry.color || '#191515' }}
                onMouseEnter={() => { setActiveIndex(index); setActionMode(false); if (expandedActionEntryId && expandedActionEntryId !== entry.id) setExpandedActionEntryId(''); }}
              >
                <button type="button" className="command-v21-result-main" onClick={() => runEntry(entry)}>
                  <CommandIcon>{entry.icon || '•'}</CommandIcon>
                  <span className="command-v21-result-copy">
                    <strong>{String(entry.title || '')}{entry.inferred ? <sup>{language === 'vi' ? 'cục bộ' : 'local'}</sup> : null}</strong>
                    <small>{entry.subtitle || kindLabel(entry, t)}</small>
                  </span>
                  <span className="command-v21-result-state">
                    {pinned ? <span className="command-v21-pin-dot" title={t.pinned}>◆</span> : null}
                    {shortcut ? <kbd>⌘⇧{shortcut}</kbd> : null}
                    {entry.id === currentId ? <em>{t.current}</em> : null}
                    <span className="command-v21-enter" aria-hidden="true">↵</span>
                  </span>
                </button>

                {isActive && !confirmation ? <div className="command-v21-inline-actions" aria-label={language === 'vi' ? 'Tác vụ nhanh' : 'Quick actions'}>
                  {visibleActions.map((action, actionIndex) => <button
                    key={action.id || actionIndex} type="button"
                    className={actionMode && actionIndex === activeActionIndex ? 'active' : ''}
                    onClick={(event) => { event.stopPropagation(); runQuickAction(action, entry); }}
                    title={`${action.label} · ⌥${actionIndex + 1}`}
                  ><span>{action.icon || '↗'}</span><b>{action.label}</b><kbd>⌥{actionIndex + 1}</kbd></button>)}
                  {actions.length > 2 ? <button
                    type="button" className="command-v21-more"
                    onClick={(event) => { event.stopPropagation(); setExpandedActionEntryId(expanded ? '' : entry.id); }}
                    aria-label={expanded ? t.less : t.more} title={expanded ? t.less : t.more}
                  >{expanded ? '−' : '⋯'}</button> : null}
                  {entry.kind !== 'help' ? <button
                    type="button" className="command-v21-pin-action"
                    onClick={(event) => { event.stopPropagation(); togglePin(entry); }}
                    aria-label={pinned ? t.unpin : t.pin} title={`${pinned ? t.unpin : t.pin} · ⌘P`}
                  >{pinned ? '◆' : '◇'}</button> : null}
                </div> : null}
              </div>
            </React.Fragment>;
          })}
          {!results.length ? <div className="command-v21-empty"><span>⌕</span><strong>{t.empty}</strong><small>{language === 'vi' ? 'Thử dùng > lệnh, @ người, # lớp hoặc / ứng dụng.' : 'Try > commands, @ people, # classes or / apps.'}</small></div> : null}
        </div>

        {confirmation ? <section className="command-v21-confirm" role="alertdialog" aria-modal="true">
          <span>!</span>
          <div><strong>{confirmation.confirm?.title || t.confirm}</strong><p>{confirmation.confirm?.message || ''}</p></div>
          <div>
            <button type="button" onClick={() => setConfirmation(null)}>{t.cancel}</button>
            <button type="button" className="danger" onClick={() => {
              const entry = confirmation;
              setConfirmation(null);
              executeCommandAction(entry.commandAction, entry);
            }}>{confirmation.confirm?.confirmLabel || t.confirm}</button>
          </div>
        </section> : null}

        {undoState ? <div className="command-v21-undo" role="status"><span>{undoState.label}</span><button type="button" onClick={() => {
          persistPreferences(restoreCommandPreferences(currentUser, undoState.snapshot));
          setUndoState(null);
        }}>{t.undo}</button></div> : null}

        <footer className="command-v21-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> {language === 'vi' ? 'Di chuyển' : 'Move'}</span>
          <span><kbd>↵</kbd> {language === 'vi' ? 'Mở' : 'Open'}</span>
          <span><kbd>Tab</kbd> {language === 'vi' ? 'Tác vụ' : 'Actions'}</span>
          <span><kbd>⌘P</kbd> {language === 'vi' ? 'Ghim' : 'Pin'}</span>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
