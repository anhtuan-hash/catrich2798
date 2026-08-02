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
  normalizeCommandText,
  parseCommandQuery,
  queueHomeroomAction,
  recordCommandRun,
  requestIdleTask,
} from '../commandCenter/commandCenterCore.js';
import { collectRegisteredCommands } from '../commandCenter/commandRegistry.js';

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
    placeholder: 'Tìm ứng dụng, lớp, học sinh hoặc lệnh…',
    title: 'Brian Command Center',
    hint: '↑↓ chọn · Enter mở · Esc đóng · dùng > @ # / để lọc',
    recent: 'Gần đây', pinned: 'Đã ghim', frequent: 'Dùng thường xuyên', commands: 'Lệnh theo ngữ cảnh',
    empty: 'Không tìm thấy kết quả phù hợp.', current: 'Đang mở', route: 'Trang', tool: 'Ứng dụng', command: 'Lệnh',
    class: 'Lớp', student: 'Học sinh', help: 'Trợ giúp', loading: 'Đang lập chỉ mục dữ liệu cục bộ…', local: 'Chỉ mục cục bộ',
  },
  en: {
    placeholder: 'Search apps, classes, students or commands…',
    title: 'Brian Command Center',
    hint: '↑↓ select · Enter open · Esc close · use > @ # / to filter',
    recent: 'Recent', pinned: 'Pinned', frequent: 'Frequently used', commands: 'Context commands',
    empty: 'No matching results.', current: 'Current', route: 'Page', tool: 'App', command: 'Command',
    class: 'Class', student: 'Student', help: 'Help', loading: 'Indexing local data…', local: 'Local index',
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
    id: `route:${item.route}`,
    kind: 'route',
    route: item.route,
    target: `#/${item.route}`,
    title: language === 'vi' ? item.vi : item.en,
    subtitle: language === 'vi' ? 'Trang hệ thống' : 'System page',
    icon: item.icon,
    color: item.color,
    adminOnly: item.adminOnly,
    leaderOnly: item.leaderOnly,
    priority: 8,
    keywords: `${item.vi} ${item.en} ${item.route}`,
  }));

  const toolEntries = (Array.isArray(APPS) ? APPS : [])
    .filter((app) => app && (app.slug || app.route))
    .map((app) => {
      const profile = getAppDesignProfile(app.slug);
      const fallbackTitle = app.titleVi || app.title || app.slug || app.route || 'Ứng dụng';
      return decorateEntry({
        id: `tool:${app.slug || app.route}`,
        kind: 'tool',
        slug: app.slug || app.route,
        target: app.route ? `#/${app.route}` : `#/tool/${app.slug}`,
        route: app.route || '',
        app,
        title: language === 'vi' ? app.titleVi || app.title || fallbackTitle : app.title || app.titleVi || fallbackTitle,
        subtitle: language === 'vi' ? app.descVi || app.desc || '' : app.desc || app.descVi || '',
        icon: String(app.icon || fallbackTitle || 'AP').slice(0, 2).toUpperCase(),
        color: profile?.accent || '#191515',
        priority: 7,
        keywords: `${app.slug || ''} ${app.route || ''} ${app.title || ''} ${app.titleVi || ''} ${app.desc || ''} ${app.descVi || ''}`,
      });
    });

  return [...routeEntries, ...toolEntries]
    .filter((entry) => entry?.id && entry?.title)
    .filter((entry) => canUse(entry, currentUser, visibilitySnapshot));
}

function scoreEntry(entry, parsed) {
  if (!entry) return 0;
  const modeAllowed = parsed.mode === 'all'
    || (parsed.mode === 'command' && entry.kind === 'command')
    || (parsed.mode === 'person' && ['student', 'teacher'].includes(entry.kind))
    || (parsed.mode === 'class' && entry.kind === 'class')
    || (parsed.mode === 'app' && ['route', 'tool'].includes(entry.kind))
    || (parsed.mode === 'help' && entry.kind === 'help');
  if (!modeAllowed) return 0;
  const query = parsed.normalized;
  if (!query) return Number(entry.priority || 1);
  const title = entry.normalizedTitle || normalizeCommandText(entry.title);
  const keywords = entry.normalizedKeywords || normalizeCommandText(`${entry.keywords || ''} ${entry.subtitle || ''}`);
  const tokens = query.split(' ').filter(Boolean);
  let score = Number(entry.priority || 0);
  if (title === query) score += 160;
  if (title.startsWith(query)) score += 90;
  if (title.includes(query)) score += 55;
  if (keywords.includes(query)) score += 28;
  tokens.forEach((token) => {
    if (title.startsWith(token)) score += 22;
    else if (title.includes(token)) score += 14;
    else if (keywords.includes(token)) score += 6;
  });
  return score;
}

