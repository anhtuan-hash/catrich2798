const STYLE_ID = 'bes-unified-wave-loader-style';
const LOADER_ID = 'bes-global-wave-loader';
const MIN_VISIBLE_MS = 420;
const SHOW_DELAY_MS = 70;
const USER_REQUEST_WINDOW_MS = 1600;

const ROUTE_FALLBACK_TEXT = /^(?:đang mở trang|opening page)(?:\.{3}|…)?$/i;

const WAVE_CSS = `
/* Brian unified Wave Loader — replaces every legacy visual loading treatment. */
#${LOADER_ID} {
  position: fixed;
  z-index: 2147483200;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: opacity 150ms ease, visibility 150ms ease;
}

#${LOADER_ID}.is-visible {
  opacity: 1;
  visibility: visible;
}

#${LOADER_ID} .bes-wave-loader__surface {
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 176px;
  min-height: 104px;
  padding: 17px 20px;
  border: 1px solid rgba(255,255,255,.78);
  border-radius: 24px;
  background: rgba(255,255,255,.82);
  box-shadow:
    0 18px 48px rgba(18,31,48,.14),
    0 3px 12px rgba(18,31,48,.08),
    inset 0 .5px rgba(255,255,255,.96);
  -webkit-backdrop-filter: blur(16px) saturate(1.12);
  backdrop-filter: blur(16px) saturate(1.12);
}

#${LOADER_ID} .bes-wave-loader__center {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 5px;
}

#${LOADER_ID} .bes-wave-loader__wave {
  width: .58rem;
  height: 72px;
  background-color: #ff6b6b;
  margin: 0 3px;
  border-radius: .4rem;
  animation: bes-unified-wave 1.5s linear infinite;
  transform-origin: center;
  will-change: transform, filter;
}

@keyframes bes-unified-wave {
  0% {
    transform: scale(0);
    filter: hue-rotate(90deg) blur(42px);
  }
  25% {
    transform: scale(0);
    filter: hue-rotate(120deg) blur(24px);
  }
  50% {
    transform: scale(1);
    filter: hue-rotate(180deg) blur(10px);
  }
  75% {
    transform: scale(0);
    filter: hue-rotate(360deg) blur(2px);
  }
  100% {
    transform: scale(0);
    filter: hue-rotate(0deg) blur(0);
  }
}

#${LOADER_ID} .bes-wave-loader__wave:nth-child(2) { animation-delay: .1s; }
#${LOADER_ID} .bes-wave-loader__wave:nth-child(3) { animation-delay: .2s; }
#${LOADER_ID} .bes-wave-loader__wave:nth-child(4) { animation-delay: .3s; }
#${LOADER_ID} .bes-wave-loader__wave:nth-child(5) { animation-delay: .4s; }
#${LOADER_ID} .bes-wave-loader__wave:nth-child(6) { animation-delay: .5s; }
#${LOADER_ID} .bes-wave-loader__wave:nth-child(7) { animation-delay: .6s; }
#${LOADER_ID} .bes-wave-loader__wave:nth-child(8) { animation-delay: .7s; }
#${LOADER_ID} .bes-wave-loader__wave:nth-child(9) { animation-delay: .8s; }
#${LOADER_ID} .bes-wave-loader__wave:nth-child(10) { animation-delay: .9s; }

/* Old route/workspace loading visuals stay functionally mounted but never render. */
.gm-route-loader,
.windows-loader-wrap {
  display: none !important;
}

@media (max-width: 640px) {
  #${LOADER_ID} .bes-wave-loader__surface {
    min-width: 154px;
    min-height: 92px;
    padding: 14px 16px;
    border-radius: 21px;
  }
  #${LOADER_ID} .bes-wave-loader__wave {
    width: .5rem;
    height: 60px;
    margin-inline: 2.5px;
  }
}

@media (prefers-reduced-motion: reduce) {
  #${LOADER_ID} .bes-wave-loader__wave {
    animation: none !important;
    transform: scale(.55) !important;
    filter: none !important;
  }
}
`;

function ensureStyle() {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    style.dataset.besUnifiedWaveLoader = 'true';
    style.textContent = WAVE_CSS;
    document.head.appendChild(style);
  } else if (style.textContent !== WAVE_CSS) {
    style.textContent = WAVE_CSS;
  }
  return style;
}

