import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import './GlobalChatbotDock.css';

const DEFAULT_SITES = [
  { id: 'notrack', name: 'NoTrack AI', url: 'https://notrack.ai/' },
];

function ownerKey(user) {
  return String(user?.id || user?.email || 'guest').replace(/[^a-z0-9@._-]/gi, '_');
}

function storageKey(user) {
  return `bes-global-chatbot-sites:${ownerKey(user)}`;
}

function normalizeUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    parsed.protocol = 'https:';
    return parsed.toString();
  } catch {
    return '';
  }
}

function loadState(user) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(user)) || 'null');
    if (!saved || !Array.isArray(saved.sites) || !saved.sites.length) throw new Error('empty');
    const sites = saved.sites
      .map((site) => ({
        id: String(site.id || `site-${Date.now()}-${Math.random()}`),
        name: String(site.name || 'Chatbot').slice(0, 50),
        url: normalizeUrl(site.url),
      }))
      .filter((site) => site.url)
      .slice(0, 20);
    if (!sites.length) throw new Error('empty');
    return {
      sites,
      activeId: sites.some((site) => site.id === saved.activeId) ? saved.activeId : sites[0].id,
    };
  } catch {
    return { sites: DEFAULT_SITES, activeId: DEFAULT_SITES[0].id };
  }
}

