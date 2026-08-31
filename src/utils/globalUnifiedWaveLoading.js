const STYLE_ID = 'bes-unified-wave-loader-style';
const LOADER_ID = 'bes-global-wave-loader';
const MIN_VISIBLE_MS = 420;
const SHOW_DELAY_MS = 70;
const USER_REQUEST_WINDOW_MS = 1600;

const WAVE_CSS = `
/* Brian unified Wave Loader — internal async work only. Route/workspace transitions stay loader-free. */
#${LOADER_ID} {
  position: fixed;
  z-index: 2147483200;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  background: transparent;
  transition: none;
}

#${LOADER_ID}.is-visible {
  opacity: 1;
  visibility: visible;
}

#${LOADER_ID} .bes-wave-loader__surface,
#${LOADER_ID} .bes-wave-loader__center {
  display: flex;
  justify-content: center;
  align-items: center;
}

#${LOADER_ID} .bes-wave-loader__surface {
  min-width: 0;
  min-height: 0;
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
}

#${LOADER_ID} .bes-wave-loader__center {
  margin: 5px;
}

#${LOADER_ID} .bes-wave-loader__wave {
  width: 1.8rem;
  height: 150px;
  background-color: #ff6b6b;
  margin: 0 4px;
  border-radius: .4rem;
  animation: bes-unified-wave 1.5s linear infinite;
  transform-origin: center;
  will-change: transform, filter;
}

@keyframes bes-unified-wave {
  0% { transform: scale(0); filter: hue-rotate(90deg) blur(100px); }
  25% { transform: scale(0); filter: hue-rotate(120deg) blur(50px); }
  50% { transform: scale(1); filter: hue-rotate(180deg) blur(25px); }
  75% { transform: scale(0); filter: hue-rotate(360deg) blur(2px); }
  100% { transform: scale(0); filter: hue-rotate(0deg) blur(0); }
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

/* Legacy route/workspace loaders remain retired; switching pages has no loading visual. */
.gm-route-loader,
.windows-loader-wrap {
  display: none !important;
}

@media (max-width: 420px) {
  #${LOADER_ID} .bes-wave-loader__center {
    transform: scale(.82);
    transform-origin: center;
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
    document.head.appendChild(style);
  }
  style.textContent = WAVE_CSS;
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

function getInteractiveTarget(event) {
  return event.target instanceof Element
    ? event.target.closest('button,a,[role="button"],[role="menuitem"],input[type="submit"],input[type="button"]')
    : null;
}

function isExplicitRouteNavigation(target) {
  if (!(target instanceof Element)) return false;
  if (target.closest('.brian-nav__primary')) return true;

  const href = String(target.getAttribute('href') || target.getAttribute('data-href') || '').trim();
  if (href.startsWith('#/') || href.includes('/#/')) return true;

  const routeTarget = String(
    target.getAttribute('data-route-target')
      || target.getAttribute('data-navigation-target')
      || '',
  ).trim();
  return routeTarget.startsWith('#/') || routeTarget.startsWith('/');
}

export function installGlobalUnifiedWaveLoading() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  const style = ensureStyle();
  const loader = ensureLoader();
  const activeTokens = new Set();
  const aiTokens = new Map();
  const internalTokens = new Map();
  const originalFetch = typeof window.fetch === 'function' ? window.fetch : null;

  let disposed = false;
  let sequence = 0;
  let lastInteractionAt = 0;
  let routeSuppressed = true;
  let showTimer = 0;
  let hideTimer = 0;
  let visibleAt = 0;
  let domSyncRaf = 0;
  let domBusyToken = null;

  const hideImmediately = () => {
    window.clearTimeout(showTimer);
    window.clearTimeout(hideTimer);
    showTimer = 0;
    hideTimer = 0;
    loader.classList.remove('is-visible');
  };

  const showNow = () => {
    if (disposed || routeSuppressed || activeTokens.size === 0) return;
    window.clearTimeout(hideTimer);
    hideTimer = 0;
    if (loader.classList.contains('is-visible')) return;
    visibleAt = performance.now();
    loader.classList.add('is-visible');
  };

  const scheduleShow = () => {
    if (disposed || routeSuppressed || activeTokens.size === 0 || loader.classList.contains('is-visible') || showTimer) return;
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
    if (routeSuppressed) return null;
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
    if (token) window.setTimeout(() => end(token), Math.max(180, duration));
    return token;
  };

  const resetForRouteTransition = () => {
    routeSuppressed = true;
    lastInteractionAt = 0;
    activeTokens.clear();
    aiTokens.clear();
    internalTokens.clear();
    domBusyToken = null;
    hideImmediately();
  };

  const releaseRouteSuppression = () => {
    if (!routeSuppressed) return;
    routeSuppressed = false;
    requestDomSync();
  };

  const onPointerDown = (event) => {
    const target = getInteractiveTarget(event);
    if (!target || target.matches(':disabled,[aria-disabled="true"]')) return;
    if (isExplicitRouteNavigation(target)) resetForRouteTransition();
  };

  const onClick = (event) => {
    const target = getInteractiveTarget(event);
    if (!target || target.matches(':disabled,[aria-disabled="true"]')) return;
    if (isExplicitRouteNavigation(target)) {
      resetForRouteTransition();
      return;
    }
    releaseRouteSuppression();
    lastInteractionAt = performance.now();
  };

  const shouldTrackRequest = () => !routeSuppressed
    && (performance.now() - lastInteractionAt) <= USER_REQUEST_WINDOW_MS;

  if (originalFetch) {
    window.fetch = function besUnifiedWaveFetch(...args) {
      const token = shouldTrackRequest() ? begin('request') : null;
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
    if (routeSuppressed) return;
    const id = String(event.detail?.id || `ai-${++sequence}`);
    if (aiTokens.has(id)) return;
    const token = begin('ai');
    if (token) aiTokens.set(id, token);
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
    if (routeSuppressed) return;
    const id = String(event.detail?.id || `internal-${++sequence}`);
    if (internalTokens.has(id)) return;
    const token = begin('internal');
    if (token) internalTokens.set(id, token);
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

  const syncDomBusy = () => {
    domSyncRaf = 0;
    if (disposed || routeSuppressed) {
      if (domBusyToken) {
        end(domBusyToken);
        domBusyToken = null;
      }
      return;
    }

    const hasBusy = Boolean(document.querySelector(
      '[aria-busy="true"]:not(#bes-global-wave-loader), [data-bes-legacy-internal-loading-hidden]',
    ));

    if (hasBusy && !domBusyToken) domBusyToken = begin('dom-busy');
    if (!hasBusy && domBusyToken) {
      end(domBusyToken);
      domBusyToken = null;
    }
  };

  function requestDomSync() {
    if (domSyncRaf || disposed) return;
    domSyncRaf = window.requestAnimationFrame(syncDomBusy);
  }

  const observer = new MutationObserver(requestDomSync);
  const root = document.getElementById('root') || document.body;
  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-busy', 'class', 'data-bes-legacy-internal-loading-hidden'],
  });

  window.addEventListener('pointerdown', onPointerDown, true);
  window.addEventListener('click', onClick, true);
  window.addEventListener('bes-navigation-start', resetForRouteTransition);
  window.addEventListener('hashchange', resetForRouteTransition);
  window.addEventListener('popstate', resetForRouteTransition);
  window.addEventListener('bes-route-change', resetForRouteTransition);
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
    window.removeEventListener('click', onClick, true);
    window.removeEventListener('bes-navigation-start', resetForRouteTransition);
    window.removeEventListener('hashchange', resetForRouteTransition);
    window.removeEventListener('popstate', resetForRouteTransition);
    window.removeEventListener('bes-route-change', resetForRouteTransition);
    window.removeEventListener('bes-ai-operation-start', onAiStart);
    window.removeEventListener('bes-ai-operation-end', onAiEnd);
    window.removeEventListener('bes-internal-loading-start', onInternalStart);
    window.removeEventListener('bes-internal-loading-end', onInternalEnd);
    window.clearTimeout(showTimer);
    window.clearTimeout(hideTimer);
    if (domSyncRaf) window.cancelAnimationFrame(domSyncRaf);
    if (originalFetch && window.fetch?.name === 'besUnifiedWaveFetch') window.fetch = originalFetch;
    activeTokens.clear();
    aiTokens.clear();
    internalTokens.clear();
    loader.classList.remove('is-visible');
    loader.remove();
    style.remove();
    if (window.BrianWaveLoader) delete window.BrianWaveLoader;
  };
}

export default installGlobalUnifiedWaveLoading;
