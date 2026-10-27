import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Globe2, Grid2X2, LayoutPanelLeft, Maximize2, Minimize2,
  SkipBack, SkipForward, RefreshCw, MousePointer2, ShieldCheck } from 'lucide-react';
import { normalizeFocusWebLayout, normalizeFocusWebScenes } from './focusWebScenes.js';
import { nextFocusWebIndex } from './focusWebNavigation.js';

/**
 * Third-party URLs are never rendered as srcDoc or as host-page HTML.
 * The sandbox intentionally forbids top navigation. A site may still refuse
 * iframe embedding via X-Frame-Options / CSP; open-in-tab remains available.
 */
export default function FocusWebScenes({ scene, language = 'vi', onInteractiveChange, blocked = false }) {
  const vi = language !== 'en';
  const pages = useMemo(() => normalizeFocusWebScenes(
    scene?.webScenes, typeof window === 'undefined' ? '' : window.location.origin,
  ), [scene?.webScenes]);
  const [selected, setSelected] = useState(0);
  const [layout, setLayout] = useState(() => normalizeFocusWebLayout(scene?.webLayout));
  const [interactive, setInteractive] = useState(false);
  const [revisions, setRevisions] = useState({});
  // Native fullscreen uses the actual panel node: iframe state remains mounted.
  // CSS fallback maximizes inside the page on iOS / unsupported browsers.
  const panelNodes = useRef(new Map());
  const nativeFullscreenNode = useRef(null);
  const fullscreenPageIndexRef = useRef(null);
  // url is the stable panel identity; pageIndex is the displayed playlist item.
  // Never change the fullscreen panel key while navigating: browsers would exit fullscreen.
  const [expanded, setExpanded] = useState({ url: '', mode: '', pageIndex: null });

  useEffect(() => {
    setSelected(0);
    setLayout(normalizeFocusWebLayout(scene?.webLayout));
    setInteractive(false);
    // Shared scene changes must not leave a stale fullscreen panel visible.
    const oldNode = nativeFullscreenNode.current;
    if (oldNode && document.fullscreenElement === oldNode) {
      document.exitFullscreen?.().catch(() => {});
    }
    nativeFullscreenNode.current = null;
    fullscreenPageIndexRef.current = null;
    setExpanded({ url: '', mode: '', pageIndex: null });
    onInteractiveChange?.(false);
  }, [scene?.updatedAt, scene?.webLayout, onInteractiveChange]);

  useEffect(() => {
    onInteractiveChange?.(interactive && !blocked);
    return () => onInteractiveChange?.(false);
  }, [interactive, blocked, onInteractiveChange]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (nativeFullscreenNode.current &&
          document.fullscreenElement !== nativeFullscreenNode.current) {
        nativeFullscreenNode.current = null;
        if (fullscreenPageIndexRef.current !== null) setSelected(fullscreenPageIndexRef.current);
        fullscreenPageIndexRef.current = null;
        setExpanded(previous => previous.mode === 'native'
          ? { url: '', mode: '', pageIndex: null } : previous);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (expanded.mode !== 'fallback') return undefined;
    // FocusOverlay handles Escape on document. Capture fallback Escape first
    // so the website shrinks instead of closing the entire Focus overlay.
    const onEscape = event => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      if (fullscreenPageIndexRef.current !== null) setSelected(fullscreenPageIndexRef.current);
      fullscreenPageIndexRef.current = null;
      setExpanded({ url: '', mode: '', pageIndex: null });
    };
    window.addEventListener('keydown', onEscape, true);
    return () => window.removeEventListener('keydown', onEscape, true);
  }, [expanded.mode]);

  useEffect(() => {
    if (!blocked) return;
    const node = nativeFullscreenNode.current;
    if (node && document.fullscreenElement === node) {
      document.exitFullscreen?.().catch(() => {});
    }
    nativeFullscreenNode.current = null;
    if (fullscreenPageIndexRef.current !== null) setSelected(fullscreenPageIndexRef.current);
    fullscreenPageIndexRef.current = null;
    setExpanded({ url: '', mode: '', pageIndex: null });
  }, [blocked]);

  useEffect(() => () => {
    const node = nativeFullscreenNode.current;
    if (node && document.fullscreenElement === node) {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  const leaveWebFullscreen = async () => {
    const node = nativeFullscreenNode.current;
    nativeFullscreenNode.current = null;
    if (node && document.fullscreenElement === node) {
      try { await document.exitFullscreen(); } catch { /* Continue restoring local layout. */ }
    }
    if (fullscreenPageIndexRef.current !== null) setSelected(fullscreenPageIndexRef.current);
    fullscreenPageIndexRef.current = null;
    setExpanded({ url: '', mode: '', pageIndex: null });
  };

  const nextFullscreenWebsite = () => {
    // A single fullscreen panel remains mounted. Only its iframe src changes.
    // This is important: remounting the fullscreen element immediately exits native fullscreen.
    if (blocked || pages.length < 2) return;
    setExpanded(previous => {
      if (!previous.url || !previous.mode) return previous;
      const next = nextFocusWebIndex(previous.pageIndex, pages.length);
      fullscreenPageIndexRef.current = next;
      return { ...previous, pageIndex: next };
    });
  };

  const toggleWebFullscreen = async url => {
    if (expanded.url === url) {
      await leaveWebFullscreen();
      return;
    }
    const node = panelNodes.current.get(url);
    if (!node || blocked) return;
    const pageIndex = pages.findIndex(page => page.url === url);
    if (pageIndex < 0) return;
    fullscreenPageIndexRef.current = pageIndex;
    setInteractive(true);
    try {
      if (typeof node.requestFullscreen === 'function') {
        // Must run directly from the click, before any awaited operation.
        await node.requestFullscreen();
        nativeFullscreenNode.current = node;
        setExpanded({ url, mode: 'native', pageIndex });
        return;
      }
    } catch { /* Safari iOS / restrictive browser: use immersive CSS fallback. */ }
    setExpanded({ url, mode: 'fallback', pageIndex });
  };

  if (!pages.length) {
    return <div className="bfc-web-empty" role="status">
      {vi ? 'Chưa có website hợp lệ. Admin/TTCM hãy mở Đổi nền để thêm.' :
        'No valid websites. Ask Admin/Department Leader to configure the scene.'}
    </div>;
  }

  const count = Math.min(layout === 'quad' ? 4 : layout === 'split' ? 2 : 1, pages.length);
  const indices = Array.from({ length: count }, (_, index) => (selected + index) % pages.length);
  const isLive = interactive && !blocked;
  const changePage = delta => setSelected(previous => (previous + delta + pages.length) % pages.length);
  const refresh = url => setRevisions(previous => ({ ...previous, [url]: (previous[url] || 0) + 1 }));

  return <div className={'bfc-web-scenes' + (isLive ? ' is-interactive' : ' is-preview') +
    (expanded.mode === 'fallback' ? ' is-fallback-expanded' : '')}
    aria-label={vi ? 'Website tương tác trong Focus' : 'Interactive Focus websites'}>
    <div className="bfc-web-scenes__toolbar" role="toolbar"
      aria-label={vi ? 'Điều khiển website' : 'Website controls'}>
      <span className="bfc-web-scenes__brand"><Globe2 size={16}/><strong>WEB SCENES</strong></span>
      <button type="button" onClick={() => changePage(-1)} disabled={pages.length <= 1}
        title={vi ? 'Website trước' : 'Previous website'} aria-label={vi ? 'Website trước' : 'Previous website'}>
        <SkipBack size={16}/></button>
      <span className="bfc-web-scenes__count">{selected + 1}/{pages.length}</span>
      <button type="button" onClick={() => changePage(1)} disabled={pages.length <= 1}
        title={vi ? 'Website sau' : 'Next website'} aria-label={vi ? 'Website sau' : 'Next website'}>
        <SkipForward size={16}/></button>
      <span className="bfc-web-scenes__separator"/>
      <button type="button" className={layout === 'single' ? 'is-active' : ''}
        aria-pressed={layout === 'single'} onClick={() => setLayout('single')}
        title={vi ? 'Một website' : 'One website'} aria-label={vi ? 'Một website' : 'One website'}>
        <Maximize2 size={15}/></button>
      <button type="button" className={layout === 'split' ? 'is-active' : ''}
        aria-pressed={layout === 'split'} onClick={() => setLayout('split')}
        title={vi ? 'Chia đôi' : 'Split screen'} aria-label={vi ? 'Chia đôi' : 'Split screen'}>
        <LayoutPanelLeft size={15}/></button>
      <button type="button" className={layout === 'quad' ? 'is-active' : ''}
        aria-pressed={layout === 'quad'} onClick={() => setLayout('quad')}
        title={vi ? 'Chia bốn' : 'Four panels'} aria-label={vi ? 'Chia bốn' : 'Four panels'}>
        <Grid2X2 size={15}/></button>
      <span className="bfc-web-scenes__separator"/>
      <button type="button" className={'bfc-web-scenes__activate' + (isLive ? ' is-active' : '')}
        disabled={blocked} aria-pressed={isLive}
        onClick={() => setInteractive(value => !value)}
        title={vi ? 'Bật/tắt tương tác iframe' : 'Toggle iframe interaction'}>
        {isLive ? <Minimize2 size={16}/> : <MousePointer2 size={16}/>}
        <span>{isLive ? (vi ? 'Thoát tương tác' : 'Stop interacting') :
          (vi ? 'Tương tác' : 'Interact')}</span>
      </button>
      <button type="button" className="bfc-web-scenes__fullscreen"
        disabled={blocked} onClick={() => toggleWebFullscreen(pages[selected].url)}
        title={vi ? 'Mở website toàn màn hình' : 'Open website fullscreen'}
        aria-label={vi ? 'Mở website toàn màn hình' : 'Open website fullscreen'}>
        <Maximize2 size={16}/><span>{vi ? 'Toàn màn hình' : 'Fullscreen'}</span>
      </button>
    </div>
    <div className={'bfc-web-scenes__stage bfc-web-scenes__stage--' + layout + (isLive ? ' is-live' : '')}>
      {indices.map((index) => {
        const slotPage = pages[index];
        const isExpanded = expanded.url === slotPage.url;
        const page = isExpanded && Number.isInteger(expanded.pageIndex)
          ? pages[expanded.pageIndex] || slotPage : slotPage;
        return <div className={'bfc-web-scenes__panel' +
          (isExpanded ? ' is-expanded' : '')}
          key={slotPage.url}
          ref={node => {
            if (node) panelNodes.current.set(slotPage.url, node);
            else panelNodes.current.delete(slotPage.url);
          }}>
          <div className="bfc-web-scenes__panel-head">
            <span title={page.title}><Globe2 size={13}/>{page.title}</span>
            <div className="bfc-web-scenes__panel-actions">
              <button type="button" className="bfc-web-scenes__panel-fullscreen"
                onClick={() => toggleWebFullscreen(slotPage.url)}
                aria-pressed={isExpanded}
                title={isExpanded ?
                  (vi ? 'Thoát toàn màn hình (Esc)' : 'Exit fullscreen (Esc)') :
                  (vi ? 'Mở website toàn màn hình' : 'Fullscreen website')}
                aria-label={isExpanded ?
                  (vi ? 'Thoát toàn màn hình website' : 'Exit website fullscreen') :
                  (vi ? 'Mở website toàn màn hình' : 'Open website fullscreen')}>
                {isExpanded ? <Minimize2 size={15}/> : <Maximize2 size={15}/>}
              </button>
              <button type="button" onClick={() => refresh(page.url)}
                title={vi ? 'Tải lại trang' : 'Reload website'} aria-label={vi ? 'Tải lại trang' : 'Reload website'}>
                <RefreshCw size={14}/></button>
              <a href={page.url} target="_blank" rel="noopener noreferrer"
                title={vi ? 'Mở tab riêng nếu website chặn nhúng' : 'Open in new tab if embedding is blocked'}
                aria-label={vi ? 'Mở tab riêng' : 'Open in new tab'}><ExternalLink size={14}/></a>
            </div>
          </div>
          <iframe key={page.url + ':' + (revisions[page.url] || 0)}
            title={page.title} src={page.url}
            sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
            allow="fullscreen; autoplay; encrypted-media; clipboard-write"
            allowFullScreen loading="lazy" referrerPolicy="no-referrer"/>
          {isExpanded && pages.length > 1 && <button type="button"
            className="bfc-web-scenes__fullscreen-next"
            onClick={nextFullscreenWebsite}
            aria-label={vi ? 'Chuyển sang website tương tác tiếp theo' : 'Next interactive website'}
            title={vi ? 'Website tiếp theo (vẫn toàn màn hình)' : 'Next website (stay fullscreen)'}>
            <span className="bfc-web-scenes__fullscreen-next-copy">
              <strong>{vi ? 'Tiếp theo' : 'Next'}</strong>
              <small>{(expanded.pageIndex ?? index) + 1}/{pages.length}</small>
            </span>
            <SkipForward size={23} aria-hidden="true"/>
          </button>}
        </div>;
      })}
    </div>
    <div className="bfc-web-scenes__hint">
      <ShieldCheck size={13}/>
      {vi ? 'Chỉ HTTPS · Nếu trang không hiện, chọn nút mở tab riêng. Chuyển website bằng tay.' :
        'HTTPS only · If blocked, open in a new tab. Website switching is manual.'}
    </div>
  </div>;
}
