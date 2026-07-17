import './macosMotion.css';

const STORAGE_KEY = 'bes-macos-motion-v1';
const SETTINGS_CARD_ID = 'bes-macos-motion-settings';
const TOP_LEVEL_ROUTES = ['home', 'apps', 'news', 'games', 'department', 'homeroom', 'library', 'resources', 'settings'];

const DEFAULTS = Object.freeze({
  enabled: true,
  preset: 'balanced',
  routeStyle: 'source-zoom',
  speed: 1,
  intensity: 0.78,
  blur: 18,
  reduceMotion: 'system',
  sourceZoom: true,
  sheets: true,
  popovers: true,
  fullscreen: true,
  missionControl: true,
  spaces: true,
  liquidGlass: true,
  microInteractions: true,
  genie: true,
});

const PRESETS = Object.freeze({
  subtle: {
    speed: 0.82,
    intensity: 0.48,
    blur: 12,
    routeStyle: 'crossfade',
    sourceZoom: true,
    sheets: true,
    popovers: true,
    fullscreen: true,
    missionControl: false,
    spaces: false,
    liquidGlass: true,
    microInteractions: true,
    genie: false,
  },
  balanced: {
    speed: 1,
    intensity: 0.78,
    blur: 18,
    routeStyle: 'source-zoom',
    sourceZoom: true,
    sheets: true,
    popovers: true,
    fullscreen: true,
    missionControl: true,
    spaces: true,
    liquidGlass: true,
    microInteractions: true,
    genie: true,
  },
  cinematic: {
    speed: 1.22,
    intensity: 1,
    blur: 26,
    routeStyle: 'spaces',
    sourceZoom: true,
    sheets: true,
    popovers: true,
    fullscreen: true,
    missionControl: true,
    spaces: true,
    liquidGlass: true,
    microInteractions: true,
    genie: true,
  },
});

const booleanKeys = [
  'enabled', 'sourceZoom', 'sheets', 'popovers', 'fullscreen', 'missionControl',
  'spaces', 'liquidGlass', 'microInteractions', 'genie',
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value)));
}

function normalize(value = {}) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const next = { ...DEFAULTS };
  booleanKeys.forEach((key) => { if (typeof source[key] === 'boolean') next[key] = source[key]; });
  next.preset = ['subtle', 'balanced', 'cinematic', 'custom'].includes(source.preset) ? source.preset : DEFAULTS.preset;
  next.routeStyle = ['source-zoom', 'push', 'crossfade', 'spaces'].includes(source.routeStyle) ? source.routeStyle : DEFAULTS.routeStyle;
  next.speed = clamp(source.speed ?? DEFAULTS.speed, 0.65, 1.5);
  next.intensity = clamp(source.intensity ?? DEFAULTS.intensity, 0.25, 1);
  next.blur = Math.round(clamp(source.blur ?? DEFAULTS.blur, 6, 32));
  next.reduceMotion = ['system', 'always', 'never'].includes(source.reduceMotion) ? source.reduceMotion : DEFAULTS.reduceMotion;
  return next;
}

function readConfig() {
  try {
    return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'));
  } catch {
    return { ...DEFAULTS };
  }
}

let config = readConfig();
let lastRoute = routeFromHash(location.hash);
let lastSource = null;
let sourceZoomRunning = false;
let settingsObserver = null;
let routeObserver = null;
let settingsMountTimer = 0;
let decorateFrame = 0;

function shouldReduceMotion() {
  if (config.reduceMotion === 'always') return true;
  if (config.reduceMotion === 'never') return false;
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

function saveConfig(next, { announce = true } = {}) {
  config = normalize(next);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    localStorage.setItem('bes-motion-mode', config.enabled ? (shouldReduceMotion() ? 'lite' : 'full') : 'off');
    const ui = JSON.parse(localStorage.getItem('bes-ui-preferences-v12') || '{}');
    localStorage.setItem('bes-ui-preferences-v12', JSON.stringify({
      ...ui,
      motionMode: config.enabled ? (shouldReduceMotion() ? 'lite' : 'full') : 'off',
      motionStyle: config.routeStyle === 'source-zoom' ? 'spring' : config.routeStyle === 'spaces' ? 'slide' : config.routeStyle,
      updatedAt: Date.now(),
    }));
  } catch { /* local settings remain active for this session */ }
  applyConfig();
  if (announce) {
    window.dispatchEvent(new CustomEvent('bes:macos-motion-change', { detail: { config: { ...config } } }));
  }
  return config;
}

