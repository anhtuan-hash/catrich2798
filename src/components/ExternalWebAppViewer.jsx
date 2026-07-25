import { useEffect, useState } from 'react';
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
  const headerHeight = outerHeight(header);
  const footerHeight = outerHeight(footer);
  const sourceWidth = Math.max(320, window.innerWidth);
  const sourceHeight = Math.max(480, window.innerHeight);
  const contentWidth = Math.max(320, main?.clientWidth || sourceWidth);
  const contentHeight = Math.max(280, sourceHeight - headerHeight - footerHeight);

  return { sourceWidth, sourceHeight, contentWidth, contentHeight };
}

export default function ExternalWebAppViewer({ app, onClose }) {
  const [key, setKey] = useState(0);
  const [check, setCheck] = useState(null);
  const [portalHost, setPortalHost] = useState(null);
  const [layout, setLayout] = useState(() => readBrianLayout(null));
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

    const onResize = () => updateLayout();
    const onKey = (event) => event.key === 'Escape' && onClose?.();
    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKey);

    return () => {
      observer?.disconnect();
      mutationObserver.disconnect();
      main.classList.remove('bes-ext-viewer-active');
      document.documentElement.classList.remove('bes-ext-content-open');
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKey);
      window.scrollTo({ top: previousScrollY, left: 0, behavior: 'auto' });
    };
  }, [app?.id, url, onClose]);

  useEffect(() => {
    if (!url) return undefined;
    const controller = new AbortController();
    setCheck({ checking: true });
    fetch(`/api/check-embed?url=${encodeURIComponent(url)}`, { signal: controller.signal })
      .then((response) => response.json())
      .then(setCheck)
      .catch((error) => {
        if (error?.name !== 'AbortError') setCheck({ embeddable: null, reason: 'Không kiểm tra được chính sách iframe.' });
      });
    return () => controller.abort();
  }, [url, key]);

  if (!app || !url || typeof document === 'undefined' || !portalHost) return null;

  const frame = (
    <iframe
      key={key}
      className={fullscreen ? 'bes-ext-fullscreen-frame' : 'bes-ext-exact-region-frame'}
      src={url}
      title={app.title || app.name}
      allow="clipboard-read; clipboard-write; microphone; camera; fullscreen; geolocation"
      sandbox="allow-forms allow-modals allow-presentation allow-same-origin allow-scripts allow-downloads"
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );

  const stateText = check?.checking
    ? 'Đang kiểm tra…'
    : check?.embeddable === false
      ? 'Website có thể chặn iframe'
      : fullscreen
        ? 'Ứng dụng phủ toàn bộ vùng nội dung; header và footer Brian vẫn hiển thị'
        : 'Đang hiển thị trọn vẹn phạm vi bốn góc trong vùng nội dung Brian';

  return createPortal(
    <div
      className="bes-ext-content-layer"
      style={{ '--bes-ext-content-height': `${layout.contentHeight}px` }}
    >
      <section
        className={`bes-ext-viewer ${fullscreen ? 'is-fullscreen-app' : 'is-exact-region-app'}`}
        aria-label={app.title || app.name}
      >
        {fullscreen ? frame : (
          <div className="bes-ext-exact-region-stage" style={exactStyle}>
            <div className="bes-ext-exact-region-crop">
              {frame}
            </div>
          </div>
        )}

        <div className="bes-ext-fullscreen-dock">
          <span className="bes-ext-fullscreen-icon">{app.icon || 'WEB'}</span>
          <div className="bes-ext-fullscreen-copy">
            <strong>{app.title || app.name}</strong>
            <small>{stateText}</small>
          </div>
          <button type="button" aria-label="Tải lại ứng dụng" onClick={() => setKey((value) => value + 1)}>↻</button>
          <button type="button" className="bes-ext-fullscreen-close" aria-label="Đóng ứng dụng" onClick={onClose}>×</button>
        </div>
      </section>
    </div>,
    portalHost,
  );
}
