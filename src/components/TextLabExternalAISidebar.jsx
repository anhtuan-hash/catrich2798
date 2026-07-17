import React, { useEffect, useMemo, useState } from 'react';
import './TextLabExternalAISidebar.css';

const START_URL = 'brian://start';
const SESSION_KEY = 'bes-textlab-internet-browser-v2';
const MAX_TABS = 6;
const MAX_RECENT = 30;

const SEARCH_ENGINES = Object.freeze({
  duckduckgo: {
    label: 'DuckDuckGo',
    build: (query) => `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
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

function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createTab(url = START_URL, title = 'Trang mới') {
  return {
    id: makeId(),
    title,
    history: [url],
    index: 0,
    reloadKey: 0,
    loading: url !== START_URL,
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
    const tabs = parsed.tabs.slice(0, MAX_TABS).map((tab) => ({
      id: String(tab.id || makeId()),
      title: String(tab.title || 'Website').slice(0, 80),
      history: Array.isArray(tab.history) && tab.history.length ? tab.history.slice(-40) : [START_URL],
      index: Math.max(0, Math.min(Number(tab.index || 0), Math.max(0, (tab.history?.length || 1) - 1))),
      reloadKey: 0,
      loading: false,
    }));
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

  const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0];
  const currentUrl = activeTab?.history?.[activeTab.index] || START_URL;
  const isStart = currentUrl === START_URL;
  const canGoBack = Boolean(activeTab && activeTab.index > 0);
  const canGoForward = Boolean(activeTab && activeTab.index < activeTab.history.length - 1);
  const isBookmarked = bookmarks.some((item) => item.url === currentUrl);

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
    const tab = createTab(resolved.url, resolved.title || title);
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
    updateTab(activeTabId, (tab) => ({ ...tab, index: tab.index - 1, reloadKey: tab.reloadKey + 1, loading: tab.history[tab.index - 1] !== START_URL }));
  };

  const goForward = () => {
    if (!canGoForward) return;
    updateTab(activeTabId, (tab) => ({ ...tab, index: tab.index + 1, reloadKey: tab.reloadKey + 1, loading: tab.history[tab.index + 1] !== START_URL }));
  };

  const reload = () => {
    if (isStart) return;
    updateTab(activeTabId, (tab) => ({ ...tab, reloadKey: tab.reloadKey + 1, loading: true }));
  };

  const goHome = () => navigate(START_URL, { resolved: { url: START_URL, title: 'Trang mới' } });

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

  const visibleFrames = tabs.filter((tab) => tab.history[tab.index] !== START_URL);

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
            <button type="submit" title={vi ? 'Đi' : 'Go'}>Đi</button>
          </form>
          <div className="textlab-browser-utility-buttons">
            <select value={engine} onChange={(event) => setEngine(event.target.value)} aria-label={vi ? 'Công cụ tìm kiếm' : 'Search engine'}>
              {Object.entries(SEARCH_ENGINES).map(([id, item]) => <option key={id} value={id}>{item.label}</option>)}
            </select>
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
                <div><strong>{vi ? 'Duyệt web trong khi tạo hoạt động' : 'Browse while building activities'}</strong><p>{vi ? 'Tìm kiếm, mở từ điển, AI, video và công cụ giảng dạy mà không rời TextLab.' : 'Search and open dictionaries, AI, videos, and teaching tools without leaving TextLab.'}</p></div>
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

          {visibleFrames.map((tab) => {
            const src = tab.history[tab.index];
            return (
              <iframe key={`${tab.id}:${tab.reloadKey}`} className={activeTabId === tab.id && !isStart ? 'is-active' : ''} title={`${tab.title || 'Website'} embedded browser`} src={src} referrerPolicy="strict-origin-when-cross-origin" allow="clipboard-read; clipboard-write; microphone; camera; fullscreen" onLoad={() => updateTab(tab.id, (current) => ({ ...current, loading: false }))} />
            );
          })}

          {!isStart && activeTab?.loading ? <div className="textlab-browser-loading" aria-live="polite"><span /><strong>{vi ? `Đang mở ${activeTab.title || safeHostname(currentUrl)}…` : `Opening ${activeTab.title || safeHostname(currentUrl)}…`}</strong></div> : null}
        </div>

        <div className="textlab-browser-statusbar">
          <span><i className={activeTab?.loading ? 'is-loading' : ''} />{isStart ? (vi ? 'Trang bắt đầu' : 'Start page') : activeTab?.loading ? (vi ? 'Đang tải' : 'Loading') : (vi ? 'Đã tải' : 'Loaded')}</span>
          <p>{vi ? 'Một số website chặn iframe. Khi khung trắng, dùng nút ↗ để mở trang hiện tại trong cửa sổ riêng.' : 'Some websites block iframe embedding. Use ↗ when a page appears blank.'}</p>
        </div>
      </aside>

      {!open ? <button type="button" className="textlab-browser-reopen" onClick={onToggle} aria-label={vi ? 'Hiện trình duyệt Internet' : 'Show Internet browser'}><span>WEB</span><b>{vi ? 'Mở trình duyệt' : 'Open browser'}</b><i aria-hidden="true">‹</i></button> : null}
      {notice ? <div className="textlab-browser-notice" role="status">✓ {notice}</div> : null}
    </>
  );
}
