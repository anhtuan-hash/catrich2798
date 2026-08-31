const STYLE_ID = 'bes-global-brian-wave-style';
const OVERLAY_ID = 'bes-global-brian-wave';
const MIN_VISIBLE_MS = 420;
const SHOW_DELAY_MS = 90;
const USER_FETCH_WINDOW_MS = 850;
const DOM_BUSY_WINDOW_MS = 1600;

const BUSY_SELECTOR = [
  '[aria-busy="true"]',
  '[data-loading="true"]',
  '[data-busy="true"]',
  '[data-state="loading"]',
  '[data-status="loading"]',
  '[data-status="pending"]',
].join(',');

const STYLE_TEXT = `
#${OVERLAY_ID} {
  position: fixed;
  inset: 0;
  z-index: 2147483200;
  display: grid;
  place-items: center;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  background: rgba(250, 250, 248, .68);
  transition: opacity 150ms ease, visibility 0s linear 150ms;
  contain: layout paint style;
}

#${OVERLAY_ID}.is-visible {
  opacity: 1;
  visibility: visible;
  transition: opacity 150ms ease;
}

#${OVERLAY_ID}.is-leaving {
  opacity: 0;
}

#${OVERLAY_ID} .bes-wave-feedback {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(4px, .42vw, 7px);
  min-width: 146px;
  min-height: 92px;
  padding: 14px 18px;
  border: 1px solid rgba(23, 23, 23, .08);
  border-radius: 22px;
  background: rgba(255, 255, 255, .92);
  box-shadow: 0 16px 42px rgba(20, 20, 20, .11), 0 2px 8px rgba(20, 20, 20, .06);
}

#${OVERLAY_ID} .bes-wave-bar {
  width: clamp(6px, .48vw, 9px);
  height: clamp(52px, 6vw, 76px);
  margin: 0;
  border-radius: 999px;
  background: var(--active-app-accent, #ff6b6b);
  transform: translateZ(0) scaleY(.08);
  transform-origin: center;
  animation: bes-brian-wave 1.25s linear infinite;
  will-change: transform, opacity, filter;
}

#${OVERLAY_ID} .bes-wave-bar:nth-child(2) { animation-delay: .075s; }
#${OVERLAY_ID} .bes-wave-bar:nth-child(3) { animation-delay: .15s; }
#${OVERLAY_ID} .bes-wave-bar:nth-child(4) { animation-delay: .225s; }
#${OVERLAY_ID} .bes-wave-bar:nth-child(5) { animation-delay: .3s; }
#${OVERLAY_ID} .bes-wave-bar:nth-child(6) { animation-delay: .375s; }
#${OVERLAY_ID} .bes-wave-bar:nth-child(7) { animation-delay: .45s; }
#${OVERLAY_ID} .bes-wave-bar:nth-child(8) { animation-delay: .525s; }
#${OVERLAY_ID} .bes-wave-bar:nth-child(9) { animation-delay: .6s; }
#${OVERLAY_ID} .bes-wave-bar:nth-child(10) { animation-delay: .675s; }

@keyframes bes-brian-wave {
  0% {
    transform: translateZ(0) scaleY(.08);
    opacity: .24;
    filter: hue-rotate(90deg) blur(5px);
  }
  25% {
    transform: translateZ(0) scaleY(.14);
    opacity: .46;
    filter: hue-rotate(120deg) blur(2.5px);
  }
  50% {
    transform: translateZ(0) scaleY(1);
    opacity: 1;
    filter: hue-rotate(180deg) blur(0);
  }
  75% {
    transform: translateZ(0) scaleY(.14);
    opacity: .54;
    filter: hue-rotate(360deg) blur(1px);
  }
  100% {
    transform: translateZ(0) scaleY(.08);
    opacity: .24;
    filter: hue-rotate(0deg) blur(0);
  }
}

@media (max-width: 640px) {
  #${OVERLAY_ID} .bes-wave-feedback {
    min-width: 126px;
    min-height: 78px;
    padding: 12px 15px;
    border-radius: 19px;
  }

  #${OVERLAY_ID} .bes-wave-bar {
    width: 6px;
    height: 52px;
  }
}

@media (prefers-reduced-motion: reduce) {
  #${OVERLAY_ID} {
    transition: opacity 80ms linear;
  }

  #${OVERLAY_ID} .bes-wave-bar {
    animation: none !important;
    filter: none !important;
    opacity: .68;
    transform: scaleY(.46) !important;
    will-change: auto;
  }

  #${OVERLAY_ID} .bes-wave-bar:nth-child(2n) { transform: scaleY(.72) !important; }
  #${OVERLAY_ID} .bes-wave-bar:nth-child(3n) { transform: scaleY(.92) !important; }
}
`;

