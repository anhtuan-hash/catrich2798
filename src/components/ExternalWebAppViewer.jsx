import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  EXTERNAL_APP_SOURCE_HTML,
  isValidExternalHtml,
  normalizeExternalAppEmbedConfig,
  safeExternalWebAppUrl,
} from '../utils/externalWebApps.js';
import './ExternalWebApps.css';
import './ExternalWebAppViewerCrop.css';
import './ExternalWebAppViewerControlStack.css';

function fullscreenElement() {
  if (typeof document === 'undefined') return null;
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

// The app viewer is the whole workspace, not an introduction page followed by
// a clipped iframe. Measure the actual top of main because navigation heights
// differ between desktop, mobile and Admin's header visibility settings.
function readBrianLayout(main) {
  if (typeof window === 'undefined') return { contentHeight: 720 };
  const viewportHeight = window.visualViewport?.height || window.innerHeight;
  const mainTop = main?.getBoundingClientRect?.().top ?? 0;
  return {
    contentHeight: Math.max(240, Math.floor(viewportHeight - Math.max(0, mainTop))),
  };
}

function sourceTypeOf(app = {}) {
  return app.sourceType === EXTERNAL_APP_SOURCE_HTML || app.htmlContent
    ? EXTERNAL_APP_SOURCE_HTML
    : 'url';
}

export default function ExternalWebAppViewer({ app, onClose, explorerId = '' }) {
  const viewerRef = useRef(null);
  const [portalHost, setPortalHost] = useState(null);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const sourceType = sourceTypeOf(app || {});
  const htmlApp = sourceType === EXTERNAL_APP_SOURCE_HTML;
  const htmlContent = htmlApp ? String(app?.htmlContent || '') : '';
  const sourceUrl = htmlApp ? '' : safeExternalWebAppUrl(app?.externalUrl || app?.url);
  const config = normalizeExternalAppEmbedConfig(app?.embedConfig, sourceUrl);
  const url = htmlApp ? '' : (safeExternalWebAppUrl(config.embedUrl) || sourceUrl);
  const ready = htmlApp ? isValidExternalHtml(htmlContent) : Boolean(url);
  const [layout, setLayout] = useState(() => readBrianLayout(null));

  useEffect(() => {
    if (!app || !ready) return undefined;
    const main = document.getElementById('bes-main-content');
    if (!main) return undefined;

    const previousScrollY = window.scrollY;
    const header = document.querySelector('.bes-top-chrome');
    const root = document.documentElement;
    const updateLayout = () => {
      const next = readBrianLayout(main);
      setLayout((previous) => (
        previous.contentHeight === next.contentHeight ? previous : next
      ));
    };
    const updateFullscreenState = () => {
      setNativeFullscreen(fullscreenElement() === viewerRef.current);
      window.requestAnimationFrame(updateLayout);
    };

    setPortalHost(main);
    main.classList.add('bes-ext-viewer-active');
    root.classList.add('bes-ext-content-open');
    root.classList.toggle('bes-ext-runtime-hide-header', config.hideBrianHeader);
    // Approved apps always get the workspace height. The standard Brian
    // footer remains unchanged on every other page.
    root.classList.add('bes-ext-runtime-hide-footer');
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    window.requestAnimationFrame(updateLayout);

    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateLayout)
      : null;
    observer?.observe(main);
    if (header) observer?.observe(header);

    const onKey = (event) => {
      if (event.key !== 'Escape' || fullscreenElement()) return;
      onClose?.();
    };
    window.addEventListener('resize', updateLayout);
    window.visualViewport?.addEventListener('resize', updateLayout);
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', updateFullscreenState);
    document.addEventListener('webkitfullscreenchange', updateFullscreenState);

    return () => {
      observer?.disconnect();
      main.classList.remove('bes-ext-viewer-active');
      root.classList.remove(
        'bes-ext-content-open',
        'bes-ext-runtime-hide-header',
        'bes-ext-runtime-hide-footer',
      );
      window.removeEventListener('resize', updateLayout);
      window.visualViewport?.removeEventListener('resize', updateLayout);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', updateFullscreenState);
      document.removeEventListener('webkitfullscreenchange', updateFullscreenState);
      window.scrollTo({ top: previousScrollY, left: 0, behavior: 'auto' });
    };
  }, [app?.id, ready, url, config.hideBrianHeader, onClose]);

  const toggleNativeFullscreen = async () => {
    const node = viewerRef.current;
    if (!node || config.allowFullscreen === false) return;
    try {
      if (fullscreenElement()) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
      } else if (node.requestFullscreen) {
        await node.requestFullscreen();
      } else if (node.webkitRequestFullscreen) {
        await node.webkitRequestFullscreen();
      }
    } catch (error) {
      console.warn('[External apps] fullscreen unavailable', error);
    }
  };

  if (!app || !ready || typeof document === 'undefined' || !portalHost) return null;

  return createPortal(
    <div
      className="bes-ext-content-layer bes-ext-runtime-layer"
      style={{ '--bes-ext-content-height': `${layout.contentHeight}px` }}
    >
      <section
        ref={viewerRef}
        id={explorerId || undefined}
        className="bes-ext-viewer is-embedded-app"
        data-native-fullscreen={nativeFullscreen ? 'true' : 'false'}
        data-source-type={sourceType}
        aria-label={app.title || app.name}
      >
        <header className="bes-ext-runtime-toolbar">
          <button type="button" className="bes-ext-runtime-back" onClick={onClose}>
            <span aria-hidden="true">←</span>
            <span>Kho ứng dụng</span>
          </button>
          <strong className="bes-ext-runtime-app-title" title={app.title || app.name}>
            {app.title || app.name}
          </strong>
          {!htmlApp && url ? (
            <a
              className="bes-ext-runtime-open-external"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              title="Mở website trong tab mới nếu nhà cung cấp không hỗ trợ iframe"
            >
              <span>Mở tab mới</span>
              <span aria-hidden="true">↗</span>
            </a>
          ) : null}
          <div className="bes-ext-runtime-controls">
            {config.allowFullscreen !== false ? (
              <button
                type="button"
                className="bes-ext-native-fullscreen-toggle"
                aria-label={nativeFullscreen ? 'Thoát toàn màn hình' : 'Mở toàn màn hình'}
                title={nativeFullscreen ? 'Thoát toàn màn hình' : 'Mở toàn màn hình'}
                onClick={toggleNativeFullscreen}
              >
                {nativeFullscreen ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9 4v5H4M15 4v5h5M20 15h-5v5M4 15h5v5" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
                  </svg>
                )}
              </button>
            ) : null}
            <button
              type="button"
              className="bes-ext-runtime-close"
              aria-label="Đóng ứng dụng"
              title="Đóng ứng dụng"
              onClick={onClose}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </header>

        {htmlApp ? (
          <iframe
            className="bes-ext-runtime-frame"
            srcDoc={htmlContent}
            title={app.title || app.name}
            allow="clipboard-write; microphone; camera; fullscreen; geolocation"
            sandbox="allow-forms allow-modals allow-presentation allow-scripts allow-downloads allow-popups"
            referrerPolicy="no-referrer"
          />
        ) : (
          <iframe
            className="bes-ext-runtime-frame"
            src={url}
            title={app.title || app.name}
            allow="clipboard-read; clipboard-write; microphone; camera; fullscreen; geolocation"
            sandbox="allow-forms allow-modals allow-presentation allow-same-origin allow-scripts allow-downloads"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}
      </section>
    </div>,
    portalHost,
  );
}