function CommandIcon({ children }) {
  return <span className="command-palette-command-icon" aria-hidden="true">{children}</span>;
}

function kindLabel(entry, t) {
  if (entry.kind === 'tool') return t.tool;
  if (entry.kind === 'route') return t.route;
  if (entry.kind === 'class') return t.class;
  if (entry.kind === 'student') return t.student;
  if (entry.kind === 'help') return t.help;
  return t.command;
}

export default function GlobalCommandPalette({
  language = 'vi', currentUser, currentRoute = 'home', selectedTool = null, appVisibility: externalAppVisibility,
}) {
  const t = copy[language] || copy.vi;
  const appVisibility = externalAppVisibility && typeof externalAppVisibility === 'object'
    ? externalAppVisibility
    : { snapshot: {} };
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [launcherConfig, setLauncherConfig] = useState(() => normalizeLauncherConfig(loadLauncherConfig()));
  const [usage, setUsage] = useState(() => getAppUsage(currentUser));
  const [localIndex, setLocalIndex] = useState({ entries: [], classes: [], students: [], stats: null });
  const [indexLoading, setIndexLoading] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);

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

  useEffect(() => {
    const unsubscribeLauncher = subscribeLauncherConfig((next) => setLauncherConfig(normalizeLauncherConfig(next)));
    const unsubscribeUsage = subscribeAppUsage(currentUser, (next) => setUsage(Array.isArray(next) ? next : []));
    return () => { unsubscribeLauncher(); unsubscribeUsage(); };
  }, [currentUser]);

  useEffect(() => { setUsage(getAppUsage(currentUser)); }, [currentUser]);

  useEffect(() => {
    const openPalette = (event) => {
      setOpen(true);
      setQuery(String(event?.detail?.query || ''));
    };
    const keyHandler = (event) => {
      const target = event.target;
      const typing = Boolean(target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) || Boolean(target?.isContentEditable);
      const key = String(event.key || '').toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
        return;
      }
      if (!typing && event.key === '/' && !open) {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === 'Escape' && open) setOpen(false);
    };
    window.addEventListener('bes-command-palette-open', openPalette);
    window.addEventListener('keydown', keyHandler);
    return () => {
      window.removeEventListener('bes-command-palette-open', openPalette);
      window.removeEventListener('keydown', keyHandler);
    };
  }, [open]);

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
    if (!open) return undefined;
    setActiveIndex(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => { setActiveIndex(0); }, [query]);

  const safeUsage = Array.isArray(usage) ? usage : [];
  const safePinned = Array.isArray(launcherConfig?.pinned) ? launcherConfig.pinned : [];
  const pinnedEntries = useMemo(
    () => safePinned.map((id) => byId.get(`tool:${id}`) || byId.get(id)).filter(Boolean),
    [safePinned, byId],
  );
  const recentEntries = useMemo(
    () => safeUsage.map((item) => byId.get(item.id)).filter(Boolean).slice(0, 6),
    [safeUsage, byId],
  );
  const frequentEntries = useMemo(
    () => [...safeUsage]
      .sort((a, b) => Number(b?.count || 0) - Number(a?.count || 0) || Number(b?.lastUsedAt || 0) - Number(a?.lastUsedAt || 0))
      .map((item) => byId.get(item.id))
      .filter(Boolean)
      .slice(0, 6),
    [safeUsage, byId],
  );

  const parsedQuery = useMemo(() => parseCommandQuery(query), [query]);
  const searchResults = useMemo(() => {
    if (!parsedQuery.normalized && parsedQuery.mode === 'all') return [];
    return entries
      .map((entry) => ({ entry, score: scoreEntry(entry, parsedQuery) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || String(a.entry?.title || '').localeCompare(String(b.entry?.title || ''), language === 'vi' ? 'vi' : 'en'))
      .slice(0, 22)
      .map((item) => item.entry);
  }, [entries, parsedQuery, language]);

  const defaultResults = useMemo(() => {
    const seen = new Set();
    const output = [];
    const push = (entry, section) => {
      if (!entry?.id || !entry?.title || seen.has(entry.id)) return;
      seen.add(entry.id);
      output.push({ ...entry, section });
    };
    recentEntries.forEach((entry) => push(entry, t.recent));
    pinnedEntries.forEach((entry) => push(entry, t.pinned));
    frequentEntries.forEach((entry) => push(entry, t.frequent));
    registeredCommands.filter((entry) => entry.kind === 'command').forEach((entry) => push(entry, t.commands));
    return output.slice(0, 20);
  }, [recentEntries, pinnedEntries, frequentEntries, registeredCommands, t]);

  const results = (parsedQuery.normalized || parsedQuery.mode !== 'all') ? searchResults : defaultResults;

  useEffect(() => {
    if (!results.length && activeIndex !== 0) setActiveIndex(0);
    else if (results.length && activeIndex > results.length - 1) setActiveIndex(results.length - 1);
  }, [results.length, activeIndex]);

  const executeCommandAction = (action) => {
    if (!action || typeof window === 'undefined') return;
    if (action.type === 'homeroom.navigate') {
      queueHomeroomAction(action);
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
    }
  };

  const runEntry = (entry) => {
    if (!entry) return;
    if (entry.commandAction?.type === 'fill-query') {
      executeCommandAction(entry.commandAction);
      window.setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }
    setOpen(false);
    setQuery('');
    recordCommandRun(currentUser, entry);
    if (entry.commandAction) {
      executeCommandAction(entry.commandAction);
      return;
    }
    recordAppUsage(currentUser, {
      id: entry.id,
      target: entry.target,
      title: entry.title,
      titleVi: entry.title,
      icon: entry.icon,
      color: entry.color,
      kind: entry.kind,
    });
    launchRoute({
      target: entry.target,
      label: String(entry.icon || entry.title || 'GO').slice(0, 2),
      color: entry.color || '#191515',
    });
  };

  const onInputKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (results.length) setActiveIndex((index) => Math.min(results.length - 1, index + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (results.length) setActiveIndex((index) => Math.max(0, index - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      runEntry(results[activeIndex]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const active = listRef.current?.querySelector(`[data-command-index="${activeIndex}"]`);
    active?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex, open]);

  if (!open || typeof document === 'undefined') return null;

  const currentId = selectedTool?.slug ? `tool:${selectedTool.slug}` : `route:${currentRoute}`;

  return createPortal(
    <div className="global-command-palette-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="global-command-palette" role="dialog" aria-modal="true" aria-label={t.title}>
        <header className="command-palette-header">
          <span className="command-palette-search-icon" aria-hidden="true">⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder={t.placeholder}
            aria-label={t.placeholder}
            autoComplete="off"
            data-bes-keep-search="true"
          />
          <kbd>ESC</kbd>
        </header>
        <div className="command-palette-caption">
          <span><strong>{t.title}</strong><small>{t.hint}</small></span>
          {indexLoading ? <em>{t.loading}</em> : localIndex.stats ? <em>{t.local}: {localIndex.stats.classCount} · {localIndex.stats.studentCount}</em> : null}
        </div>
        <div className="command-palette-results" ref={listRef} role="listbox">
          {results.map((entry, index) => (
            <button
              key={entry.id}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              data-command-index={index}
              className={`command-palette-result ${index === activeIndex ? 'active' : ''}`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => runEntry(entry)}
              style={{ '--command-accent': entry.color || '#191515' }}
            >
              <CommandIcon>{entry.icon || '•'}</CommandIcon>
              <span className="command-palette-result-copy">
                <strong>{String(entry.title || '')}</strong>
                <small>{entry.subtitle || kindLabel(entry, t)}</small>
              </span>
              {entry.section ? <span className="command-palette-section-tag">{entry.section}</span> : null}
              {!entry.section ? <span className="command-palette-section-tag">{kindLabel(entry, t)}</span> : null}
              {entry.id === currentId ? <span className="command-palette-current">{t.current}</span> : null}
              <span className="command-palette-enter" aria-hidden="true">↵</span>
            </button>
          ))}
          {!results.length ? (
            <div className="command-palette-empty">
              <span>⌕</span>
              <strong>{t.empty}</strong>
              <small>{language === 'vi' ? 'Thử dùng > lệnh, @ người, # lớp hoặc / ứng dụng.' : 'Try > commands, @ people, # classes or / apps.'}</small>
            </div>
          ) : null}
        </div>
        <footer className="command-palette-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> {language === 'vi' ? 'Di chuyển' : 'Move'}</span>
          <span><kbd>↵</kbd> {language === 'vi' ? 'Mở' : 'Open'}</span>
          <span><kbd>⌘K</kbd> {language === 'vi' ? 'Tìm nhanh' : 'Quick search'}</span>
          <span>{localIndex.stats?.source === 'local-only' ? (language === 'vi' ? '0 truy vấn mạng' : '0 network queries') : ''}</span>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