function ensureStyle() {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    style.dataset.besUnifiedLoadingStyle = 'brian-wave';
    document.head.appendChild(style);
  }
  if (style.textContent !== STYLE_TEXT) style.textContent = STYLE_TEXT;
  return style;
}

function ensureOverlay() {
  let overlay = document.getElementById(OVERLAY_ID);
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.dataset.besUnifiedLoading = 'brian-wave';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');
  overlay.setAttribute('aria-label', 'Đang xử lý');
  overlay.innerHTML = `
    <div class="bes-wave-feedback" aria-hidden="true">
      ${Array.from({ length: 10 }, () => '<span class="bes-wave-bar"></span>').join('')}
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

function closestActionTarget(target) {
  if (!(target instanceof Element)) return null;
  const action = target.closest('button, [role="button"], input[type="submit"], input[type="button"], [data-action]');
  if (!action || action.closest('[data-no-global-loading]')) return null;
  return action;
}

function actionLabel(action) {
  if (!(action instanceof Element)) return '';
  return String(
    action.getAttribute('aria-label')
    || action.getAttribute('title')
    || action.textContent
    || '',
  ).replace(/\s+/g, ' ').trim().slice(0, 80);
}

export function installGlobalUnifiedLoading() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  ensureStyle();
  const overlay = ensureOverlay();
  const active = new Set();
  let showTimer = 0;
  let hideTimer = 0;
  let visibleSince = 0;
  let lastInteractionAt = -Infinity;
  let lastInteractionLabel = '';
  let fetchSequence = 0;
  let domBusyFrame = 0;
  const originalFetch = typeof window.fetch === 'function' ? window.fetch : null;
  const previousPublicApi = window.BrianLoading;

  const setLabel = (label) => {
    const clean = String(label || '').replace(/\s+/g, ' ').trim();
    overlay.setAttribute('aria-label', clean || 'Đang xử lý');
  };

  const reveal = () => {
    window.clearTimeout(hideTimer);
    hideTimer = 0;
    if (overlay.classList.contains('is-visible')) return;
    visibleSince = performance.now();
    overlay.classList.remove('is-leaving');
    overlay.classList.add('is-visible');
  };

  const scheduleReveal = () => {
    if (showTimer || overlay.classList.contains('is-visible')) return;
    showTimer = window.setTimeout(() => {
      showTimer = 0;
      if (active.size) reveal();
    }, SHOW_DELAY_MS);
  };

  const conceal = () => {
    window.clearTimeout(showTimer);
    showTimer = 0;
    if (!overlay.classList.contains('is-visible')) return;

    const elapsed = performance.now() - visibleSince;
    const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      if (active.size) return;
      overlay.classList.add('is-leaving');
      window.setTimeout(() => overlay.classList.remove('is-visible', 'is-leaving'), 160);
    }, wait);
  };

  const start = (id, label = '') => {
    const token = String(id || 'manual');
    active.add(token);
    setLabel(label || lastInteractionLabel || 'Đang xử lý');
    scheduleReveal();
    return token;
  };

  const end = (id) => {
    if (id == null) active.clear();
    else active.delete(String(id));
    if (!active.size) conceal();
  };

  const rememberInteraction = (event) => {
    const action = closestActionTarget(event.target);
    if (!action) return;
    lastInteractionAt = performance.now();
    lastInteractionLabel = actionLabel(action);
  };

  const onSubmit = (event) => {
    lastInteractionAt = performance.now();
    lastInteractionLabel = actionLabel(event.submitter) || 'Đang gửi dữ liệu';
  };

  const hasForegroundBusySignal = () => {
    const nodes = [...document.querySelectorAll(BUSY_SELECTOR)];
    return nodes.some((node) => {
      if (!(node instanceof Element)) return false;
      if (node.closest(`#${OVERLAY_ID}, .gm-route-loader, [data-global-background-task]`)) return false;
      return true;
    });
  };

  const syncDomBusy = () => {
    domBusyFrame = 0;
    const recentlyTriggered = performance.now() - lastInteractionAt <= DOM_BUSY_WINDOW_MS;
    const alreadyTracked = active.has('dom-busy');
    const busy = hasForegroundBusySignal();
    if (busy && (recentlyTriggered || alreadyTracked)) start('dom-busy', lastInteractionLabel);
    else if (!busy && alreadyTracked) end('dom-busy');
  };

  const scheduleDomBusySync = () => {
    if (domBusyFrame) return;
    domBusyFrame = window.requestAnimationFrame(syncDomBusy);
  };

  const observer = new MutationObserver(scheduleDomBusySync);
  const root = document.getElementById('root') || document.body;
  if (root) {
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-busy', 'data-loading', 'data-busy', 'data-state', 'data-status', 'disabled', 'class'],
    });
  }

  const onManualStart = (event) => {
    const detail = event.detail || {};
    start(detail.id || 'manual', detail.label || '');
  };
  const onManualUpdate = (event) => {
    const detail = event.detail || {};
    if (!active.size) return;
    setLabel(detail.label || lastInteractionLabel || 'Đang xử lý');
  };
  const onManualEnd = (event) => {
    const detail = event.detail || {};
    end(detail.id || 'manual');
  };
  const onAiStart = (event) => {
    const detail = event.detail || {};
    start(`ai:${detail.id || 'operation'}`, detail.label || 'AI đang xử lý nội dung');
  };
  const onAiEnd = (event) => {
    const detail = event.detail || {};
    end(`ai:${detail.id || 'operation'}`);
  };
  const onAiUpdate = (event) => {
    const detail = event.detail || {};
    setLabel(detail.label || 'AI đang xử lý nội dung');
  };

  document.addEventListener('click', rememberInteraction, true);
  document.addEventListener('submit', onSubmit, true);
  window.addEventListener('bes-global-loading-start', onManualStart);
  window.addEventListener('bes-global-loading-update', onManualUpdate);
  window.addEventListener('bes-global-loading-end', onManualEnd);
  window.addEventListener('bes-ai-operation-start', onAiStart);
  window.addEventListener('bes-ai-operation-update', onAiUpdate);
  window.addEventListener('bes-ai-operation-end', onAiEnd);

  if (originalFetch) {
    window.fetch = (...args) => {
      const foreground = performance.now() - lastInteractionAt <= USER_FETCH_WINDOW_MS;
      const token = foreground ? `fetch:${++fetchSequence}` : '';
      if (token) start(token, lastInteractionLabel);
      let request;
      try {
        request = originalFetch.apply(window, args);
      } catch (error) {
        if (token) end(token);
        throw error;
      }
      return Promise.resolve(request).finally(() => {
        if (token) end(token);
      });
    };
  }

  window.BrianLoading = Object.freeze({
    start(id = 'manual', label = '') {
      window.dispatchEvent(new CustomEvent('bes-global-loading-start', { detail: { id, label } }));
      return id;
    },
    update(label = '') {
      window.dispatchEvent(new CustomEvent('bes-global-loading-update', { detail: { label } }));
    },
    end(id = 'manual') {
      window.dispatchEvent(new CustomEvent('bes-global-loading-end', { detail: { id } }));
    },
    async wrap(promise, { id = `manual:${Date.now()}`, label = '' } = {}) {
      this.start(id, label);
      try {
        return await promise;
      } finally {
        this.end(id);
      }
    },
  });

  scheduleDomBusySync();

  return () => {
    observer.disconnect();
    if (domBusyFrame) window.cancelAnimationFrame(domBusyFrame);
    window.clearTimeout(showTimer);
    window.clearTimeout(hideTimer);
    document.removeEventListener('click', rememberInteraction, true);
    document.removeEventListener('submit', onSubmit, true);
    window.removeEventListener('bes-global-loading-start', onManualStart);
    window.removeEventListener('bes-global-loading-update', onManualUpdate);
    window.removeEventListener('bes-global-loading-end', onManualEnd);
    window.removeEventListener('bes-ai-operation-start', onAiStart);
    window.removeEventListener('bes-ai-operation-update', onAiUpdate);
    window.removeEventListener('bes-ai-operation-end', onAiEnd);
    if (originalFetch && window.fetch !== originalFetch) window.fetch = originalFetch;
    if (previousPublicApi === undefined) delete window.BrianLoading;
    else window.BrianLoading = previousPublicApi;
    active.clear();
    overlay.classList.remove('is-visible', 'is-leaving');
  };
}

export default installGlobalUnifiedLoading;