export default function GlobalChatbotDock({ currentUser, language = 'vi' }) {
  const vi = language === 'vi';
  const initial = useMemo(() => loadState(currentUser), [currentUser?.id, currentUser?.email]);
  const [portalTarget, setPortalTarget] = useState(null);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [sites, setSites] = useState(initial.sites);
  const [activeId, setActiveId] = useState(initial.activeId);
  const [draftName, setDraftName] = useState('');
  const [draftUrl, setDraftUrl] = useState('');
  const [showManager, setShowManager] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState('');

  const activeSite = sites.find((site) => site.id === activeId) || sites[0];

  useEffect(() => {
    const findTarget = () => setPortalTarget(document.querySelector('.global-notice-utilities'));
    findTarget();
    const timer = window.setTimeout(findTarget, 80);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const next = loadState(currentUser);
    setSites(next.sites);
    setActiveId(next.activeId);
  }, [currentUser?.id, currentUser?.email]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(currentUser), JSON.stringify({ sites, activeId }));
    } catch {
      // Keep the current session functional when storage is unavailable.
    }
  }, [sites, activeId, currentUser?.id, currentUser?.email]);

  useEffect(() => {
    const close = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);

  const flash = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 2200);
  };

  const selectSite = (id) => {
    setActiveId(id);
    setLoaded(false);
    setReloadKey((value) => value + 1);
    setShowManager(false);
  };

  const saveSite = (event) => {
    event.preventDefault();
    const name = String(draftName || '').trim();
    const url = normalizeUrl(draftUrl);
    if (!name || !url) {
      flash(vi ? 'Nhập tên và địa chỉ website hợp lệ.' : 'Enter a valid name and website URL.');
      return;
    }
    const duplicate = sites.find((site) => site.url === url);
    if (duplicate) {
      setActiveId(duplicate.id);
      flash(vi ? 'Website này đã được lưu.' : 'This website is already saved.');
      return;
    }
    const site = {
      id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.slice(0, 50),
      url,
    };
    setSites((current) => [...current, site].slice(0, 20));
    setActiveId(site.id);
    setDraftName('');
    setDraftUrl('');
    setLoaded(false);
    setReloadKey((value) => value + 1);
    flash(vi ? 'Đã lưu website chatbot.' : 'Chatbot website saved.');
  };

  const removeSite = (id) => {
    setSites((current) => {
      const next = current.filter((site) => site.id !== id);
      if (!next.length) {
        setActiveId(DEFAULT_SITES[0].id);
        return DEFAULT_SITES;
      }
      if (id === activeId) setActiveId(next[0].id);
      return next;
    });
    setLoaded(false);
    setReloadKey((value) => value + 1);
  };

  const trigger = (
    <button
      type="button"
      className={`global-chatbot-trigger ${open ? 'is-open' : ''}`}
      onClick={() => setOpen((value) => !value)}
      aria-expanded={open}
      title={vi ? 'Mở bảng chatbot' : 'Open chatbot panel'}
    >
      <span aria-hidden="true">▣</span>
      <strong>Chatbot</strong>
    </button>
  );

  const panel = open ? (
    <div className="global-chatbot-layer" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) setOpen(false);
    }}>
      <aside className={`global-chatbot-drawer ${expanded ? 'is-expanded' : ''}`} role="dialog" aria-modal="true" aria-label={vi ? 'Bảng chatbot' : 'Chatbot panel'}>
        <header className="global-chatbot-header">
          <div>
            <span>{vi ? 'CHATBOT ĐA NỀN TẢNG' : 'MULTI-SITE CHATBOT'}</span>
            <h2>{activeSite?.name || 'Chatbot'}</h2>
            <small>{activeSite ? new URL(activeSite.url).hostname : ''}</small>
          </div>
          <nav>
            <button type="button" onClick={() => setShowManager((value) => !value)} title={vi ? 'Quản lý website' : 'Manage websites'}>⚙</button>
            <button type="button" onClick={() => setExpanded((value) => !value)} title={expanded ? (vi ? 'Thu nhỏ' : 'Restore size') : (vi ? 'Mở rộng' : 'Expand')}>{expanded ? '↙' : '↗'}</button>
            <button type="button" onClick={() => { setLoaded(false); setReloadKey((value) => value + 1); }} title={vi ? 'Tải lại' : 'Reload'}>↻</button>
            <button type="button" onClick={() => setOpen(false)} title={vi ? 'Đóng' : 'Close'}>×</button>
          </nav>
        </header>

        <div className="global-chatbot-sitebar">
          <div>
            {sites.map((site) => (
              <button key={site.id} type="button" className={site.id === activeId ? 'active' : ''} onClick={() => selectSite(site.id)}>
                <span>{site.name.slice(0, 1).toUpperCase()}</span>
                <b>{site.name}</b>
              </button>
            ))}
          </div>
          <button type="button" className="add-site" onClick={() => setShowManager(true)}>＋</button>
        </div>

        {showManager ? (
          <section className="global-chatbot-manager">
            <header>
              <div>
                <strong>{vi ? 'Website chatbot đã lưu' : 'Saved chatbot websites'}</strong>
                <small>{vi ? 'Tối đa 20 website trên trình duyệt này.' : 'Up to 20 websites on this browser.'}</small>
              </div>
              <button type="button" onClick={() => setShowManager(false)}>×</button>
            </header>
            <form onSubmit={saveSite}>
              <input value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder={vi ? 'Tên website, ví dụ NoTrack AI' : 'Website name'} maxLength={50} />
              <input value={draftUrl} onChange={(event) => setDraftUrl(event.target.value)} placeholder="https://..." inputMode="url" />
              <button type="submit">{vi ? 'Lưu website' : 'Save website'}</button>
            </form>
            <div className="global-chatbot-saved-list">
              {sites.map((site) => (
                <article key={site.id}>
                  <button type="button" onClick={() => selectSite(site.id)}>
                    <span>{site.name.slice(0, 1).toUpperCase()}</span>
                    <div><strong>{site.name}</strong><small>{site.url}</small></div>
                  </button>
                  <button type="button" className="danger" onClick={() => removeSite(site.id)} title={vi ? 'Xoá website' : 'Remove website'}>×</button>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <main className="global-chatbot-frame-wrap">
          {!loaded ? <div className="global-chatbot-loading"><span /><strong>{vi ? `Đang kết nối ${activeSite?.name || 'chatbot'}…` : `Connecting to ${activeSite?.name || 'chatbot'}…`}</strong></div> : null}
          {activeSite ? (
            <iframe
              key={`${activeSite.id}:${reloadKey}`}
              src={activeSite.url}
              title={`${activeSite.name} chatbot`}
              allow="clipboard-read; clipboard-write; microphone; camera; fullscreen"
              referrerPolicy="strict-origin-when-cross-origin"
              onLoad={() => setLoaded(true)}
            />
          ) : null}
        </main>

        <footer className="global-chatbot-footer">
          <span>{vi ? 'Website có thể chặn nhúng trong iframe.' : 'The website may block iframe embedding.'}</span>
          <button type="button" onClick={() => activeSite && window.open(activeSite.url, '_blank', 'noopener,noreferrer')} disabled={!activeSite}>↗ {vi ? 'Mở riêng' : 'Open separately'}</button>
        </footer>
        {message ? <div className="global-chatbot-toast">{message}</div> : null}
      </aside>
    </div>
  ) : null;

  return (
    <>
      {portalTarget ? createPortal(trigger, portalTarget) : trigger}
      {panel && typeof document !== 'undefined' ? createPortal(panel, document.body) : panel}
    </>
  );
}
