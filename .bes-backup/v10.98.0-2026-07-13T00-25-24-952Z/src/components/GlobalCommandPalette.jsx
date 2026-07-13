import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { APPS } from '../data/apps.js';
import { getAppDesignProfile } from '../data/designProfiles.js';
import { getFirstAllowedRoute, hasRouteAccess, hasToolAccess } from '../utils/permissions.js';
import { launchRoute } from '../utils/motion.js';
import { loadLauncherConfig, normalizeLauncherConfig, subscribeLauncherConfig } from '../utils/launcherPreferences.js';
import { getAppUsage, recordAppUsage, subscribeAppUsage } from '../utils/appUsage.js';

const ROUTES = [
  { route: 'home', vi: 'Trang chủ', en: 'Home', icon: '⌂', color: '#FFC69D' },
  { route: 'apps', vi: 'Ứng dụng', en: 'Apps', icon: '▦', color: '#F05A7E' },
  { route: 'news', vi: 'Đọc báo', en: 'Newsroom', icon: '▤', color: '#167D78' },
  { route: 'games', vi: 'Trò chơi', en: 'Games', icon: '◈', color: '#5B2A86' },
  { route: 'department', vi: 'Tổ chuyên môn', en: 'Department', icon: '▦', color: '#3B4CCA' },
  { route: 'homeroom', vi: 'Giáo viên chủ nhiệm', en: 'Homeroom', icon: '♙', color: '#1F8F70' },
  { route: 'library', vi: 'Thư viện', en: 'Library', icon: '▤', color: '#6FBA7B' },
  { route: 'resource-library', vi: 'Kho học liệu', en: 'Resource Library', icon: '▥', color: '#2878D0' },
  { route: 'knowledge-hub', vi: 'Kho học liệu thông minh', en: 'Smart Knowledge', icon: 'K', color: '#315FC4' },
  { route: 'work-hub', vi: 'Trung tâm công việc', en: 'Work Hub', icon: 'WH', color: '#14866D' },
  { route: 'ai-workspace', vi: 'Không gian AI', en: 'AI Workspace', icon: 'AI', color: '#6255D9' },
  { route: 'content-factory', vi: 'Xưởng tạo học liệu', en: 'Content Factory', icon: 'CF', color: '#EF7A42' },
  { route: 'assessment-core', vi: 'Ngân hàng câu hỏi', en: 'Assessment Core', icon: 'AC', color: '#CC7621' },
  { route: 'learning-intelligence', vi: 'Phân tích học tập', en: 'Learning Intelligence', icon: 'LI', color: '#1A7D73' },
  { route: 'platform-readiness', vi: 'PWA, bảo mật & tiếp cận', en: 'Platform Readiness', icon: 'PR', color: '#0F766E' },
  { route: 'automation-center', vi: 'Trung tâm tự động hóa', en: 'Automation Center', icon: 'AU', color: '#1269B0' },
  { route: 'cloud-operations', vi: 'Vận hành nền 24/7', en: 'Cloud Operations', icon: 'CO', color: '#167B68' },
  { route: 'practice', vi: 'Lớp học', en: 'Classroom', icon: '⚡', color: '#00A4EF' },
  { route: 'settings', vi: 'Cài đặt', en: 'Settings', icon: '⚙', color: '#123C69' },
  { route: 'ai-governance', vi: 'Quản trị AI', en: 'AI Governance', icon: 'AI', color: '#6D45C6', adminOnly: true },
  { route: 'admin', vi: 'Quản trị', en: 'Admin', icon: '☼', color: '#D13438', adminOnly: true },
];

const text = {
  vi: {
    placeholder: 'Tìm ứng dụng, trang hoặc lệnh…',
    title: 'Tìm nhanh toàn hệ thống',
    hint: 'Nhập để tìm · ↑↓ chọn · Enter mở · Esc đóng',
    recent: 'Gần đây', pinned: 'Đã ghim', results: 'Kết quả', commands: 'Lệnh nhanh', empty: 'Không tìm thấy kết quả phù hợp.',
    openAi: 'Mở Brian AI', askPage: 'Hỏi AI về trang hiện tại', theme: 'Đổi chế độ sáng/tối', customize: 'Tùy biến Launcher', settings: 'Mở Cài đặt',
    current: 'Đang mở', frequent: 'Dùng thường xuyên', route: 'Trang', tool: 'Ứng dụng', command: 'Lệnh', keyboard: '⌘ K',
  },
  en: {
    placeholder: 'Search apps, pages or commands…',
    title: 'Search the whole system',
    hint: 'Type to search · ↑↓ select · Enter open · Esc close',
    recent: 'Recent', pinned: 'Pinned', results: 'Results', commands: 'Quick commands', empty: 'No matching results.',
    openAi: 'Open Brian AI', askPage: 'Ask AI about this page', theme: 'Toggle light/dark mode', customize: 'Customize Launcher', settings: 'Open Settings',
    current: 'Current', frequent: 'Frequently used', route: 'Page', tool: 'App', command: 'Command', keyboard: '⌘ K',
  },
};

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function canUse(entry, currentUser) {
  if (!currentUser) return entry.route === 'home';
  if (currentUser.role === 'admin') return true;
  if (entry.adminOnly) return false;
  if (entry.kind === 'tool') return entry.route ? hasRouteAccess(currentUser, entry.route, entry.app) : hasToolAccess(currentUser, entry.slug);
  return hasRouteAccess(currentUser, entry.route);
}

