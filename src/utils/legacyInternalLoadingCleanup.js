import { installGlobalUnifiedLoading } from './globalUnifiedLoading.js';

const LEGACY_VISUAL_SELECTOR = [
  '[class~="spinner" i]',
  '[class*="spinner-" i]',
  '[class*="-spinner" i]',
  '[class~="skeleton" i]',
  '[class*="skeleton-" i]',
  '[class*="-skeleton" i]',
  '[class~="shimmer" i]',
  '[class*="shimmer-" i]',
  '[class*="-shimmer" i]',
  '[class*="loading-spinner" i]',
  '[class*="loading-dots" i]',
  '[class*="loading-pulse" i]',
  '[class*="loading-indicator" i]',
  '[class*="loading-overlay" i]',
  '[class*="loading-backdrop" i]',
  '[class*="loading-mask" i]',
  '[class*="busy-overlay" i]',
  '[data-loading-indicator]',
  '[data-legacy-loading-visual]',
].join(',');

const LEGACY_TEXT_SELECTOR = [
  '.loading-text',
  '[class*="loading-label" i]',
  '[class*="loading-message" i]',
  '[class*="busy-message" i]',
  '[role="status"]',
].join(',');

const PROTECTED_SELECTOR = [
  '.gm-route-loader',
  '.windows-loader-wrap',
  '.windows-loader-card',
  '[data-bes-unified-loading]',
  '[data-bes-route-loading]',
  '[data-route-loading]',
  '[data-global-route-loading]',
].join(',');

const LOADING_TEXT = /^(?:đang\s+(?:tải|lưu|xử\s*lý|gửi|tạo|xuất|nhập|đồng\s*bộ|cập\s*nhật|kết\s*nối|chuẩn\s*bị|phân\s*tích)(?:\s+[^.!?…]*)?[.!?…]*|loading(?:\s+[^.!?…]*)?[.!?…]*|saving(?:\s+[^.!?…]*)?[.!?…]*|processing(?:\s+[^.!?…]*)?[.!?…]*|submitting(?:\s+[^.!?…]*)?[.!?…]*|generating(?:\s+[^.!?…]*)?[.!?…]*|exporting(?:\s+[^.!?…]*)?[.!?…]*|importing(?:\s+[^.!?…]*)?[.!?…]*|syncing(?:\s+[^.!?…]*)?[.!?…]*)$/i;

function isRealProgress(node) {
  return Boolean(node?.matches?.('progress,[role="progressbar"],[aria-valuenow],[aria-valuemin],[aria-valuemax]')
    || node?.closest?.('progress,[role="progressbar"],[aria-valuenow],[aria-valuemin],[aria-valuemax]'));
}

function isProtected(node) {
  if (!(node instanceof Element)) return true;
  if (node.matches(PROTECTED_SELECTOR) || node.closest(PROTECTED_SELECTOR)) return true;
  if (isRealProgress(node)) return true;
  return false;
}

function isInternalLoadingText(node) {
  if (!(node instanceof Element) || isProtected(node)) return false;
  if (node.matches('button,a,[role="button"],option,input,textarea,select')) return false;
  const text = String(node.textContent || '').replace(/\s+/g, ' ').trim();
  return Boolean(text && text.length <= 120 && LOADING_TEXT.test(text));
}

export function installLegacyInternalLoadingCleanup() {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return () => {};

  const releaseGlobalUnifiedLoading = installGlobalUnifiedLoading();
  const hidden = new Map();
  let disposed = false;

  const restore = (node) => {
    const state = hidden.get(node);
    if (!(node instanceof HTMLElement) || !state) return;
    delete node.dataset.besLegacyInternalLoadingHidden;
    if (state.display) node.style.setProperty('display', state.display, state.displayPriority || '');
    else node.style.removeProperty('display');
    if (state.hadAriaHidden) node.setAttribute('aria-hidden', state.ariaHidden ?? 'true');
    else node.removeAttribute('aria-hidden');
    hidden.delete(node);
  };

  const hide = (node, reason) => {
    if (!(node instanceof HTMLElement) || isProtected(node) || hidden.has(node)) return;
    hidden.set(node, {
      display: node.style.getPropertyValue('display'),
      displayPriority: node.style.getPropertyPriority('display'),
      ariaHidden: node.getAttribute('aria-hidden'),
      hadAriaHidden: node.hasAttribute('aria-hidden'),
    });
    node.dataset.besLegacyInternalLoadingHidden = reason;
    node.style.setProperty('display', 'none', 'important');
    node.setAttribute('aria-hidden', 'true');
  };

  const scanElement = (element) => {
    if (!(element instanceof Element) || disposed) return;

    if (hidden.get(element) && element.dataset.besLegacyInternalLoadingHidden === 'text' && !isInternalLoadingText(element)) {
      restore(element);
    }

    if (element.matches?.(LEGACY_VISUAL_SELECTOR) && !isProtected(element)) {
      hide(element, 'visual');
    }
    if (element.matches?.(LEGACY_TEXT_SELECTOR) && isInternalLoadingText(element)) {
      hide(element, 'text');
    }

    element.querySelectorAll?.(LEGACY_VISUAL_SELECTOR).forEach((node) => {
      if (!isProtected(node)) hide(node, 'visual');
    });
    element.querySelectorAll?.(LEGACY_TEXT_SELECTOR).forEach((node) => {
      if (hidden.get(node) && node.dataset.besLegacyInternalLoadingHidden === 'text' && !isInternalLoadingText(node)) {
        restore(node);
        return;
      }
      if (isInternalLoadingText(node)) hide(node, 'text');
    });
  };

  const scanRoot = () => {
    const root = document.getElementById('root') || document.body;
    if (root) scanElement(root);
  };

  scanRoot();

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) scanElement(node);
          else if (node.parentElement) scanElement(node.parentElement);
        });
        if (mutation.target instanceof Element) scanElement(mutation.target);
        return;
      }
      if (mutation.target instanceof Element) scanElement(mutation.target);
    });
  });

  const root = document.getElementById('root') || document.body;
  if (root) {
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'data-loading', 'data-state', 'aria-busy'],
    });
  }

  return () => {
    disposed = true;
    observer.disconnect();
    releaseGlobalUnifiedLoading();
    [...hidden.keys()].forEach(restore);
    hidden.clear();
  };
}

export default installLegacyInternalLoadingCleanup;
