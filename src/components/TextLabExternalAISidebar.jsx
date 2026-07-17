import React, { useEffect, useMemo, useState } from 'react';
import './TextLabExternalAISidebar.css';

const START_URL = 'brian://start';
const SESSION_KEY = 'bes-textlab-internet-browser-v3';
const MAX_TABS = 6;
const MAX_RECENT = 30;
const MAX_READER_CHARS = 450000;

const SEARCH_ENGINES = Object.freeze({
  duckduckgo: {
    label: 'DuckDuckGo',
    build: (query) => `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
  },
  bing: {
    label: 'Bing',
    build: (query) => `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
  },
  google: {
    label: 'Google',
    build: (query) => `https://www.google.com/search?q=${encodeURIComponent(query)}`,
  },
});

const SHORTCUTS = Object.freeze([
  { id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com/', mark: '◎', tone: 'green' },
  { id: 'gemini', name: 'Google Gemini', url: 'https://gemini.google.com/app', mark: '✦', tone: 'violet' },
  { id: 'youtube', name: 'YouTube', url: 'https://www.youtube.com/', mark: '▶', tone: 'red' },
  { id: 'cambridge', name: 'Cambridge Dictionary', url: 'https://dictionary.cambridge.org/', mark: 'C', tone: 'blue' },
  { id: 'oxford', name: 'Oxford Learner’s Dictionaries', url: 'https://www.oxfordlearnersdictionaries.com/', mark: 'O', tone: 'navy' },
  { id: 'quizlet', name: 'Quizlet', url: 'https://quizlet.com/', mark: 'Q', tone: 'indigo' },
  { id: 'canva', name: 'Canva', url: 'https://www.canva.com/', mark: 'C', tone: 'cyan' },
  { id: 'drive', name: 'Google Drive', url: 'https://drive.google.com/', mark: 'D', tone: 'yellow' },
]);

const EXTERNAL_ONLY_HOSTS = Object.freeze([
  'chatgpt.com',
  'gemini.google.com',
  'drive.google.com',
  'docs.google.com',
  'accounts.google.com',
  'canva.com',
]);

function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createTab(url = START_URL, title = 'Trang mới', mode = 'reader') {
  return {
    id: makeId(),
    title,
    history: [url],
    index: 0,
    reloadKey: 0,
    loading: url !== START_URL,
    mode,
  };
}

function safeHostname(url) {
  if (url === START_URL) return 'Brian Start';
  try {
    return new URL(url).hostname.replace(/^www\./, '') || url;
  } catch {
    return url;
  }
}

function inferTitle(url, fallback = '') {
  if (url === START_URL) return fallback || 'Trang mới';
  const shortcut = SHORTCUTS.find((item) => url.startsWith(item.url));
  return shortcut?.name || safeHostname(url) || fallback || 'Website';
}

function isExternalOnly(url) {
  if (url === START_URL) return false;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return EXTERNAL_ONLY_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

function resolveInput(value, engineId) {
  const raw = String(value || '').trim();
  if (!raw || raw === START_URL) return { url: START_URL, title: 'Trang mới' };

  const explicitScheme = raw.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
  if (explicitScheme && !['http', 'https'].includes(explicitScheme)) {
    return { error: 'Chỉ cho phép địa chỉ website HTTPS.' };
  }

  const looksLikeUrl = /^https?:\/\//i.test(raw)
    || (!/\s/.test(raw) && /(?:localhost|\.|:\d+)/.test(raw));

  if (!looksLikeUrl) {
    const engine = SEARCH_ENGINES[engineId] || SEARCH_ENGINES.duckduckgo;
    return { url: engine.build(raw), title: `Tìm kiếm: ${raw}` };
  }

  try {
    const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const parsed = new URL(candidate);
    parsed.protocol = 'https:';
    return { url: parsed.toString(), title: inferTitle(parsed.toString()) };
  } catch {
    const engine = SEARCH_ENGINES[engineId] || SEARCH_ENGINES.duckduckgo;
    return { url: engine.build(raw), title: `Tìm kiếm: ${raw}` };
  }
}

function readSession() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SESSION_KEY) || 'null');
    if (!parsed || !Array.isArray(parsed.tabs) || !parsed.tabs.length) throw new Error('empty');
    const tabs = parsed.tabs.slice(0, MAX_TABS).map((tab) => {
      const history = Array.isArray(tab.history) && tab.history.length ? tab.history.slice(-40) : [START_URL];
      return {
        id: String(tab.id || makeId()),
        title: String(tab.title || 'Website').slice(0, 80),
        history,
        index: Math.max(0, Math.min(Number(tab.index || 0), Math.max(0, history.length - 1))),
        reloadKey: 0,
        loading: false,
        mode: tab.mode === 'original' ? 'original' : 'reader',
      };
    });
    return {
      tabs,
      activeTabId: tabs.some((tab) => tab.id === parsed.activeTabId) ? parsed.activeTabId : tabs[0].id,
      bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks.slice(0, 30) : [],
      recent: Array.isArray(parsed.recent) ? parsed.recent.slice(0, MAX_RECENT) : [],
      engine: SEARCH_ENGINES[parsed.engine] ? parsed.engine : 'duckduckgo',
    };
  } catch {
    const first = createTab();
    return { tabs: [first], activeTabId: first.id, bookmarks: [], recent: [], engine: 'duckduckgo' };
  }
}

