import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const MIN_ROUTE_VISIBLE_MS = 460;
const MAX_ROUTE_VISIBLE_MS = 1800;

const STATE_SELECTOR = [
  '.loading-screen',
  '.loading-state',
  '.page-loading',
  '.app-loading',
  '.route-loading',
  '[class*="loading-overlay"]',
  '[class*="loading-screen"]',
  '[class*="page-loading"]',
  '[class*="app-loading"]',
  '[class*="route-loading"]',
  '[class*="__loading"]',
  '[class$="-loading"]',
  '[class*="_loading"]',
  '[class*="loading-"]',
].join(',');

const SPINNER_SELECTOR = [
  '.spinner',
  '[class$="-spinner"]',
  '[class*="-spinner "]',
  '[class$="_spinner"]',
  '[class*="__spinner"]',
  '.loader',
  '[class$="-loader"]',
  '[class*="-loader "]',
  '[class$="_loader"]',
  '[class*="__loader"]',
].join(',');

function Dots({ className = '' }) {
  return (
    <span className={`bes-wp8-dots ${className}`.trim()} aria-hidden="true">
      <i /><i /><i /><i /><i />
    </span>
  );
}

function makeInlineDots() {
  const dots = document.createElement('span');
  dots.className = 'bes-wp8-dots bes-wp8-dots--inline';
  dots.setAttribute('aria-hidden', 'true');
  for (let index = 0; index < 5; index += 1) dots.appendChild(document.createElement('i'));
  return dots;
}

function excluded(node) {
  return !node?.isConnected
    || node.closest?.('#bes-wp8-global-loader')
    || node.closest?.('button, [role="button"], input, select, textarea, option, code, pre, kbd');
}

function decorateState(node) {
  if (!node || excluded(node) || node.dataset?.besWp8LoadingState === 'true') return;
  node.dataset.besWp8LoadingState = 'true';
  if (!node.querySelector(':scope > .bes-wp8-dots--inline')) node.prepend(makeInlineDots());
}

function decorateSpinner(node) {
  if (!node || excluded(node) || node.dataset?.besWp8Spinner === 'true') return;
  node.dataset.besWp8Spinner = 'true';
  node.appendChild(makeInlineDots());
}

function scanLoadingNodes(root) {
  if (!root || root.nodeType !== 1) return;

  if (root.matches?.(STATE_SELECTOR)) decorateState(root);
  root.querySelectorAll?.(STATE_SELECTOR).forEach(decorateState);

  if (root.matches?.(SPINNER_SELECTOR)) decorateSpinner(root);
  root.querySelectorAll?.(SPINNER_SELECTOR).forEach(decorateSpinner);
}

export default function GlobalWindowsPhone8Loading() {
  const [host, setHost] = useState(null);
  const [visible, setVisible] = useState(false);
  const shownAtRef = useRef(0);
  const hideTimerRef = useRef(0);
  const safetyTimerRef = useRef(0);
  const scanFrameRef = useRef(0);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    setHost(document.body);

    document.getElementById('bes-windows8-route-loader')?.remove();

    const clearTimers = () => {
      window.clearTimeout(hideTimerRef.current);
      window.clearTimeout(safetyTimerRef.current);
    };

    const show = () => {
      clearTimers();
      shownAtRef.current = performance.now();
      setVisible(true);
      document.documentElement.dataset.wp8Loading = 'true';
      safetyTimerRef.current = window.setTimeout(() => {
        setVisible(false);
        delete document.documentElement.dataset.wp8Loading;
      }, MAX_ROUTE_VISIBLE_MS);
    };

    const hide = () => {
      const elapsed = performance.now() - shownAtRef.current;
      const wait = Math.max(0, MIN_ROUTE_VISIBLE_MS - elapsed);
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = window.setTimeout(() => {
        setVisible(false);
        delete document.documentElement.dataset.wp8Loading;
      }, wait);
    };

    const hideAfterPaint = () => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => window.setTimeout(hide, 80));
      });
    };

    const onShow = () => show();
    const onHide = () => hideAfterPaint();

    window.addEventListener('bes-navigation-start', onShow);
    window.addEventListener('hashchange', onHide);
    window.addEventListener('popstate', onHide);
    window.addEventListener('bes-wp8-loading-show', onShow);
    window.addEventListener('bes-wp8-loading-hide', onHide);

    scanLoadingNodes(document.body);
    const pending = new Set();
    const flush = () => {
      scanFrameRef.current = 0;
      pending.forEach(scanLoadingNodes);
      pending.clear();
    };
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node?.nodeType === 1) pending.add(node);
        });
      });
      if (pending.size && !scanFrameRef.current) scanFrameRef.current = window.requestAnimationFrame(flush);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearTimers();
      observer.disconnect();
      if (scanFrameRef.current) window.cancelAnimationFrame(scanFrameRef.current);
      window.removeEventListener('bes-navigation-start', onShow);
      window.removeEventListener('hashchange', onHide);
      window.removeEventListener('popstate', onHide);
      window.removeEventListener('bes-wp8-loading-show', onShow);
      window.removeEventListener('bes-wp8-loading-hide', onHide);
      delete document.documentElement.dataset.wp8Loading;
    };
  }, []);

  if (!host) return null;

  return createPortal(
    <div
      id="bes-wp8-global-loader"
      className={`bes-wp8-global-loader ${visible ? 'is-visible' : ''}`}
      role="status"
      aria-live="polite"
      aria-hidden={visible ? 'false' : 'true'}
      aria-label="Đang tải"
    >
      <Dots />
      <span className="bes-wp8-sr-only">Đang tải</span>
    </div>,
    host,
  );
}