function applyConfig() {
  const root = document.documentElement;
  const reduced = shouldReduceMotion();
  root.dataset.macosMotion = !config.enabled ? 'off' : reduced ? 'reduced' : 'on';
  root.dataset.macosPreset = config.preset;
  root.dataset.macosRoute = config.routeStyle;
  root.dataset.macosSourceZoom = config.sourceZoom ? 'on' : 'off';
  root.dataset.macosSheets = config.sheets ? 'on' : 'off';
  root.dataset.macosPopovers = config.popovers ? 'on' : 'off';
  root.dataset.macosFullscreen = config.fullscreen ? 'on' : 'off';
  root.dataset.macosMission = config.missionControl ? 'on' : 'off';
  root.dataset.macosSpaces = config.spaces ? 'on' : 'off';
  root.dataset.macosGlass = config.liquidGlass ? 'on' : 'off';
  root.dataset.macosMicro = config.microInteractions ? 'on' : 'off';
  root.dataset.macosGenie = config.genie ? 'on' : 'off';
  root.style.setProperty('--macos-motion-speed', String(config.speed));
  root.style.setProperty('--macos-motion-intensity', String(config.intensity));
  root.style.setProperty('--macos-motion-blur', `${config.blur}px`);
  root.style.setProperty('--macos-duration-fast', `${Math.round(150 * config.speed)}ms`);
  root.style.setProperty('--macos-duration-medium', `${Math.round(300 * config.speed)}ms`);
  root.style.setProperty('--macos-duration-slow', `${Math.round(480 * config.speed)}ms`);
}

function routeFromHash(hash = '') {
  const clean = String(hash || '').replace(/^#\/?/, '').split(/[?&]/)[0];
  if (!clean) return 'home';
  if (clean.startsWith('tool/')) return clean;
  return clean.split('/')[0] || 'home';
}

function routeDepth(route) {
  if (String(route).startsWith('tool/')) return 2;
  return TOP_LEVEL_ROUTES.includes(route) ? 0 : 1;
}

function routeDirection(from, to) {
  const fromDepth = routeDepth(from);
  const toDepth = routeDepth(to);
  if (toDepth > fromDepth) return 'forward';
  if (toDepth < fromDepth) return 'back';
  const fromIndex = TOP_LEVEL_ROUTES.indexOf(from);
  const toIndex = TOP_LEVEL_ROUTES.indexOf(to);
  if (fromIndex >= 0 && toIndex >= 0) return toIndex >= fromIndex ? 'forward' : 'back';
  return 'forward';
}

function findMotionSource(target) {
  const selector = [
    '[data-macos-source]',
    '.app-card', '.app-tile', '.launcher-card', '.home-card', '.recent-app-card',
    '.thpt-lesson', '.tool-card', '.game-card', '.resource-card', '.bui-language-option',
    'a[href*="#/"]', 'button', '[role="button"]',
  ].join(',');
  const element = target?.closest?.(selector);
  if (!element || element.closest(`#${SETTINGS_CARD_ID}`)) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width < 24 || rect.height < 20 || rect.bottom < 0 || rect.top > innerHeight) return null;
  const style = getComputedStyle(element);
  return {
    element,
    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    radius: style.borderRadius || '18px',
    background: style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)' ? style.backgroundColor : 'var(--active-app-accent, #315fc4)',
    color: style.color || '#fff',
    label: String(element.getAttribute('aria-label') || element.querySelector('strong,h2,h3,b')?.textContent || element.textContent || 'Brian').trim().slice(0, 48),
  };
}

