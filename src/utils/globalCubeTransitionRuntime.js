import '../styles/GlobalCubeTransitionRuntime.css';

const EVENT_NAME = 'bes-navigation-start';
const OVERLAY_ID = 'bes-global-cube-transition';
const SKIP_FLAG = '__besCubeComplete';
const VISIBLE_MS = 1280;
const FADE_MS = 120;

let running = false;
let pendingNavigation = null;
let clickSnapshot = null;
let installed = false;

function internalTarget(value = '') {
  const target = String(value || '').trim();
  return target.startsWith('#/') ? target : '';
}

function buildOverlay() {
  document.getElementById(OVERLAY_ID)?.remove();

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');
  overlay.setAttribute('aria-label', 'Đang mở trang');

  const loader = document.createElement('div');
  loader.className = 'bes3d-loader';

  for (let index = 0; index < 8; index += 1) {
    const box = document.createElement('div');
    box.className = `bes3d-box bes3d-box${index}`;
    box.appendChild(document.createElement('div'));
    loader.appendChild(box);
  }

  const ground = document.createElement('div');
  ground.className = 'bes3d-ground';
  ground.appendChild(document.createElement('div'));
  loader.appendChild(ground);

  overlay.appendChild(loader);
  document.body.appendChild(overlay);
  document.documentElement.classList.add('bes-global-cube-active');
  return overlay;
}

function replayNavigation(detail) {
  const target = internalTarget(detail?.target);
  if (!target) return;

  const replay = new CustomEvent(EVENT_NAME, {
    cancelable: true,
    detail: {
      ...(detail && typeof detail === 'object' ? detail : {}),
      target,
      [SKIP_FLAG]: true,
    },
  });
  window.dispatchEvent(replay);

  // If no transition owner handles the replay, preserve normal navigation.
  if (!replay.defaultPrevented && window.location.hash !== target) {
    window.location.hash = target;
  }
}

function play(detail) {
  if (running) {
    pendingNavigation = detail || pendingNavigation;
    return;
  }

  running = true;
  pendingNavigation = detail || null;
  const overlay = buildOverlay();

  window.setTimeout(() => {
    overlay.classList.add('is-leaving');
    window.setTimeout(() => {
      overlay.remove();
      document.documentElement.classList.remove('bes-global-cube-active');
      running = false;
      const next = pendingNavigation;
      pendingNavigation = null;
      if (next) replayNavigation(next);
    }, FADE_MS);
  }, VISIBLE_MS);
}

function onNavigationStart(event) {
  const detail = event?.detail || {};
  if (detail[SKIP_FLAG]) return;

  const target = internalTarget(detail.target);
  if (!target || target === window.location.hash) return;

  event.preventDefault();
  event.stopImmediatePropagation?.();
  play({ ...detail, target });
}

function onClickCapture(event) {
  clickSnapshot = null;
  if (running) return;
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const sourceEl = event.target?.closest?.('a,button,[role="button"],[data-route],[data-target]') || null;
  clickSnapshot = {
    hash: window.location.hash,
    href: window.location.href,
    sourceEl,
  };

  const anchor = event.target?.closest?.('a[href]');
  if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;

  const target = internalTarget(anchor.getAttribute('href'));
  if (!target || target === window.location.hash) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  clickSnapshot = null;
  play({
    target,
    from: window.location.hash || '#/home',
    sourceEl: anchor,
    label: anchor.getAttribute('aria-label') || anchor.textContent || '',
    color: '',
    source: 'global-cube-anchor',
  });
}

function onClickBubble() {
  const snapshot = clickSnapshot;
  clickSnapshot = null;
  if (!snapshot || running) return;

  queueMicrotask(() => {
    if (running) return;
    const target = internalTarget(window.location.hash);
    if (!target || target === snapshot.hash) return;

    // Legacy controls may mutate location.hash directly. Restore the old URL
    // before the queued hashchange paint, run the cube, then replay navigation.
    try {
      window.history.replaceState(window.history.state, '', snapshot.href);
    } catch {
      try {
        window.history.replaceState(
          window.history.state,
          '',
          `${window.location.pathname}${window.location.search}${snapshot.hash || ''}`,
        );
      } catch { /* optional */ }
    }

    play({
      target,
      from: snapshot.hash || '#/home',
      sourceEl: snapshot.sourceEl,
      label: snapshot.sourceEl?.getAttribute?.('aria-label') || snapshot.sourceEl?.textContent || '',
      color: '',
      source: 'global-cube-legacy-hash',
    });
  });
}

export function installGlobalCubeTransitionRuntime() {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return;
  installed = true;
  window.addEventListener(EVENT_NAME, onNavigationStart);
  document.addEventListener('click', onClickCapture, true);
  document.addEventListener('click', onClickBubble, false);

  window.BESCubeTransition = Object.freeze({
    play: (detail = {}) => play(detail),
    isRunning: () => running,
  });
}

installGlobalCubeTransitionRuntime();