function buildEntries(language, currentUser) {
  const routeEntries = ROUTES.map((item) => ({
    id: `route:${item.route}`,
    kind: 'route',
    route: item.route,
    target: `#/${item.route}`,
    title: language === 'vi' ? item.vi : item.en,
    subtitle: language === 'vi' ? 'Trang hệ thống' : 'System page',
    icon: item.icon,
    color: item.color,
    adminOnly: item.adminOnly,
    keywords: `${item.vi} ${item.en} ${item.route}`,
  }));
  const toolEntries = APPS.map((app) => {
    const profile = getAppDesignProfile(app.slug);
    return {
      id: `tool:${app.slug}`,
      kind: 'tool',
      slug: app.slug,
      target: app.route ? `#/${app.route}` : `#/tool/${app.slug}`,
      route: app.route || '',
      app,
      title: language === 'vi' ? app.titleVi || app.title : app.title,
      subtitle: language === 'vi' ? app.descVi || app.desc || '' : app.desc || app.descVi || '',
      icon: String(app.icon || app.title || 'AP').slice(0, 2).toUpperCase(),
      color: profile.accent,
      keywords: `${app.slug} ${app.title || ''} ${app.titleVi || ''} ${app.desc || ''} ${app.descVi || ''}`,
    };
  });
  return [...routeEntries, ...toolEntries].filter((entry) => canUse(entry, currentUser));
}

function scoreEntry(entry, query) {
  if (!query) return 1;
  const title = normalize(entry.title);
  const keywords = normalize(`${entry.keywords || ''} ${entry.subtitle || ''}`);
  const tokens = query.split(' ').filter(Boolean);
  let score = 0;
  if (title === query) score += 100;
  if (title.startsWith(query)) score += 60;
  if (title.includes(query)) score += 40;
  if (keywords.includes(query)) score += 20;
  tokens.forEach((token) => {
    if (title.startsWith(token)) score += 16;
    else if (title.includes(token)) score += 10;
    else if (keywords.includes(token)) score += 4;
  });
  return score;
}

function CommandIcon({ children }) {
  return <span className="command-palette-command-icon" aria-hidden="true">{children}</span>;
}