function ensureLoader() {
  let loader = document.getElementById(LOADER_ID);
  if (loader) return loader;

  loader = document.createElement('div');
  loader.id = LOADER_ID;
  loader.dataset.besUnifiedWaveLoader = 'true';
  loader.setAttribute('role', 'status');
  loader.setAttribute('aria-live', 'polite');
  loader.setAttribute('aria-label', 'Đang tải');
  loader.innerHTML = `
    <div class="bes-wave-loader__surface" aria-hidden="true">
      <div class="bes-wave-loader__center">
        ${Array.from({ length: 10 }, () => '<span class="bes-wave-loader__wave"></span>').join('')}
      </div>
    </div>
  `;
  document.body.appendChild(loader);
  return loader;
}

function findRouteFallbacks() {
  return [...document.querySelectorAll('#bes-main-content .empty-state')].filter((node) => {
    const text = String(node.textContent || '').replace(/\s+/g, ' ').trim();
    return ROUTE_FALLBACK_TEXT.test(text);
  });
}

export function installGlobalUnifiedWaveLoading() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  const style = ensureStyle();
  const loader = ensureLoader();
  const activeTokens = new Set();
  const aiTokens = new Map();
  const internalTokens = new Map();
  const hiddenFallbacks = new Map();
  const originalFetch = typeof window.fetch === 'function' ? window.fetch : null;

  let disposed = false;
  let sequence = 0;
  let lastInteractionAt = 0;
  let showTimer = 0;
  let hideTimer = 0;
  let visibleAt = 0;
  let domSyncRaf = 0;

  const showNow = () => {
    if (disposed || activeTokens.size === 0) return;
    window.clearTimeout(hideTimer);
    hideTimer = 0;
    if (loader.classList.contains('is-visible')) return;
    visibleAt = performance.now();
    loader.classList.add('is-visible');
  };

  const scheduleShow = () => {
    if (disposed || activeTokens.size === 0 || loader.classList.contains('is-visible') || showTimer) return;
    showTimer = window.setTimeout(() => {
      showTimer = 0;
      showNow();
    }, SHOW_DELAY_MS);
  };

  const scheduleHide = () => {
    if (disposed || activeTokens.size > 0) return;
    window.clearTimeout(showTimer);
    showTimer = 0;
    if (!loader.classList.contains('is-visible')) return;
    const elapsed = performance.now() - visibleAt;
    const delay = Math.max(0, MIN_VISIBLE_MS - elapsed);
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      hideTimer = 0;
      if (!disposed && activeTokens.size === 0) loader.classList.remove('is-visible');
    }, delay);
  };

  const begin = (reason = 'loading') => {
    const token = `${reason}:${++sequence}`;
    activeTokens.add(token);
    window.clearTimeout(hideTimer);
    hideTimer = 0;
    scheduleShow();
    return token;
  };

  const end = (token) => {
    if (!token) return;
    activeTokens.delete(token);
    if (activeTokens.size === 0) scheduleHide();
  };

  const showFor = (reason, duration = 680) => {
    const token = begin(reason);
    window.setTimeout(() => end(token), Math.max(180, duration));
    return token;
  };

  const onRouteLoading = () => showFor('route', 720);

  const onPointerDown = (event) => {
    const target = event.target instanceof Element
      ? event.target.closest('button,a,[role="button"],[role="menuitem"],input[type="submit"],input[type="button"]')
      : null;
    if (!target || target.matches(':disabled,[aria-disabled="true"]')) return;
    lastInteractionAt = performance.now();
  };

  const shouldTrackRequest = () => (performance.now() - lastInteractionAt) <= USER_REQUEST_WINDOW_MS;

  if (originalFetch) {
    window.fetch = function besUnifiedWaveFetch(...args) {
      const track = shouldTrackRequest();
      const token = track ? begin('request') : null;
      let result;
      try {
        result = originalFetch.apply(this, args);
      } catch (error) {
        end(token);
        throw error;
      }
      return Promise.resolve(result).finally(() => end(token));
    };
  }

  const onAiStart = (event) => {
    const id = String(event.detail?.id || `ai-${++sequence}`);
    if (aiTokens.has(id)) return;
    aiTokens.set(id, begin('ai'));
  };
  const onAiEnd = (event) => {
    const id = event.detail?.id ? String(event.detail.id) : null;
    if (id && aiTokens.has(id)) {
      end(aiTokens.get(id));
      aiTokens.delete(id);
      return;
    }
    if (!id) {
      aiTokens.forEach(end);
      aiTokens.clear();
    }
  };

  const onInternalStart = (event) => {
    const id = String(event.detail?.id || `internal-${++sequence}`);
    if (internalTokens.has(id)) return;
    internalTokens.set(id, begin('internal'));
  };
  const onInternalEnd = (event) => {
    const id = event.detail?.id ? String(event.detail.id) : null;
    if (id && internalTokens.has(id)) {
      end(internalTokens.get(id));
      internalTokens.delete(id);
      return;
    }
    if (!id) {
      internalTokens.forEach(end);
      internalTokens.clear();
    }
  };

  let domBusyToken = null;
  const syncDomBusy = () => {
    domSyncRaf = 0;
    if (disposed) return;

    let hasBusy = Boolean(document.querySelector(
      '[aria-busy="true"]:not(#bes-global-wave-loader), [data-bes-legacy-internal-loading-hidden], .windows-loader-wrap',
    ));

    const routeFallbacks = findRouteFallbacks();
    routeFallbacks.forEach((node) => {
      hasBusy = true;
      if (!hiddenFallbacks.has(node)) {
        hiddenFallbacks.set(node, {
          display: node.style.getPropertyValue('display'),
          priority: node.style.getPropertyPriority('display'),
        });
        node.style.setProperty('display', 'none', 'important');
        node.dataset.besUnifiedWaveFallbackHidden = 'true';
      }
    });

    hiddenFallbacks.forEach((state, node) => {
      if (!node.isConnected) {
        hiddenFallbacks.delete(node);
        return;
      }
      if (routeFallbacks.includes(node)) return;
      delete node.dataset.besUnifiedWaveFallbackHidden;
      if (state.display) node.style.setProperty('display', state.display, state.priority || '');
      else node.style.removeProperty('display');
      hiddenFallbacks.delete(node);
    });

    if (hasBusy && !domBusyToken) domBusyToken = begin('dom-busy');
    if (!hasBusy && domBusyToken) {
      end(domBusyToken);
      domBusyToken = null;
    }
  };

  const requestDomSync = () => {
    if (domSyncRaf || disposed) return;
    domSyncRaf = window.requestAnimationFrame(syncDomBusy);
  };

  const observer = new MutationObserver(requestDomSync);
  const root = document.getElementById('root') || document.body;
  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-busy', 'class', 'data-bes-legacy-internal-loading-hidden'],
  });

  window.addEventListener('pointerdown', onPointerDown, true);
  window.addEventListener('bes-navigation-start', onRouteLoading);
  window.addEventListener('hashchange', onRouteLoading);
  window.addEventListener('popstate', onRouteLoading);
  window.addEventListener('bes-route-change', onRouteLoading);
  window.addEventListener('bes-ai-operation-start', onAiStart);
  window.addEventListener('bes-ai-operation-end', onAiEnd);
  window.addEventListener('bes-internal-loading-start', onInternalStart);
  window.addEventListener('bes-internal-loading-end', onInternalEnd);

  window.BrianWaveLoader = Object.freeze({ begin, end, showFor });
  requestDomSync();

  return () => {
    disposed = true;
    observer.disconnect();
    window.removeEventListener('pointerdown', onPointerDown, true);
    window.removeEventListener('bes-navigation-start', onRouteLoading);
    window.removeEventListener('hashchange', onRouteLoading);
    window.removeEventListener('popstate', onRouteLoading);
    window.removeEventListener('bes-route-change', onRouteLoading);
    window.removeEventListener('bes-ai-operation-start', onAiStart);
    window.removeEventListener('bes-ai-operation-end', onAiEnd);
    window.removeEventListener('bes-internal-loading-start', onInternalStart);
    window.removeEventListener('bes-internal-loading-end', onInternalEnd);
    window.clearTimeout(showTimer);
    window.clearTimeout(hideTimer);
    window.cancelAnimationFrame(domSyncRaf);
    if (originalFetch && window.fetch?.name === 'besUnifiedWaveFetch') window.fetch = originalFetch;
    activeTokens.clear();
    aiTokens.clear();
    internalTokens.clear();
    hiddenFallbacks.forEach((state, node) => {
      if (!node.isConnected) return;
      delete node.dataset.besUnifiedWaveFallbackHidden;
      if (state.display) node.style.setProperty('display', state.display, state.priority || '');
      else node.style.removeProperty('display');
    });
    hiddenFallbacks.clear();
    loader.classList.remove('is-visible');
    loader.remove();
    style.remove();
    if (window.BrianWaveLoader) delete window.BrianWaveLoader;
  };
}

export default installGlobalUnifiedWaveLoading;
