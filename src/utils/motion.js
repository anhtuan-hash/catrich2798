import '../styles/route-transition-book-v1167.css';

const DEFAULT_COLOR = '#0078d4';
const ROUTE_TRANSITION_KEY = 'bes-route-transition-style';
const VALID_ROUTE_TRANSITIONS = new Set(['metro', 'book']);

export const ROUTE_MOTION = Object.freeze({
  metro: Object.freeze({ navigateDelay: 260, sourceReleaseDelay: 420, overlayLifetime: 520 }),
  book: Object.freeze({ navigateDelay: 430, sourceReleaseDelay: 780, overlayLifetime: 920 }),
});

let activeSource = null;
let activeBookLayer = null;
let navigateTimer = 0;
let releaseTimer = 0;
let bookCleanupTimer = 0;
let settingsObserver = null;
let settingsMountFrame = 0;

function getMotionPreference() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 'off';
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 'off';
  const htmlMotion = document.documentElement.dataset.motion;
  const shell = document.querySelector('.metro-clean-system');
  if (shell?.dataset.performance === 'low' || document.documentElement.dataset.performance === 'low') return 'off';
  const shellMotion = shell?.dataset.motion;
  return shellMotion || htmlMotion || 'lite';
}

export function getRouteTransitionStyle() {
  if (typeof window === 'undefined') return 'metro';
  try {
    const stored = localStorage.getItem(ROUTE_TRANSITION_KEY);
    return VALID_ROUTE_TRANSITIONS.has(stored) ? stored : 'metro';
  } catch {
    return 'metro';
  }
}

export function setRouteTransitionStyle(value) {
  const next = VALID_ROUTE_TRANSITIONS.has(value) ? value : 'metro';
  if (typeof document !== 'undefined') document.documentElement.dataset.routeTransition = next;
  if (typeof window !== 'undefined') {
    try { localStorage.setItem(ROUTE_TRANSITION_KEY, next); } catch { /* optional preference */ }
    window.dispatchEvent(new CustomEvent('bes-route-transition-style-changed', { detail: { style: next } }));
  }
  updateTransitionSettingsControl();
  return next;
}

export function shouldAnimateRoute() {
  return getMotionPreference() !== 'off';
}

export function elementRect(sourceEl) {
  const rect = sourceEl?.getBoundingClientRect?.();
  if (!rect || rect.width <= 0 || rect.height <= 0) return null;
  return {
    x: Math.round(rect.left),
    y: Math.round(rect.top),
    w: Math.round(rect.width),
    h: Math.round(rect.height),
  };
}

function clearBookLayer() {
  window.clearTimeout(bookCleanupTimer);
  activeBookLayer?.remove();
  activeBookLayer = null;
}

function clearActiveLaunch() {
  window.clearTimeout(navigateTimer);
  window.clearTimeout(releaseTimer);
  activeSource?.classList.remove('is-launching');
  activeSource = null;
  clearBookLayer();
}

function createBookLayer({ label = 'BR', color = DEFAULT_COLOR, preview = false } = {}) {
  if (typeof document === 'undefined') return null;
  clearBookLayer();

  const layer = document.createElement('div');
  layer.className = 'bes-book-transition-layer';
  layer.dataset.preview = preview ? 'true' : 'false';
  layer.style.setProperty('--bes-book-accent', color || DEFAULT_COLOR);
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = `
    <div class="bes-book-transition-backdrop"></div>
    <div class="bes-book-transition-stage">
      <div class="bes-book-transition-curtain"></div>
      <div class="bes-book-transition-shadow"></div>
      <div class="bes-book-transition-sheet bes-book-transition-sheet-under" aria-hidden="true"></div>
      <div class="bes-book-transition-sheet bes-book-transition-sheet-main" aria-hidden="true">
        <div class="bes-book-transition-face bes-book-transition-front">
          <span class="bes-book-transition-brand">BRIAN ENGLISH</span>
          <strong>${String(label || 'BR').slice(0, 3).toUpperCase()}</strong>
          <small>PAGE TRANSITION</small>
          <i></i>
        </div>
        <div class="bes-book-transition-face bes-book-transition-back">
          <span>BRIAN ENGLISH STUDIO</span>
        </div>
      </div>
      <div class="bes-book-transition-spine"></div>
    </div>`;

  document.body.appendChild(layer);
  activeBookLayer = layer;
  requestAnimationFrame(() => layer.classList.add('is-running'));
  bookCleanupTimer = window.setTimeout(clearBookLayer, ROUTE_MOTION.book.overlayLifetime + 80);
  return layer;
}

export function previewRouteTransition(style = getRouteTransitionStyle()) {
  if (typeof window === 'undefined' || !shouldAnimateRoute()) return false;
  const next = VALID_ROUTE_TRANSITIONS.has(style) ? style : 'metro';
  if (next === 'book') {
    createBookLayer({ label: 'BOOK', color: '#7eaa43', preview: true });
    return true;
  }
  window.dispatchEvent(new CustomEvent('bes-tile-launch', {
    detail: { color: '#315fc4', label: 'OLD', rect: null, duration: ROUTE_MOTION.metro.overlayLifetime, transitionStyle: 'metro' },
  }));
  return true;
}