function BrowserMark({ url }) {
  if (url === START_URL) return <span className="textlab-browser-mark home" aria-hidden="true">B</span>;
  const shortcut = SHORTCUTS.find((item) => url.startsWith(item.url));
  return <span className={`textlab-browser-mark ${shortcut?.tone || 'web'}`} aria-hidden="true">{shortcut?.mark || '◉'}</span>;
}

function renderInline(value, onNavigate) {
  const text = String(value || '');
  const pattern = /(\[[^\]]+\]\(https?:\/\/[^)]+\)|https?:\/\/[^\s<>)]+)/g;
  const parts = text.split(pattern).filter(Boolean);
  return parts.map((part, index) => {
    const markdown = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
    const rawUrl = /^https?:\/\//i.test(part) ? part.replace(/[.,;:!?]+$/, '') : '';
    if (!markdown && !rawUrl) return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
    const label = markdown?.[1] || rawUrl;
    const url = markdown?.[2] || rawUrl;
    return (
      <a
        key={`${url}-${index}`}
        href={url}
        onClick={(event) => {
          event.preventDefault();
          onNavigate(url);
        }}
      >
        {label}
      </a>
    );
  });
}

function ReaderDocument({ text, onNavigate }) {
  const lines = useMemo(() => {
    const raw = String(text || '').replace(/^---[\s\S]*?---\s*/m, '').split(/\r?\n/);
    return raw.slice(0, 2600);
  }, [text]);

  return (
    <article className="textlab-reader-document">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div className="reader-spacer" key={`space-${index}`} />;
        if (/^!\[[^\]]*\]\([^)]*\)$/.test(trimmed)) return null;
        const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
        if (heading) {
          const level = Math.min(6, heading[1].length + 1);
          return React.createElement(`h${level}`, { key: `h-${index}` }, renderInline(heading[2], onNavigate));
        }
        const bullet = trimmed.match(/^[-*+]\s+(.+)$/);
        if (bullet) return <div className="reader-bullet" key={`b-${index}`}><span>•</span><p>{renderInline(bullet[1], onNavigate)}</p></div>;
        const ordered = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
        if (ordered) return <div className="reader-bullet" key={`o-${index}`}><span>{ordered[1]}.</span><p>{renderInline(ordered[2], onNavigate)}</p></div>;
        if (/^>\s?/.test(trimmed)) return <blockquote key={`q-${index}`}>{renderInline(trimmed.replace(/^>\s?/, ''), onNavigate)}</blockquote>;
        if (/^```/.test(trimmed)) return null;
        if (/^(Title|URL Source|Published Time|Markdown Content):/i.test(trimmed)) {
          const [label, ...rest] = trimmed.split(':');
          return <p className="reader-meta" key={`m-${index}`}><strong>{label}:</strong>{renderInline(rest.join(':').trim(), onNavigate)}</p>;
        }
        return <p key={`p-${index}`}>{renderInline(trimmed, onNavigate)}</p>;
      })}
    </article>
  );
}

function ExternalOnlyView({ url, title, vi }) {
  return (
    <section className="textlab-browser-external-only">
      <BrowserMark url={url} />
      <h2>{title || inferTitle(url)}</h2>
      <p>{vi
        ? 'Website này cần đăng nhập hoặc tương tác trực tiếp và không cho phép chạy an toàn bên trong Brian.'
        : 'This website requires direct sign-in or interaction and cannot run safely inside Brian.'}</p>
      <button type="button" onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}>{vi ? 'Mở website trong cửa sổ riêng' : 'Open website separately'} ↗</button>
      <small>{safeHostname(url)}</small>
    </section>
  );
}

export default function TextLabExternalAISidebar({ language = 'vi', open = true, onToggle }) {
  const vi = language === 'vi';
  const initial = useMemo(readSession, []);
  const [tabs, setTabs] = useState(initial.tabs);
  const [activeTabId, setActiveTabId] = useState(initial.activeTabId);
  const [bookmarks, setBookmarks] = useState(initial.bookmarks);
  const [recent, setRecent] = useState(initial.recent);
  const [engine, setEngine] = useState(initial.engine);
  const [address, setAddress] = useState('');
  const [showPanel, setShowPanel] = useState('');
  const [notice, setNotice] = useState('');
  const [readerCache, setReaderCache] = useState({});

  const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0];
  const currentUrl = activeTab?.history?.[activeTab.index] || START_URL;
  const isStart = currentUrl === START_URL;
  const externalOnly = isExternalOnly(currentUrl);
  const canGoBack = Boolean(activeTab && activeTab.index > 0);
  const canGoForward = Boolean(activeTab && activeTab.index < activeTab.history.length - 1);
  const isBookmarked = bookmarks.some((item) => item.url === currentUrl);
  const readerState = readerCache[activeTabId] || { status: 'idle', text: '', error: '' };

  useEffect(() => {
    setAddress(isStart ? '' : currentUrl);
  }, [currentUrl, activeTabId, isStart]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify({ tabs, activeTabId, bookmarks, recent, engine }));
    } catch {
      // Browser state remains available for the current session.
    }
  }, [tabs, activeTabId, bookmarks, recent, engine]);

  useEffect(() => {
    if (!activeTab || isStart || activeTab.mode !== 'reader' || externalOnly) return undefined;
    const controller = new AbortController();
    setReaderCache((current) => ({ ...current, [activeTabId]: { status: 'loading', text: '', error: '' } }));
    const readerUrl = `https://r.jina.ai/${currentUrl}`;
    fetch(readerUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Reader HTTP ${response.status}`);
        return response.text();
      })
      .then((text) => {
        const clean = String(text || '').slice(0, MAX_READER_CHARS);
        if (!clean.trim()) throw new Error('Reader returned empty content');
        setReaderCache((current) => ({ ...current, [activeTabId]: { status: 'ready', text: clean, error: '' } }));
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        setReaderCache((current) => ({
          ...current,
          [activeTabId]: {
            status: 'error',
            text: '',
            error: error?.message || 'Reader failed',
          },
        }));
      });
    return () => controller.abort();
  }, [activeTabId, activeTab?.reloadKey, activeTab?.mode, currentUrl, externalOnly, isStart]);

  const flash = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2400);
  };

  const updateTab = (tabId, updater) => {
    setTabs((current) => current.map((tab) => (tab.id === tabId ? updater(tab) : tab)));
  };

  const addRecent = (url, title) => {
    if (url === START_URL) return;
    setRecent((current) => [
      { url, title: title || inferTitle(url), visitedAt: new Date().toISOString() },
      ...current.filter((item) => item.url !== url),
    ].slice(0, MAX_RECENT));
  };

  const navigate = (value, options = {}) => {
    const tabId = options.tabId || activeTabId;
    const resolved = options.resolved || resolveInput(value, engine);
    if (resolved.error) {
      flash(vi ? resolved.error : 'Only HTTPS websites are allowed.');
      return;
    }
    updateTab(tabId, (tab) => {
      const history = tab.history.slice(0, tab.index + 1);
      if (history[history.length - 1] !== resolved.url) history.push(resolved.url);
      return {
        ...tab,
        title: resolved.title || inferTitle(resolved.url, tab.title),
        history,
        index: history.length - 1,
        reloadKey: tab.reloadKey + 1,
        loading: resolved.url !== START_URL,
        mode: options.mode || 'reader',
      };
    });
    addRecent(resolved.url, resolved.title);
    setShowPanel('');
  };

  const openNewTab = (value = START_URL, title = 'Trang mới') => {
    if (tabs.length >= MAX_TABS) {
      flash(vi ? `Tối đa ${MAX_TABS} tab.` : `Maximum ${MAX_TABS} tabs.`);
      return;
    }
    const resolved = value === START_URL ? { url: START_URL, title } : resolveInput(value, engine);
    if (resolved.error) return;
    const tab = createTab(resolved.url, resolved.title || title, 'reader');
    setTabs((current) => [...current, tab]);
    setActiveTabId(tab.id);
    addRecent(resolved.url, resolved.title);
    setShowPanel('');
  };

  const closeTab = (tabId) => {
    setTabs((current) => {
      const index = current.findIndex((tab) => tab.id === tabId);
      const next = current.filter((tab) => tab.id !== tabId);
      if (!next.length) {
        const replacement = createTab();
        setActiveTabId(replacement.id);
        return [replacement];
      }
      if (tabId === activeTabId) {
        const replacement = next[Math.max(0, index - 1)] || next[0];
        setActiveTabId(replacement.id);
      }
      return next;
    });
  };

  const submitAddress = (event) => {
    event.preventDefault();
    navigate(address);
  };

  const goBack = () => {
    if (!canGoBack) return;
    updateTab(activeTabId, (tab) => ({ ...tab, index: tab.index - 1, reloadKey: tab.reloadKey + 1, loading: true }));
  };

  const goForward = () => {
    if (!canGoForward) return;
    updateTab(activeTabId, (tab) => ({ ...tab, index: tab.index + 1, reloadKey: tab.reloadKey + 1, loading: true }));
  };

  const reload = () => {
    if (isStart) return;
    updateTab(activeTabId, (tab) => ({ ...tab, reloadKey: tab.reloadKey + 1, loading: true }));
  };

  const goHome = () => navigate(START_URL, { resolved: { url: START_URL, title: 'Trang mới' } });

  const setMode = (mode) => {
    updateTab(activeTabId, (tab) => ({ ...tab, mode, reloadKey: tab.reloadKey + 1, loading: mode === 'original' }));
  };

  const toggleBookmark = () => {
    if (isStart) return;
    if (isBookmarked) {
      setBookmarks((current) => current.filter((item) => item.url !== currentUrl));
      flash(vi ? 'Đã xoá dấu trang.' : 'Bookmark removed.');
    } else {
      setBookmarks((current) => [{ url: currentUrl, title: activeTab.title || inferTitle(currentUrl) }, ...current.filter((item) => item.url !== currentUrl)].slice(0, 30));
      flash(vi ? 'Đã thêm dấu trang.' : 'Bookmark saved.');
    }
  };

  const openSavedItem = (item, newTab = false) => {
    if (newTab) openNewTab(item.url, item.title);
    else navigate(item.url, { resolved: { url: item.url, title: item.title || inferTitle(item.url) } });
  };

  const visibleFrames = tabs.filter((tab) => tab.mode === 'original' && tab.history[tab.index] !== START_URL);

  return (
    <>
      <aside className={`textlab-browser-sidebar ${open ? 'is-visible' : 'is-hidden'}`} aria-label={vi ? 'Trình duyệt Internet' : 'Internet browser'} aria-hidden={!open}>
        <div className="textlab-browser-titlebar">
          <div><span>BRIAN INTERNET BROWSER</span><strong>{vi ? 'Trình duyệt hỗ trợ giáo viên' : 'Teacher support browser'}</strong></div>
          <button type="button" onClick={onToggle} title={vi ? 'Ẩn thanh bên' : 'Hide sidebar'}><span aria-hidden="true">»</span>{vi ? 'Ẩn thanh bên' : 'Hide sidebar'}</button>
        </div>

        <div className="textlab-browser-tabs" role="tablist" aria-label={vi ? 'Các tab đang mở' : 'Open tabs'}>
          <div className="textlab-browser-tab-track">
            {tabs.map((tab) => {
              const url = tab.history[tab.index] || START_URL;
              return (
                <div key={tab.id} className={`textlab-browser-tab ${activeTabId === tab.id ? 'is-active' : ''}`}>
                  <button type="button" role="tab" aria-selected={activeTabId === tab.id} onClick={() => setActiveTabId(tab.id)}>
                    <BrowserMark url={url} />
                    <span><strong>{tab.title || inferTitle(url)}</strong><small>{safeHostname(url)}</small></span>
                  </button>
                  <button type="button" className="close-tab" onClick={() => closeTab(tab.id)} title={vi ? 'Đóng tab' : 'Close tab'} aria-label={vi ? 'Đóng tab' : 'Close tab'}>×</button>
                </div>
              );
            })}
          </div>
          <button type="button" className="new-tab" onClick={() => openNewTab()} disabled={tabs.length >= MAX_TABS} title={vi ? 'Tab mới' : 'New tab'}>+</button>
        </div>

        <div className="textlab-browser-toolbar" aria-label={vi ? 'Điều khiển trình duyệt' : 'Browser controls'}>
          <div className="textlab-browser-nav-buttons">
            <button type="button" onClick={goBack} disabled={!canGoBack} title={vi ? 'Quay lại' : 'Back'}>←</button>
            <button type="button" onClick={goForward} disabled={!canGoForward} title={vi ? 'Đi tới' : 'Forward'}>→</button>
            <button type="button" onClick={reload} disabled={isStart} title={vi ? 'Tải lại' : 'Reload'}>↻</button>
            <button type="button" onClick={goHome} title={vi ? 'Trang bắt đầu' : 'Start page'}>⌂</button>
          </div>
          <form onSubmit={submitAddress}>
            <span aria-hidden="true">{isStart ? '⌕' : '🔒'}</span>
            <input value={address} onChange={(event) => setAddress(event.target.value)} onFocus={(event) => event.target.select()} placeholder={vi ? 'Nhập địa chỉ hoặc từ khoá tìm kiếm…' : 'Enter an address or search…'} aria-label={vi ? 'Địa chỉ hoặc từ khoá' : 'Address or search'} spellCheck="false" />
            <button type="submit" title={vi ? 'Đi' : 'Go'}>{vi ? 'Đi' : 'Go'}</button>
          </form>
          <div className="textlab-browser-utility-buttons">
            <select value={engine} onChange={(event) => setEngine(event.target.value)} aria-label={vi ? 'Công cụ tìm kiếm' : 'Search engine'}>
              {Object.entries(SEARCH_ENGINES).map(([id, item]) => <option key={id} value={id}>{item.label}</option>)}
            </select>
            <div className="textlab-browser-mode-switch" role="group" aria-label={vi ? 'Chế độ hiển thị trang' : 'Page display mode'}>
              <button type="button" onClick={() => setMode('reader')} disabled={isStart || externalOnly} className={activeTab?.mode !== 'original' ? 'is-active' : ''}>{vi ? 'Đọc' : 'Reader'}</button>
              <button type="button" onClick={() => setMode('original')} disabled={isStart || externalOnly} className={activeTab?.mode === 'original' ? 'is-active' : ''}>{vi ? 'Gốc' : 'Original'}</button>
            </div>
            <button type="button" onClick={toggleBookmark} disabled={isStart} className={isBookmarked ? 'is-active' : ''} title={vi ? 'Dấu trang' : 'Bookmark'}>{isBookmarked ? '★' : '☆'}</button>
            <button type="button" onClick={() => setShowPanel((value) => value === 'bookmarks' ? '' : 'bookmarks')} className={showPanel === 'bookmarks' ? 'is-active' : ''} title={vi ? 'Danh sách dấu trang' : 'Bookmarks'}>▣</button>
            <button type="button" onClick={() => setShowPanel((value) => value === 'history' ? '' : 'history')} className={showPanel === 'history' ? 'is-active' : ''} title={vi ? 'Lịch sử gần đây' : 'Recent history'}>◷</button>
            <button type="button" className="external-fallback" onClick={() => !isStart && window.open(currentUrl, '_blank', 'noopener,noreferrer')} disabled={isStart} title={vi ? 'Mở trang hiện tại trong cửa sổ riêng' : 'Open current page separately'}>↗</button>
          </div>
        </div>

        {showPanel ? (
          <section className="textlab-browser-saved-panel">
            <header><strong>{showPanel === 'bookmarks' ? (vi ? 'Dấu trang' : 'Bookmarks') : (vi ? 'Lịch sử gần đây' : 'Recent history')}</strong><button type="button" onClick={() => setShowPanel('')}>×</button></header>
            <div>
              {(showPanel === 'bookmarks' ? bookmarks : recent).length ? (showPanel === 'bookmarks' ? bookmarks : recent).map((item) => (
                <article key={`${showPanel}-${item.url}`}>
                  <BrowserMark url={item.url} />
                  <button type="button" onClick={() => openSavedItem(item)}><strong>{item.title || inferTitle(item.url)}</strong><small>{safeHostname(item.url)}</small></button>
                  <button type="button" onClick={() => openSavedItem(item, true)} title={vi ? 'Mở trong tab mới' : 'Open in new tab'}>+</button>
                  {showPanel === 'bookmarks' ? <button type="button" onClick={() => setBookmarks((current) => current.filter((entry) => entry.url !== item.url))} title={vi ? 'Xoá dấu trang' : 'Remove bookmark'}>×</button> : null}
                </article>
              )) : <p>{vi ? 'Chưa có mục nào.' : 'Nothing here yet.'}</p>}
            </div>
          </section>
        ) : null}

        <div className="textlab-browser-viewport">
          {isStart ? (
            <section className="textlab-browser-start-page">
              <div className="textlab-browser-start-hero">
                <span>B</span>
                <div><strong>{vi ? 'Duyệt web trong khi tạo hoạt động' : 'Browse while building activities'}</strong><p>{vi ? 'Chế độ Đọc hiển thị nội dung các trang công khai ngay trong Brian; các website đăng nhập sẽ mở riêng.' : 'Reader mode displays public page content inside Brian; sign-in websites open separately.'}</p></div>
              </div>
              <form className="textlab-browser-start-search" onSubmit={submitAddress}>
                <span>⌕</span><input value={address} onChange={(event) => setAddress(event.target.value)} placeholder={vi ? 'Tìm kiếm trên Internet…' : 'Search the Internet…'} /><button type="submit">{vi ? 'Tìm' : 'Search'}</button>
              </form>
              <div className="textlab-browser-shortcuts">
                {SHORTCUTS.map((item) => (
                  <button key={item.id} type="button" onClick={() => navigate(item.url, { resolved: { url: item.url, title: item.name } })}>
                    <span className={`tone-${item.tone}`}>{item.mark}</span><strong>{item.name}</strong><small>{safeHostname(item.url)}</small>
                  </button>
                ))}
              </div>
              {(bookmarks.length || recent.length) ? (
                <div className="textlab-browser-start-lists">
                  {bookmarks.length ? <section><h3>{vi ? 'Dấu trang' : 'Bookmarks'}</h3>{bookmarks.slice(0, 4).map((item) => <button key={item.url} type="button" onClick={() => openSavedItem(item)}><span>★</span><b>{item.title}</b></button>)}</section> : null}
                  {recent.length ? <section><h3>{vi ? 'Gần đây' : 'Recent'}</h3>{recent.slice(0, 4).map((item) => <button key={item.url} type="button" onClick={() => openSavedItem(item)}><span>◷</span><b>{item.title}</b></button>)}</section> : null}
                </div>
              ) : null}
            </section>
          ) : null}

          {!isStart && externalOnly ? <ExternalOnlyView url={currentUrl} title={activeTab?.title} vi={vi} /> : null}

          {!isStart && !externalOnly && activeTab?.mode !== 'original' ? (
            <section className="textlab-reader-surface">
              {readerState.status === 'loading' || readerState.status === 'idle' ? <div className="textlab-browser-loading"><span /><strong>{vi ? `Đang đọc ${activeTab?.title || safeHostname(currentUrl)}…` : `Reading ${activeTab?.title || safeHostname(currentUrl)}…`}</strong></div> : null}
              {readerState.status === 'ready' ? <ReaderDocument text={readerState.text} onNavigate={(url) => navigate(url)} /> : null}
              {readerState.status === 'error' ? (
                <div className="textlab-reader-error">
                  <span>!</span><h2>{vi ? 'Không thể đọc trang này' : 'Could not read this page'}</h2>
                  <p>{vi ? 'Trang có thể chặn trình đọc hoặc yêu cầu đăng nhập. Bạn có thể thử chế độ Gốc hoặc mở ngoài.' : 'The page may block readers or require sign-in. Try Original mode or open it separately.'}</p>
                  <div><button type="button" onClick={reload}>{vi ? 'Thử lại' : 'Retry'}</button><button type="button" onClick={() => setMode('original')}>{vi ? 'Thử trang gốc' : 'Try original'}</button><button type="button" onClick={() => window.open(currentUrl, '_blank', 'noopener,noreferrer')}>{vi ? 'Mở ngoài' : 'Open outside'} ↗</button></div>
                </div>
              ) : null}
            </section>
          ) : null}

          {visibleFrames.map((tab) => {
            const src = tab.history[tab.index];
            return (
              <iframe key={`${tab.id}:${tab.reloadKey}`} className={activeTabId === tab.id && !isStart && tab.mode === 'original' ? 'is-active' : ''} title={`${tab.title || 'Website'} embedded browser`} src={src} referrerPolicy="strict-origin-when-cross-origin" allow="clipboard-read; clipboard-write; microphone; camera; fullscreen" onLoad={() => updateTab(tab.id, (current) => ({ ...current, loading: false }))} />
            );
          })}
        </div>

        <div className="textlab-browser-statusbar">
          <span><i className={readerState.status === 'loading' || activeTab?.loading ? 'is-loading' : ''} />{isStart ? (vi ? 'Trang bắt đầu' : 'Start page') : externalOnly ? (vi ? 'Cần mở ngoài' : 'Open separately') : activeTab?.mode === 'original' ? (vi ? 'Chế độ Gốc' : 'Original mode') : readerState.status === 'ready' ? (vi ? 'Chế độ Đọc' : 'Reader mode') : (vi ? 'Đang xử lý' : 'Processing')}</span>
          <p>{vi ? 'Chế độ Đọc dùng Jina Reader cho URL công khai. Không dùng với tài liệu riêng tư hoặc trang chứa thông tin đăng nhập.' : 'Reader mode uses Jina Reader for public URLs. Do not use it for private documents or sign-in pages.'}</p>
        </div>
      </aside>

      {!open ? <button type="button" className="textlab-browser-reopen" onClick={onToggle} aria-label={vi ? 'Hiện trình duyệt Internet' : 'Show Internet browser'}><span>WEB</span><b>{vi ? 'Mở trình duyệt' : 'Open browser'}</b><i aria-hidden="true">‹</i></button> : null}
      {notice ? <div className="textlab-browser-notice" role="status">✓ {notice}</div> : null}
    </>
  );
}