function currentMain() {
  return document.querySelector('#bes-main-content') || document.querySelector('main');
}

function animateRouteSurface(from, to) {
  if (!config.enabled || shouldReduceMotion()) return;
  const main = currentMain();
  if (!main) return;
  const direction = routeDirection(from, to);
  main.dataset.macosDirection = direction;
  main.classList.remove('bes-macos-route-enter', 'bes-macos-route-enter-crossfade', 'bes-macos-route-enter-spaces');
  void main.offsetWidth;
  const style = config.routeStyle === 'crossfade'
    ? 'bes-macos-route-enter-crossfade'
    : config.routeStyle === 'spaces'
      ? 'bes-macos-route-enter-spaces'
      : 'bes-macos-route-enter';
  main.classList.add(style);
  window.setTimeout(() => main.classList.remove(style), 720 * config.speed);

  if (to === 'apps' && config.missionControl) window.setTimeout(animateMissionControlCards, 40);
}

function makeSourceZoomLayer(source) {
  const layer = document.createElement('div');
  layer.className = 'bes-macos-source-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = '<div class="bes-macos-source-backdrop"></div><div class="bes-macos-source-card"><span></span></div>';
  const card = layer.querySelector('.bes-macos-source-card');
  card.querySelector('span').textContent = source.label || '';
  Object.assign(card.style, {
    left: `${source.rect.x}px`,
    top: `${source.rect.y}px`,
    width: `${source.rect.width}px`,
    height: `${source.rect.height}px`,
    borderRadius: source.radius,
    background: source.background,
    color: source.color,
  });
  document.body.appendChild(layer);
  return { layer, card };
}

function runSourceZoom(source, navigate) {
  if (!config.enabled || shouldReduceMotion() || !config.sourceZoom || config.routeStyle !== 'source-zoom' || !source) {
    navigate();
    return;
  }
  sourceZoomRunning = true;
  const { layer, card } = makeSourceZoomLayer(source);
  const inset = Math.max(10, 18 * (1 - config.intensity));
  const duration = Math.round(430 * config.speed);
  const animation = card.animate([
    {
      left: `${source.rect.x}px`, top: `${source.rect.y}px`, width: `${source.rect.width}px`, height: `${source.rect.height}px`,
      borderRadius: source.radius, transform: 'translateZ(0) scale(1)', filter: 'saturate(1)',
    },
    {
      left: `${inset}px`, top: `${inset}px`, width: `${innerWidth - inset * 2}px`, height: `${innerHeight - inset * 2}px`,
      borderRadius: `${Math.max(18, 30 * config.intensity)}px`, transform: 'translateZ(0) scale(1)', filter: `saturate(${1 + config.intensity * 0.12})`,
    },
  ], { duration, easing: 'cubic-bezier(.2,.85,.2,1)', fill: 'forwards' });
  layer.querySelector('.bes-macos-source-backdrop')?.animate([
    { opacity: 0 }, { opacity: Math.min(0.42, 0.2 + config.intensity * 0.2) },
  ], { duration: Math.round(duration * 0.72), easing: 'ease-out', fill: 'forwards' });
  window.setTimeout(navigate, Math.round(duration * 0.38));
  animation.finished.catch(() => {}).finally(() => {
    layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: 'ease-out' }).finished.catch(() => {}).finally(() => layer.remove());
    sourceZoomRunning = false;
  });
}

function animateMissionControlCards() {
  if (!config.enabled || shouldReduceMotion() || !config.missionControl) return;
  const selectors = '.app-card,.app-tile,.launcher-card,.tool-card,.game-card,[data-app-card]';
  const cards = [...document.querySelectorAll(selectors)].filter((item) => item.offsetParent !== null).slice(0, 48);
  cards.forEach((card, index) => {
    card.style.setProperty('--macos-card-index', String(index));
    card.classList.remove('bes-macos-mission-card');
    void card.offsetWidth;
    card.classList.add('bes-macos-mission-card');
    window.setTimeout(() => card.classList.remove('bes-macos-mission-card'), 820 * config.speed + index * 18);
  });
}