export function launchRoute({ target, label = 'GO', color = DEFAULT_COLOR, sourceEl = null, navigate } = {}) {
  if (!target || typeof window === 'undefined') return;
  const externalTarget = /^https?:\/\//i.test(String(target)) || String(target).startsWith('/');
  const go = typeof navigate === 'function'
    ? navigate
    : () => { if (externalTarget) window.location.assign(target); else window.location.hash = target; };

  clearActiveLaunch();

  if (window.location.hash === target) {
    sourceEl?.classList.add('is-launching');
    releaseTimer = window.setTimeout(() => sourceEl?.classList.remove('is-launching'), 140);
    return;
  }

  if (!shouldAnimateRoute()) {
    go();
    return;
  }

  const transitionStyle = getRouteTransitionStyle();
  const timing = ROUTE_MOTION[transitionStyle] || ROUTE_MOTION.metro;
  activeSource = sourceEl;
  sourceEl?.classList.add('is-launching');

  if (transitionStyle === 'book') {
    createBookLayer({ label, color });
  } else {
    const detail = {
      color: color || DEFAULT_COLOR,
      label: String(label || 'GO').slice(0, 3).toUpperCase(),
      rect: elementRect(sourceEl),
      duration: timing.overlayLifetime,
      transitionStyle,
    };
    window.requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent('bes-tile-launch', { detail }));
    });
  }

  navigateTimer = window.setTimeout(go, timing.navigateDelay);
  releaseTimer = window.setTimeout(() => {
    sourceEl?.classList.remove('is-launching');
    if (activeSource === sourceEl) activeSource = null;
  }, timing.sourceReleaseDelay);
}

function transitionControlCopy() {
  const vi = document.documentElement.lang !== 'en';
  return vi ? {
    eyebrow: 'CHUYỂN CẢNH TRANG',
    title: 'Kiểu chuyển cảnh',
    description: 'Giữ hiệu ứng Metro hiện tại hoặc chuyển sang hiệu ứng lật sách 3D mượt mà.',
    metro: 'Metro hiện tại',
    metroSub: 'Thẻ ứng dụng phóng lớn như trước',
    book: 'Lật sách',
    bookSub: 'Trang giấy khép lại rồi mở sang nội dung mới',
    preview: 'Xem thử',
    active: 'Đang dùng',
    note: 'Tự động tắt khi thiết bị bật Giảm chuyển động hoặc hồ sơ hiệu năng thấp.',
  } : {
    eyebrow: 'PAGE TRANSITION',
    title: 'Transition style',
    description: 'Keep the current Metro transition or use a smooth 3D page-turn effect.',
    metro: 'Current Metro',
    metroSub: 'The existing expanding app-tile transition',
    book: 'Book flip',
    bookSub: 'A paper page closes and opens onto the next view',
    preview: 'Preview',
    active: 'Active',
    note: 'Automatically disabled by Reduce Motion or the low-performance profile.',
  };
}

function updateTransitionSettingsControl() {
  if (typeof document === 'undefined') return;
  const control = document.querySelector('.bes-transition-style-settings');
  if (!control) return;
  const selected = getRouteTransitionStyle();
  control.querySelectorAll('[data-transition-style]').forEach((button) => {
    const active = button.dataset.transitionStyle === selected;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
    const status = button.querySelector('.bes-transition-option-status');
    if (status) status.hidden = !active;
  });
}

function mountTransitionSettingsControl() {
  if (typeof document === 'undefined') return;
  const appearanceCard = document.querySelector('.settings-v47-appearance-card');
  if (!appearanceCard || appearanceCard.querySelector('.bes-transition-style-settings')) return;

  const copy = transitionControlCopy();
  const control = document.createElement('section');
  control.className = 'bes-transition-style-settings';
  control.setAttribute('aria-label', copy.title);
  control.innerHTML = `
    <header>
      <div><span>${copy.eyebrow}</span><strong>${copy.title}</strong><small>${copy.description}</small></div>
      <button type="button" class="bes-transition-preview">▶ ${copy.preview}</button>
    </header>
    <div class="bes-transition-options">
      <button type="button" class="bes-transition-option" data-transition-style="metro" aria-pressed="false">
        <span class="bes-transition-mini bes-transition-mini-metro"><i></i><i></i><i></i></span>
        <span><strong>${copy.metro}</strong><small>${copy.metroSub}</small></span>
        <em class="bes-transition-option-status" hidden>✓ ${copy.active}</em>
      </button>
      <button type="button" class="bes-transition-option" data-transition-style="book" aria-pressed="false">
        <span class="bes-transition-mini bes-transition-mini-book"><i></i><b></b></span>
        <span><strong>${copy.book}</strong><small>${copy.bookSub}</small></span>
        <em class="bes-transition-option-status" hidden>✓ ${copy.active}</em>
      </button>
    </div>
    <p>ⓘ ${copy.note}</p>`;

  control.querySelectorAll('[data-transition-style]').forEach((button) => {
    button.addEventListener('click', () => setRouteTransitionStyle(button.dataset.transitionStyle));
  });
  control.querySelector('.bes-transition-preview')?.addEventListener('click', () => previewRouteTransition(getRouteTransitionStyle()));

  const advancedButton = appearanceCard.querySelector('.settings-v47-text-button');
  if (advancedButton) appearanceCard.insertBefore(control, advancedButton);
  else appearanceCard.appendChild(control);
  updateTransitionSettingsControl();
}

function scheduleSettingsControlMount() {
  if (settingsMountFrame || typeof window === 'undefined') return;
  settingsMountFrame = window.requestAnimationFrame(() => {
    settingsMountFrame = 0;
    mountTransitionSettingsControl();
  });
}

function installTransitionSettingsBridge() {
  if (typeof window === 'undefined' || typeof document === 'undefined' || settingsObserver) return;
  document.documentElement.dataset.routeTransition = getRouteTransitionStyle();
  const start = () => {
    scheduleSettingsControlMount();
    settingsObserver = new MutationObserver(scheduleSettingsControlMount);
    settingsObserver.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('hashchange', scheduleSettingsControlMount);
    window.addEventListener('bes-route-transition-style-changed', updateTransitionSettingsControl);
  };
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
}

installTransitionSettingsBridge();
