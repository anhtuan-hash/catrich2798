import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { normalizeEmbedView, safeExternalWebAppUrl } from '../utils/externalWebApps.js';
import './ExternalWebApps.css';
import './ExternalWebAppViewerCrop.css';

const FULLSCREEN_VIEW = normalizeEmbedView({
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  previewHeight: 900,
  canvasHeight: 1000,
  cropX: 0,
  cropY: 0,
  cropWidth: 100,
  cropHeight: 100,
});

function isFullscreenView(value = {}) {
  const clean = normalizeEmbedView(value);
  return clean.zoom === FULLSCREEN_VIEW.zoom
    && clean.offsetX === FULLSCREEN_VIEW.offsetX
    && clean.offsetY === FULLSCREEN_VIEW.offsetY
    && clean.previewHeight === FULLSCREEN_VIEW.previewHeight
    && clean.canvasHeight === FULLSCREEN_VIEW.canvasHeight
    && clean.cropX === FULLSCREEN_VIEW.cropX
    && clean.cropY === FULLSCREEN_VIEW.cropY
    && clean.cropWidth === FULLSCREEN_VIEW.cropWidth
    && clean.cropHeight === FULLSCREEN_VIEW.cropHeight;
}

function numericStyle(value) {
  const parsed = Number.parseFloat(value || '0');
  return Number.isFinite(parsed) ? parsed : 0;
}

function outerHeight(element) {
  if (!element) return 0;
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return Math.max(0, rect.height + numericStyle(style.marginTop) + numericStyle(style.marginBottom));
}

function fullscreenElement() {
  if (typeof document === 'undefined') return null;
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

function readBrianLayout(main) {
  if (typeof window === 'undefined') {
    return {
      sourceWidth: 1440,
      sourceHeight: 900,
      contentWidth: 1440,
      contentHeight: 720,
    };
  }

  const header = document.querySelector('.bes-top-chrome');
  const footer = document.querySelector('footer.signature-footer-collapsible, footer.footer');
  const nativeFullscreen = Boolean(fullscreenElement());
  const headerHeight = nativeFullscreen ? 0 : outerHeight(header);
  const footerHeight = nativeFullscreen ? 0 : outerHeight(footer);
  const sourceWidth = Math.max(320, window.innerWidth);
  const sourceHeight = Math.max(480, window.innerHeight);
  const contentWidth = nativeFullscreen
    ? sourceWidth
    : Math.max(320, main?.clientWidth || sourceWidth);
  const contentHeight = nativeFullscreen
    ? sourceHeight
    : Math.max(280, sourceHeight - headerHeight - footerHeight);

  return { sourceWidth, sourceHeight, contentWidth, contentHeight };
}

export default function ExternalWebAppViewer({ app, onClose }) {
  const viewerRef = useRef(null);
  const [portalHost, setPortalHost] = useState(null);
  const [layout, setLayout] = useState(() => readBrianLayout(null));
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const url = safeExternalWebAppUrl(app?.externalUrl || app?.url);
  const view = normalizeEmbedView(app?.embedView);
  const fullscreen = isFullscreenView(view);

  const cropLeft = (view.cropX / 100) * layout.sourceWidth;
  const cropTop = (view.cropY / 100) * layout.sourceHeight;
  const cropWidth = Math.max(1, (view.cropWidth / 100) * layout.sourceWidth);
  const cropHeight = Math.max(1, (view.cropHeight / 100) * layout.sourceHeight);
  const scale = Math.min(layout.contentWidth / cropWidth, layout.contentHeight / cropHeight);
  const exactStyle = {
    '--exact-source-width': `${layout.sourceWidth}px`,
    '--exact-source-height': `${layout.sourceHeight}px`,
    '--exact-crop-width': `${cropWidth * scale}px`,
    '--exact-crop-height': `${cropHeight * scale}px`,
    '--exact-frame-left': `${-cropLeft * scale}px`,
    '--exact-frame-top': `${-cropTop * scale}px`,
    '--exact-frame-scale': scale,
  };

  useEffect(() => {
    if (!app || !url) return undefined;

    const main = document.getElementById('bes-main-content');
    if (!main) return undefined;

    const previousScrollY = window.scrollY;
    const header = document.querySelector('.bes-top-chrome');
    const footer = document.querySelector('footer.signature-footer-collapsible, footer.footer');
    const updateLayout = () => setLayout(readBrianLayout(main));
    const updateFullscreenState = () => {
      setNativeFullscreen(fullscreenElement() === viewerRef.current);
      updateLayout();
    };

    setPortalHost(main);
    main.classList.add('bes-ext-viewer-active');
    document.documentElement.classList.add('bes-ext-content-open');
    updateLayout();
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateLayout) : null;
    observer?.observe(main);
    if (header) observer?.observe(header);
    if (footer) observer?.observe(footer);

    const mutationObserver = new MutationObserver(updateLayout);
    if (footer) mutationObserver.observe(footer, { attributes: true, childList: true, subtree: true });

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
      mutationObserver.disconnect();
      main.classList.remove('bes-ext-viewer-active');
      document.documentElement.classList.remove('bes-ext-content-open');
      window.removeEventListener('resize', updateLayout);
      window.visualViewport?.removeEventListener('resize', updateLayout);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', updateFullscreenState);
      document.removeEventListener('webkitfullscreenchange', updateFullscreenState);
      window.scrollTo({ top: previousScrollY, left: 0, behavior: 'auto' });
    };
  }, [app?.id, url, onClose]);

  const toggleNativeFullscreen = async () => {
    const node = viewerRef.current;
    if (!node) return;

    try {
      if (fullscreenElement()) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        return;
      }

      if (node.requestFullscreen) await node.requestFullscreen();
      else if (node.webkitRequestFullscreen) node.webkitRequestFullscreen();
    } catch (error) {
      console.warn('[External apps] fullscreen unavailable', error);
    }
  };

  if (!app || !url || typeof document === 'undefined' || !portalHost) return null;

  const frame = (
    <iframe
      className={fullscreen ? 'bes-ext-fullscreen-frame' : 'bes-ext-exact-region-frame'}
      src={url}
      title={app.title || app.name}
      allow="clipboard-read; clipboard-write; microphone; camera; fullscreen; geolocation"
      sandbox="allow-forms allow-modals allow-presentation allow-same-origin allow-scripts allow-downloads"
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );

  return createPortal(
    <div
      className="bes-ext-content-layer"
      style={{ '--bes-ext-content-height': `${layout.contentHeight}px` }}
    >
      <section
        ref={viewerRef}
        className={`bes-ext-viewer ${fullscreen ? 'is-fullscreen-app' : 'is-exact-region-app'}`}
        data-native-fullscreen={nativeFullscreen ? 'true' : 'false'}
        aria-label={app.title || app.name}
      >
        {fullscreen ? frame : (
          <div className="bes-ext-exact-region-stage" style={exactStyle}>
            <div className="bes-ext-exact-region-crop">
              {frame}
            </div>
          </div>
        )}

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
      </section>
    </div>,
    portalHost,
  );
}