function createMissionOverlay() {
  if (!config.enabled || shouldReduceMotion() || !config.missionControl) return;
  document.querySelector('.bes-macos-mission-overlay')?.remove();
  const candidates = [...document.querySelectorAll('.app-card,.app-tile,.launcher-card,.tool-card,.recent-app-card')]
    .filter((item) => item.offsetParent !== null).slice(0, 12);
  const overlay = document.createElement('div');
  overlay.className = 'bes-macos-mission-overlay';
  overlay.innerHTML = '<div class="bes-macos-mission-top"><strong>Mission Control</strong><span>Esc</span></div><div class="bes-macos-mission-grid"></div>';
  const grid = overlay.querySelector('.bes-macos-mission-grid');
  if (!candidates.length) {
    grid.innerHTML = '<div class="bes-macos-mission-empty">Mở trang Ứng dụng để xem toàn bộ cửa sổ và ứng dụng đang dùng.</div>';
  } else {
    candidates.forEach((source, index) => {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.style.setProperty('--mission-index', String(index));
      tile.innerHTML = `<span>${String(source.querySelector('.app-icon,.tile-icon')?.textContent || 'BE').trim().slice(0, 3)}</span><strong>${String(source.querySelector('h2,h3,strong')?.textContent || source.getAttribute('aria-label') || 'Ứng dụng').trim()}</strong>`;
      tile.addEventListener('click', () => { overlay.remove(); source.click(); });
      grid.appendChild(tile);
    });
  }
  overlay.addEventListener('click', (event) => { if (event.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('is-open'));
}

function runGenie(target, destination) {
  if (!config.enabled || shouldReduceMotion() || !config.genie) return;
  const element = target instanceof Element ? target : currentMain();
  if (!element) return;
  const rect = element.getBoundingClientRect();
  const dock = destination || { x: innerWidth - 54, y: innerHeight - 28, width: 34, height: 12 };
  const clone = element.cloneNode(true);
  clone.className = 'bes-macos-genie-clone';
  clone.querySelectorAll('iframe,video,audio,canvas').forEach((node) => node.remove());
  Object.assign(clone.style, {
    left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.width}px`, height: `${rect.height}px`,
  });
  document.body.appendChild(clone);
  const dx = dock.x - rect.x;
  const dy = dock.y - rect.y;
  clone.animate([
    { transform: 'translate(0,0) scale(1,1) skewX(0)', opacity: 1, borderRadius: '22px', clipPath: 'inset(0 0 0 0 round 22px)' },
    { transform: `translate(${dx * 0.5}px,${dy * 0.56}px) scale(.58,.72) skewX(-4deg)`, opacity: .88, borderRadius: '20px', clipPath: 'inset(0 7% 0 7% round 20px)' },
    { transform: `translate(${dx}px,${dy}px) scale(${Math.max(.02, dock.width / rect.width)},${Math.max(.015, dock.height / rect.height)}) skewX(0)`, opacity: 0, borderRadius: '999px', clipPath: 'inset(0 22% 0 22% round 999px)' },
  ], { duration: Math.round(520 * config.speed), easing: 'cubic-bezier(.22,.72,.18,1)', fill: 'forwards' })
    .finished.catch(() => {}).finally(() => clone.remove());
}

function showDemoSheet() {
  const existing = document.querySelector('.bes-macos-demo-sheet-wrap');
  if (existing) { existing.remove(); return; }
  const wrap = document.createElement('div');
  wrap.className = 'bes-macos-demo-sheet-wrap';
  wrap.innerHTML = `
    <section class="bes-macos-demo-sheet" role="dialog" aria-modal="true" aria-label="macOS Sheet demo">
      <span class="bes-macos-demo-handle"></span>
      <b>macOS Sheet</b>
      <h3>Chuyển động có điểm tựa và chiều sâu</h3>
      <p>Sheet nổi trên cửa sổ cha, nền được làm mờ nhẹ và nội dung giữ nguyên ngữ cảnh.</p>
      <button type="button">Đóng sheet</button>
    </section>`;
  wrap.addEventListener('click', (event) => { if (event.target === wrap || event.target.closest('button')) wrap.remove(); });
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('is-open'));
}

function showSourceZoomDemo(button) {
  const source = findMotionSource(button) || {
    rect: { x: innerWidth / 2 - 110, y: innerHeight / 2 - 60, width: 220, height: 120 },
    radius: '20px', background: '#315fc4', color: '#fff', label: 'Source Zoom',
  };
  const { layer, card } = makeSourceZoomLayer(source);
  const duration = Math.round(460 * config.speed);
  card.animate([
    { left: `${source.rect.x}px`, top: `${source.rect.y}px`, width: `${source.rect.width}px`, height: `${source.rect.height}px`, borderRadius: source.radius },
    { left: '7vw', top: '8vh', width: '86vw', height: '84vh', borderRadius: '30px' },
    { left: `${source.rect.x}px`, top: `${source.rect.y}px`, width: `${source.rect.width}px`, height: `${source.rect.height}px`, borderRadius: source.radius },
  ], { duration: duration * 2, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' })
    .finished.catch(() => {}).finally(() => layer.remove());
}

function settingsText() {
  const vi = (document.documentElement.dataset.language || 'vi') === 'vi';
  return vi ? {
    title: 'macOS Motion System',
    subtitle: 'Cấu hình chuyển cảnh cửa sổ, điều hướng, Mission Control, Spaces, Liquid Glass và vi chuyển động.',
    master: 'Bật toàn bộ hệ chuyển động',
    masterSub: 'Áp dụng cho Launcher, trang, ứng dụng, sheet, popover và chế độ toàn màn hình.',
    preset: 'Mức hiệu ứng', subtle: 'Tinh tế', balanced: 'Cân bằng', cinematic: 'Điện ảnh',
    route: 'Chuyển trang chính', speed: 'Thời lượng', intensity: 'Cường độ', blur: 'Độ mờ kính', reduce: 'Giảm chuyển động',
    system: 'Theo hệ thống', always: 'Luôn giảm', never: 'Không giảm',
    sourceZoom: 'Source Zoom', sheets: 'Sheet nổi', popovers: 'Popover neo', fullscreen: 'Mở toàn màn hình',
    missionControl: 'Mission Control', spaces: 'Spaces Swipe', liquidGlass: 'Liquid Glass', microInteractions: 'Vi chuyển động', genie: 'Genie Minimize',
    preview: 'Xem thử hiệu ứng', demoZoom: 'Source Zoom', demoSheet: 'Sheet', demoMission: 'Mission Control', demoGenie: 'Genie',
    saved: 'Cấu hình được lưu trên trình duyệt và áp dụng ngay.',
  } : {
    title: 'macOS Motion System',
    subtitle: 'Configure window, navigation, Mission Control, Spaces, Liquid Glass, and micro-interaction motion.',
    master: 'Enable the complete motion system',
    masterSub: 'Apply to the Launcher, pages, apps, sheets, popovers, and full-screen experiences.',
    preset: 'Motion preset', subtle: 'Subtle', balanced: 'Balanced', cinematic: 'Cinematic',
    route: 'Primary navigation', speed: 'Duration', intensity: 'Intensity', blur: 'Glass blur', reduce: 'Reduce motion',
    system: 'Follow system', always: 'Always reduce', never: 'Never reduce',
    sourceZoom: 'Source Zoom', sheets: 'Floating sheets', popovers: 'Anchored popovers', fullscreen: 'Full-screen expand',
    missionControl: 'Mission Control', spaces: 'Spaces Swipe', liquidGlass: 'Liquid Glass', microInteractions: 'Micro interactions', genie: 'Genie Minimize',
    preview: 'Preview motion', demoZoom: 'Source Zoom', demoSheet: 'Sheet', demoMission: 'Mission Control', demoGenie: 'Genie',
    saved: 'Settings are stored in this browser and applied immediately.',
  };
}

function toggleMarkup(key, label, checked) {
  return `<label class="bes-macos-setting-toggle"><span>${label}</span><input type="checkbox" data-motion-key="${key}" ${checked ? 'checked' : ''}><i></i></label>`;
}

function renderSettingsPanel() {
  const dashboard = document.querySelector('.settings-v47-dashboard,[data-ui="settings-grid"]');
  if (!dashboard) return false;
  const language = document.documentElement.dataset.language || 'vi';
  const existing = document.getElementById(SETTINGS_CARD_ID);
  if (existing?.dataset.language === language) return true;
  existing?.remove();
  const t = settingsText();
  const card = document.createElement('article');
  card.id = SETTINGS_CARD_ID;
  card.dataset.language = language;
  card.className = 'settings-v47-card bes-macos-settings-card';
  card.innerHTML = `
    <header class="settings-v47-card bui-settings-card-head bes-macos-settings-head">
      <div class="settings-v47-card-title"><span class="settings-v47-card-icon tone-violet">⌘</span><div><h2>${t.title}</h2><p>${t.subtitle}</p></div></div>
      <span class="bes-macos-status-pill">macOS</span>
    </header>
    <div class="bes-macos-master-row">
      <div><strong>${t.master}</strong><small>${t.masterSub}</small></div>
      <label class="bes-macos-master-switch"><input type="checkbox" data-motion-key="enabled" ${config.enabled ? 'checked' : ''}><i></i></label>
    </div>
    <div class="bes-macos-settings-layout">
      <section class="bes-macos-control-column">
        <label class="bes-macos-field-label">${t.preset}</label>
        <div class="bes-macos-preset-row">
          ${[['subtle', t.subtle], ['balanced', t.balanced], ['cinematic', t.cinematic]].map(([value, label]) => `<button type="button" data-motion-preset="${value}" class="${config.preset === value ? 'is-active' : ''}">${label}</button>`).join('')}
        </div>
        <div class="bes-macos-select-grid">
          <label><span>${t.route}</span><select data-motion-key="routeStyle"><option value="source-zoom">Source Zoom</option><option value="push">Push</option><option value="crossfade">Crossfade</option><option value="spaces">Spaces</option></select></label>
          <label><span>${t.reduce}</span><select data-motion-key="reduceMotion"><option value="system">${t.system}</option><option value="always">${t.always}</option><option value="never">${t.never}</option></select></label>
        </div>
        <div class="bes-macos-range-grid">
          <label><span>${t.speed}<b data-motion-value="speed">${Math.round(config.speed * 100)}%</b></span><input type="range" min="0.65" max="1.5" step="0.05" value="${config.speed}" data-motion-key="speed"></label>
          <label><span>${t.intensity}<b data-motion-value="intensity">${Math.round(config.intensity * 100)}%</b></span><input type="range" min="0.25" max="1" step="0.05" value="${config.intensity}" data-motion-key="intensity"></label>
          <label><span>${t.blur}<b data-motion-value="blur">${config.blur}px</b></span><input type="range" min="6" max="32" step="1" value="${config.blur}" data-motion-key="blur"></label>
        </div>
        <div class="bes-macos-toggle-grid">
          ${toggleMarkup('sourceZoom', t.sourceZoom, config.sourceZoom)}
          ${toggleMarkup('sheets', t.sheets, config.sheets)}
          ${toggleMarkup('popovers', t.popovers, config.popovers)}
          ${toggleMarkup('fullscreen', t.fullscreen, config.fullscreen)}
          ${toggleMarkup('missionControl', t.missionControl, config.missionControl)}
          ${toggleMarkup('spaces', t.spaces, config.spaces)}
          ${toggleMarkup('liquidGlass', t.liquidGlass, config.liquidGlass)}
          ${toggleMarkup('microInteractions', t.microInteractions, config.microInteractions)}
          ${toggleMarkup('genie', t.genie, config.genie)}
        </div>
      </section>
      <aside class="bes-macos-preview-panel">
        <header><span>${t.preview}</span><b>${config.preset}</b></header>
        <div class="bes-macos-preview-desktop">
          <span class="bes-macos-preview-menubar"></span>
          <div class="bes-macos-preview-window window-a"><i></i><i></i><i></i><strong>Brian</strong><small></small><small></small></div>
          <div class="bes-macos-preview-window window-b"><i></i><i></i><i></i><strong>AI</strong><small></small></div>
          <div class="bes-macos-preview-dock"><i></i><i></i><i></i><i></i><i></i></div>
        </div>
        <div class="bes-macos-demo-actions">
          <button type="button" data-motion-demo="zoom">${t.demoZoom}</button>
          <button type="button" data-motion-demo="sheet">${t.demoSheet}</button>
          <button type="button" data-motion-demo="mission">${t.demoMission}</button>
          <button type="button" data-motion-demo="genie">${t.demoGenie}</button>
        </div>
        <p>✓ ${t.saved}</p>
      </aside>
    </div>`;

  const appearance = dashboard.querySelector('.settings-v47-appearance-card');
  if (appearance?.nextSibling) dashboard.insertBefore(card, appearance.nextSibling);
  else dashboard.appendChild(card);

  const routeSelect = card.querySelector('[data-motion-key="routeStyle"]');
  const reduceSelect = card.querySelector('[data-motion-key="reduceMotion"]');
  routeSelect.value = config.routeStyle;
  reduceSelect.value = config.reduceMotion;

  card.addEventListener('change', (event) => {
    const input = event.target.closest('[data-motion-key]');
    if (!input) return;
    const key = input.dataset.motionKey;
    const value = input.type === 'checkbox' ? input.checked : input.type === 'range' ? Number(input.value) : input.value;
    const next = { ...config, [key]: value, preset: key === 'enabled' || key === 'reduceMotion' ? config.preset : 'custom' };
    saveConfig(next);
    card.querySelector('[data-motion-value="speed"]')?.replaceChildren(`${Math.round(config.speed * 100)}%`);
    card.querySelector('[data-motion-value="intensity"]')?.replaceChildren(`${Math.round(config.intensity * 100)}%`);
    card.querySelector('[data-motion-value="blur"]')?.replaceChildren(`${config.blur}px`);
    card.querySelector('.bes-macos-preview-panel header b').textContent = config.preset;
    card.querySelectorAll('[data-motion-preset]').forEach((button) => button.classList.toggle('is-active', button.dataset.motionPreset === config.preset));
  });

  card.addEventListener('input', (event) => {
    const input = event.target.closest('input[type="range"][data-motion-key]');
    if (!input) return;
    const key = input.dataset.motionKey;
    const value = Number(input.value);
    const output = card.querySelector(`[data-motion-value="${key}"]`);
    if (output) output.textContent = key === 'blur' ? `${value}px` : `${Math.round(value * 100)}%`;
  });

  card.addEventListener('click', (event) => {
    const presetButton = event.target.closest('[data-motion-preset]');
    if (presetButton) {
      const preset = presetButton.dataset.motionPreset;
      saveConfig({ ...config, ...PRESETS[preset], preset });
      card.remove();
      renderSettingsPanel();
      return;
    }
    const demo = event.target.closest('[data-motion-demo]');
    if (!demo) return;
    if (demo.dataset.motionDemo === 'zoom') showSourceZoomDemo(demo);
    if (demo.dataset.motionDemo === 'sheet') showDemoSheet();
    if (demo.dataset.motionDemo === 'mission') createMissionOverlay();
    if (demo.dataset.motionDemo === 'genie') runGenie(card.querySelector('.bes-macos-preview-window.window-b'), { x: innerWidth / 2, y: innerHeight - 26, width: 30, height: 10 });
  });
  return true;
}

function scheduleSettingsMount() {
  window.clearTimeout(settingsMountTimer);
  settingsMountTimer = window.setTimeout(() => renderSettingsPanel(), 40);
}

function installSettingsObserver() {
  settingsObserver?.disconnect();
  settingsObserver = new MutationObserver(() => {
    if (routeFromHash(location.hash) === 'settings') scheduleSettingsMount();
  });
  settingsObserver.observe(document.body, { childList: true, subtree: true });
  if (routeFromHash(location.hash) === 'settings') scheduleSettingsMount();
}

function installRouteObserver() {
  routeObserver?.disconnect();
  routeObserver = new MutationObserver((mutations) => {
    if (!config.enabled || shouldReduceMotion()) return;
    const replacedMain = mutations.some((mutation) => [...mutation.addedNodes].some((node) => node instanceof Element && (node.matches?.('#bes-main-content') || node.querySelector?.('#bes-main-content'))));
    if (replacedMain && !sourceZoomRunning) animateRouteSurface(lastRoute, routeFromHash(location.hash));
    scheduleDecorateOverlays();
  });
  routeObserver.observe(document.body, { childList: true, subtree: true });
}

function scheduleDecorateOverlays() {
  if (decorateFrame) return;
  decorateFrame = window.requestAnimationFrame(() => {
    decorateFrame = 0;
    decorateOverlays();
  });
}

function decorateOverlays() {
  if (!config.enabled) return;
  if (config.sheets) {
    document.querySelectorAll('dialog,[role="dialog"],.modal,.sheet,.drawer,.dialog-panel').forEach((element) => element.classList.add('bes-macos-sheet-surface'));
  }
  if (config.popovers) {
    document.querySelectorAll('[popover],.popover,.dropdown-menu,.context-menu,.menu-panel').forEach((element) => element.classList.add('bes-macos-popover-surface'));
  }
}

function installNavigationMotion() {
  document.addEventListener('pointerdown', (event) => { lastSource = findMotionSource(event.target); }, { capture: true, passive: true });
  document.addEventListener('click', (event) => {
    const anchor = event.target.closest?.('a[href*="#/"]');
    if (!anchor || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const href = anchor.getAttribute('href') || '';
    const hashIndex = href.indexOf('#/');
    if (hashIndex < 0) return;
    const nextHash = href.slice(hashIndex);
    if (nextHash === location.hash) return;
    event.preventDefault();
    const from = routeFromHash(location.hash);
    const to = routeFromHash(nextHash);
    runSourceZoom(lastSource || findMotionSource(anchor), () => {
      lastRoute = from;
      location.hash = nextHash;
      window.setTimeout(() => animateRouteSurface(from, to), 24);
    });
  }, { capture: true });

  window.addEventListener('hashchange', () => {
    const next = routeFromHash(location.hash);
    const previous = lastRoute;
    lastRoute = next;
    if (!sourceZoomRunning) window.setTimeout(() => animateRouteSurface(previous, next), 25);
    if (next === 'settings') scheduleSettingsMount();
  });
}

function installSystemHooks() {
  window.addEventListener('fullscreenchange', () => {
    document.documentElement.classList.toggle('bes-macos-fullscreen-active', Boolean(document.fullscreenElement));
  });
  window.addEventListener('bes:macos-mission-control', createMissionOverlay);
  window.addEventListener('bes:macos-minimize', (event) => runGenie(event.detail?.target, event.detail?.destination));
  window.addEventListener('bes:macos-sheet-demo', showDemoSheet);
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest?.('[data-macos-minimize]');
    if (trigger) runGenie(trigger.closest('[data-macos-window]') || currentMain());
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') document.querySelector('.bes-macos-mission-overlay')?.remove();
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'm') {
      event.preventDefault();
      createMissionOverlay();
    }
  });
  const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  media?.addEventListener?.('change', applyConfig);
}

function boot() {
  applyConfig();
  installNavigationMotion();
  installSettingsObserver();
  installRouteObserver();
  installSystemHooks();
  scheduleDecorateOverlays();
  window.__besMacOSMotion = {
    getConfig: () => ({ ...config }),
    setConfig: (patch) => saveConfig({ ...config, ...(patch || {}), preset: 'custom' }),
    applyPreset: (preset) => PRESETS[preset] && saveConfig({ ...config, ...PRESETS[preset], preset }),
    missionControl: createMissionOverlay,
    minimize: runGenie,
    showSheet: showDemoSheet,
  };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
