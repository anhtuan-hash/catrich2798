const LOADER_ID = 'bes-wp8-global-loader';
const STYLE_ID = 'bes-wp8-global-loader-style';
const DEFAULT_DELAY_MS = 140;
const MIN_VISIBLE_MS = 460;

let sequence = 0;
let visibleSince = 0;
let revealTimer = 0;
let hideTimer = 0;
let bootToken = '';
let routeToken = '';
let routeEndTimer = 0;
const activeTokens = new Map();

function ensureStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
#${LOADER_ID}{position:fixed;top:max(10px,env(safe-area-inset-top));left:50%;z-index:2147483647;width:min(190px,48vw);height:14px;transform:translateX(-50%);pointer-events:none;opacity:0;visibility:hidden;contain:layout style paint;isolation:isolate}
#${LOADER_ID}[data-active="true"]{opacity:1;visibility:visible}
#${LOADER_ID} .bes-wp8-loader-track{position:relative;width:100%;height:100%;overflow:hidden}
#${LOADER_ID} .bes-wp8-loader-dot{position:absolute;top:3px;left:0;width:7px;height:7px;border-radius:50%;background:#1ba1e2;box-shadow:0 0 0 1px rgba(255,255,255,.18);opacity:0;will-change:transform,opacity;animation:bes-wp8-loader-flow 2.05s cubic-bezier(.12,.62,.38,1) infinite!important;transition:none!important}
#${LOADER_ID} .bes-wp8-loader-dot:nth-child(1){animation-delay:0s!important}
#${LOADER_ID} .bes-wp8-loader-dot:nth-child(2){animation-delay:.14s!important}
#${LOADER_ID} .bes-wp8-loader-dot:nth-child(3){animation-delay:.28s!important}
#${LOADER_ID} .bes-wp8-loader-dot:nth-child(4){animation-delay:.42s!important}
#${LOADER_ID} .bes-wp8-loader-dot:nth-child(5){animation-delay:.56s!important}
@keyframes bes-wp8-loader-flow{0%{transform:translate3d(-14px,0,0) scale(.86);opacity:0}9%{opacity:1}36%{transform:translate3d(52px,0,0) scale(1);opacity:1}58%{transform:translate3d(94px,0,0) scale(1);opacity:1}88%{opacity:1}100%{transform:translate3d(198px,0,0) scale(.86);opacity:0}}
html[data-theme="dark"] #${LOADER_ID} .bes-wp8-loader-dot,html[data-bes-theme="dark"] #${LOADER_ID} .bes-wp8-loader-dot{background:#29b6f6;box-shadow:0 0 8px rgba(41,182,246,.28)}
@media(max-width:720px){#${LOADER_ID}{top:max(7px,env(safe-area-inset-top));width:min(154px,54vw)}#${LOADER_ID} .bes-wp8-loader-dot{width:6px;height:6px}}
@media(prefers-reduced-motion:reduce){#${LOADER_ID} .bes-wp8-loader-dot{animation-duration:2.4s!important}}
`;
  document.head.appendChild(style);
}

function ensureLoader() {
  if (typeof document === 'undefined') return null;
  ensureStyles();
  let loader = document.getElementById(LOADER_ID);
  if (loader) return loader;

  loader = document.createElement('div');
  loader.id = LOADER_ID;
  loader.dataset.active = 'false';
  loader.setAttribute('role', 'status');
  loader.setAttribute('aria-live', 'polite');
  loader.setAttribute('aria-label', 'Đang tải');

  const track = document.createElement('div');
  track.className = 'bes-wp8-loader-track';
  for (let index = 0; index < 5; index += 1) {
    const dot = document.createElement('span');
    dot.className = 'bes-wp8-loader-dot';
    track.appendChild(dot);
  }
  loader.appendChild(track);

  if (document.body) document.body.appendChild(loader);
  else document.documentElement.appendChild(loader);
  return loader;
}

function showNow(label = 'Đang tải') {
  window.clearTimeout(hideTimer);
  hideTimer = 0;
  const loader = ensureLoader();
  if (!loader) return;
  loader.dataset.active = 'true';
  loader.setAttribute('aria-label', label || 'Đang tải');
  if (!visibleSince) visibleSince = performance.now();
}

function hideWhenAllowed() {
  window.clearTimeout(revealTimer);
  revealTimer = 0;
  if (activeTokens.size) return;

  const elapsed = visibleSince ? performance.now() - visibleSince : MIN_VISIBLE_MS;
  const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
  window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => {
    if (activeTokens.size) return;
    const loader = ensureLoader();
    if (loader) loader.dataset.active = 'false';
    visibleSince = 0;
    hideTimer = 0;
  }, remaining);
}

function begin(label = 'Đang tải', options = {}) {
  const token = `bes-wp8-load-${Date.now()}-${++sequence}`;
  const delay = options.immediate ? 0 : Math.max(0, Number(options.delay ?? DEFAULT_DELAY_MS));
  activeTokens.set(token, { label: String(label || 'Đang tải'), startedAt: performance.now() });
  window.clearTimeout(hideTimer);
  hideTimer = 0;

  const loader = ensureLoader();
  if (loader?.dataset.active === 'true') {
    loader.setAttribute('aria-label', label || 'Đang tải');
    return token;
  }

  if (delay === 0) {
    showNow(label);
    return token;
  }

  if (!revealTimer) {
    revealTimer = window.setTimeout(() => {
      revealTimer = 0;
      if (!activeTokens.size) return;
      const latest = [...activeTokens.values()].at(-1);
      showNow(latest?.label || label);
    }, delay);
  }
  return token;
}

function end(token) {
  if (!token) return;
  activeTokens.delete(token);
  hideWhenAllowed();
}

function wrap(promise, label = 'Đang tải', options = {}) {
  const token = begin(label, options);
  return Promise.resolve(promise).finally(() => end(token));
}

function patchFetch() {
  if (typeof window.fetch !== 'function' || window.fetch.__besWp8LoadingWrapped) return;
  const previousFetch = window.fetch;
  const wrappedFetch = function besWp8LoadingFetch(...args) {
    const token = begin('Đang tải dữ liệu', { delay: DEFAULT_DELAY_MS });
    let result;
    try {
      result = previousFetch.apply(this, args);
    } catch (error) {
      end(token);
      throw error;
    }
    return Promise.resolve(result).finally(() => end(token));
  };
  Object.defineProperty(wrappedFetch, '__besWp8LoadingWrapped', { value: true });
  Object.defineProperty(wrappedFetch, '__besWp8PreviousFetch', { value: previousFetch });
  window.fetch = wrappedFetch;
}

function patchXmlHttpRequest() {
  if (typeof XMLHttpRequest === 'undefined') return;
  const proto = XMLHttpRequest.prototype;
  if (proto.send?.__besWp8LoadingWrapped) return;
  const previousSend = proto.send;
  const wrappedSend = function besWp8LoadingXhrSend(...args) {
    const token = begin('Đang tải dữ liệu', { delay: DEFAULT_DELAY_MS });
    let completed = false;
    const finish = () => {
      if (completed) return;
      completed = true;
      end(token);
    };
    this.addEventListener('loadend', finish, { once: true });
    this.addEventListener('abort', finish, { once: true });
    this.addEventListener('error', finish, { once: true });
    try {
      return previousSend.apply(this, args);
    } catch (error) {
      finish();
      throw error;
    }
  };
  Object.defineProperty(wrappedSend, '__besWp8LoadingWrapped', { value: true });
  proto.send = wrappedSend;
}

function markRouteTransition() {
  if (routeToken) end(routeToken);
  window.clearTimeout(routeEndTimer);
  routeToken = begin('Đang chuyển trang', { delay: 45 });
  routeEndTimer = window.setTimeout(() => {
    end(routeToken);
    routeToken = '';
    routeEndTimer = 0;
  }, 620);
}

function patchHistory() {
  if (window.__besWp8HistoryPatched) return;
  window.__besWp8HistoryPatched = true;
  ['pushState', 'replaceState'].forEach((method) => {
    const previous = history[method];
    if (typeof previous !== 'function') return;
    history[method] = function besWp8HistoryTransition(...args) {
      const result = previous.apply(this, args);
      markRouteTransition();
      return result;
    };
  });
  window.addEventListener('hashchange', markRouteTransition);
  window.addEventListener('popstate', markRouteTransition);
}

function releaseBootWhenApplicationPaints() {
  const root = document.getElementById('root');
  if (!root) {
    window.setTimeout(releaseBootWhenApplicationPaints, 30);
    return;
  }

  let released = false;
  const release = () => {
    if (released || !root.firstElementChild) return;
    released = true;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      end(bootToken);
      bootToken = '';
    }));
  };

  if (root.firstElementChild) {
    release();
    return;
  }

  const observer = new MutationObserver(() => {
    if (!root.firstElementChild) return;
    observer.disconnect();
    release();
  });
  observer.observe(root, { childList: true });
}

function installGlobalLoadingIndicator() {
  if (typeof window === 'undefined' || window.__BES_WP8_LOADING_INSTALLED__) return;
  window.__BES_WP8_LOADING_INSTALLED__ = true;

  ensureLoader();
  bootToken = begin('Đang khởi động Brian English', { immediate: true });
  patchFetch();
  patchXmlHttpRequest();
  patchHistory();
  releaseBootWhenApplicationPaints();

  window.BESLoading = Object.freeze({
    begin,
    end,
    wrap,
    show: (label = 'Đang tải') => begin(label, { immediate: true }),
    activeCount: () => activeTokens.size,
  });
}

installGlobalLoadingIndicator();

export { begin, end, wrap, installGlobalLoadingIndicator };