export default function GlobalCommandPalette({
  language = 'vi', currentUser, theme = 'light', setTheme, currentRoute = 'home', selectedTool = null,
}) {
  const t = text[language] || text.vi;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [launcherConfig, setLauncherConfig] = useState(() => normalizeLauncherConfig(loadLauncherConfig()));
  const [usage, setUsage] = useState(() => getAppUsage(currentUser));
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const entries = useMemo(() => buildEntries(language, currentUser), [language, currentUser]);
  const byId = useMemo(() => new Map(entries.map((entry) => [entry.id, entry])), [entries]);

  useEffect(() => {
    const unsubscribeLauncher = subscribeLauncherConfig((next) => setLauncherConfig(normalizeLauncherConfig(next)));
    const unsubscribeUsage = subscribeAppUsage(currentUser, setUsage);
    return () => { unsubscribeLauncher(); unsubscribeUsage(); };
  }, [currentUser]);

  useEffect(() => {
    setUsage(getAppUsage(currentUser));
  }, [currentUser]);

  useEffect(() => {
    const openPalette = (event) => {
      setOpen(true);
      setQuery(String(event?.detail?.query || ''));
    };
    const keyHandler = (event) => {
      const target = event.target;
      const typing = target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target?.isContentEditable;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
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
    if (!open) return;
    setActiveIndex(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => { setActiveIndex(0); }, [query]);

  const pinnedEntries = useMemo(() => (launcherConfig.pinned || []).map((id) => byId.get(`tool:${id}`) || byId.get(id)).filter(Boolean), [launcherConfig.pinned, byId]);
  const recentEntries = useMemo(() => usage.map((item) => byId.get(item.id)).filter(Boolean).slice(0, 6), [usage, byId]);
  const frequentEntries = useMemo(() => [...usage].sort((a, b) => b.count - a.count || b.lastUsedAt - a.lastUsedAt).map((item) => byId.get(item.id)).filter(Boolean).slice(0, 6), [usage, byId]);

  const commands = useMemo(() => [
    {
      id: 'command:ai', kind: 'command', title: t.openAi, subtitle: language === 'vi' ? 'Trò chuyện với trợ lí AI' : 'Chat with the AI assistant', icon: '✦', color: '#2BB7B3',
      run: () => window.dispatchEvent(new CustomEvent('bes-ai-open')),
      keywords: 'AI Brian chat assistant trợ lí chatbot',
    },
    {
      id: 'command:ask-page', kind: 'command', title: t.askPage, subtitle: language === 'vi' ? 'Gửi ngữ cảnh trang hiện tại cho Brian AI' : 'Send the current-page context to Brian AI', icon: '◎', color: '#167D78',
      run: () => window.dispatchEvent(new CustomEvent('bes-ai-open', { detail: { prompt: language === 'vi' ? 'Hãy phân tích trang hiện tại và gợi ý cho tôi bước tiếp theo.' : 'Analyze the current page and suggest my next step.' } })),
      keywords: 'ask current page context analyze explain hỏi trang hiện tại',
    },
    {
      id: 'command:theme', kind: 'command', title: t.theme, subtitle: theme === 'dark' ? 'Dark → Light' : 'Light → Dark', icon: theme === 'dark' ? '☀' : '☾', color: '#5B2A86',
      run: () => setTheme?.(theme === 'dark' ? 'light' : 'dark'),
      keywords: 'theme dark light chế độ tối sáng',
    },
    {
      id: 'command:launcher', kind: 'command', title: t.customize, subtitle: language === 'vi' ? 'Sắp xếp, ghim, ẩn và tạo nhóm ứng dụng' : 'Sort, pin, hide and group apps', icon: '▦', color: '#F05A7E',
      run: () => {
        window.location.hash = '#/apps';
        window.setTimeout(() => window.dispatchEvent(new CustomEvent('bes-launcher-edit')), 220);
      },
      keywords: 'launcher customize edit apps group pin hide sắp xếp ghim ẩn nhóm',
    },
    {
      id: 'command:settings', kind: 'command', title: t.settings, subtitle: language === 'vi' ? 'AI, giao diện, tài khoản và hiệu năng' : 'AI, appearance, account and performance', icon: '⚙', color: '#123C69',
      run: () => { window.location.hash = '#/settings'; },
      keywords: 'settings configuration cài đặt cấu hình',
    },
  ], [language, t, theme, setTheme]);

  const normalizedQuery = normalize(query);
  const searchPool = useMemo(() => [...entries, ...commands], [entries, commands]);
  const searchResults = useMemo(() => {
    if (!normalizedQuery) return [];
    return searchPool
      .map((entry) => ({ entry, score: scoreEntry(entry, normalizedQuery) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
      .slice(0, 18)
      .map((item) => item.entry);
  }, [searchPool, normalizedQuery]);

  const defaultResults = useMemo(() => {
    const seen = new Set();
    const output = [];
    const push = (entry, section) => {
      if (!entry || seen.has(entry.id)) return;
      seen.add(entry.id);
      output.push({ ...entry, section });
    };
    recentEntries.forEach((entry) => push(entry, t.recent));
    pinnedEntries.forEach((entry) => push(entry, t.pinned));
    frequentEntries.forEach((entry) => push(entry, t.frequent));
    commands.forEach((entry) => push(entry, t.commands));
    return output.slice(0, 18);
  }, [recentEntries, pinnedEntries, frequentEntries, commands, t]);

  const results = normalizedQuery ? searchResults : defaultResults;

  const runEntry = (entry) => {
    if (!entry) return;
    setOpen(false);
    setQuery('');
    if (entry.kind === 'command') {
      entry.run?.();
      return;
    }
    recordAppUsage(currentUser, {
      id: entry.id, target: entry.target, title: entry.title, titleVi: entry.title, icon: entry.icon, color: entry.color, kind: entry.kind,
    });
    launchRoute({ target: entry.target, label: String(entry.icon || entry.title || 'GO').slice(0, 2), color: entry.color || '#191515' });
  };

  const onInputKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(results.length - 1, index + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
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
          <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={onInputKeyDown} placeholder={t.placeholder} aria-label={t.placeholder} autoComplete="off" />
          <kbd>ESC</kbd>
        </header>
        <div className="command-palette-caption"><strong>{t.title}</strong><span>{t.hint}</span></div>
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
              <span className="command-palette-result-copy"><strong>{entry.title}</strong><small>{entry.subtitle || (entry.kind === 'tool' ? t.tool : entry.kind === 'route' ? t.route : t.command)}</small></span>
              {entry.section ? <span className="command-palette-section-tag">{entry.section}</span> : null}
              {entry.id === currentId ? <span className="command-palette-current">{t.current}</span> : null}
              <span className="command-palette-enter" aria-hidden="true">↵</span>
            </button>
          ))}
          {!results.length ? <div className="command-palette-empty"><span>⌕</span><strong>{t.empty}</strong><small>{language === 'vi' ? 'Thử nhập tên ứng dụng hoặc một hành động khác.' : 'Try another app name or action.'}</small></div> : null}
        </div>
        <footer className="command-palette-footer"><span><kbd>↑</kbd><kbd>↓</kbd> {language === 'vi' ? 'Di chuyển' : 'Move'}</span><span><kbd>↵</kbd> {language === 'vi' ? 'Mở' : 'Open'}</span><span><kbd>⌘K</kbd> {language === 'vi' ? 'Tìm nhanh' : 'Quick search'}</span></footer>
      </section>
    </div>,
    document.body,
  );
}
