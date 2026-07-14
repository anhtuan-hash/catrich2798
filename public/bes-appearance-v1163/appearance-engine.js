const BES_APPEARANCE_VERSION = '11.6.3';
const STORAGE_KEY = 'bes-appearance-v2';
const CHANNEL_NAME = 'bes-appearance-v2';
const ROOT = document.documentElement;

const PALETTES = {
  brian: { label: 'Brian Blue', value: '#3478F6' },
  cyan: { label: 'Ocean Cyan', value: '#10A7C8' },
  mint: { label: 'Mint', value: '#18A889' },
  emerald: { label: 'Emerald', value: '#20A55A' },
  lime: { label: 'Lime', value: '#78A900' },
  amber: { label: 'Amber', value: '#D88B00' },
  tangerine: { label: 'Tangerine', value: '#F06E1A' },
  coral: { label: 'Coral', value: '#EE5B56' },
  rose: { label: 'Rose', value: '#E84B7A' },
  magenta: { label: 'Magenta', value: '#C13FB4' },
  lavender: { label: 'Lavender', value: '#8A67E8' },
  violet: { label: 'Violet', value: '#7447E8' },
  indigo: { label: 'Indigo', value: '#4D55D8' },
  graphite: { label: 'Graphite', value: '#546171' },
  monochrome: { label: 'Monochrome', value: '#252A31' },
  custom: { label: 'Tùy chọn', value: '#7447E8' },
};

const APP_ACCENTS = [
  [/worksheet|activity|lesson/i, 'tangerine'],
  [/reading|news/i, 'amber'],
  [/game|classroom/i, 'coral'],
  [/department|library|homeroom/i, 'mint'],
  [/grammar|writing|pronunciation/i, 'indigo'],
  [/ai|provider|copilot/i, 'emerald'],
  [/settings|appearance/i, 'violet'],
  [/apps|launcher/i, 'brian'],
];

const DEFAULTS = Object.freeze({
  schema: 2,
  version: BES_APPEARANCE_VERSION,
  theme: 'system',
  accent: 'violet',
  accentCustom: '#7447E8',
  accentMode: 'global',
  accentStrength: 78,
  saturation: 100,
  temperature: 'neutral',
  density: 'comfortable',
  contentWidth: 'wide',
  radius: 'rounded',
  border: 'medium',
  depth: 'soft',
  textScale: 100,
  motion: 'balanced',
  transition: 'metro',
  cardEffect: 'lift',
  background: 'mesh',
  effectIntensity: 54,
  parallax: true,
  reduceMotion: false,
  highContrast: false,
  colorVision: 'none',
  touchTargets: 'normal',
  projector: false,
  batterySaver: false,
  adaptivePerformance: true,
  rememberPerApp: true,
  updatedAt: 0,
});

let state = loadState();
let channel = null;
let studio = null;
let backgroundLayer = null;
let observer = null;
let legacyEnhanceTimer = null;
let performanceTier = 'high';
let lastRoute = location.hash;
let cloudSyncTimer = null;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value)));
}

function safeJson(value, fallback = null) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function normalizeState(candidate = {}) {
  const next = { ...DEFAULTS, ...(candidate && typeof candidate === 'object' ? candidate : {}) };
  if (!PALETTES[next.accent]) next.accent = DEFAULTS.accent;
  if (!/^#[0-9a-f]{6}$/i.test(next.accentCustom || '')) next.accentCustom = DEFAULTS.accentCustom;
  next.accentStrength = clamp(next.accentStrength, 0, 100);
  next.saturation = clamp(next.saturation, 35, 140);
  next.effectIntensity = clamp(next.effectIntensity, 0, 100);
  next.textScale = clamp(next.textScale, 90, 135);
  next.updatedAt = Number(next.updatedAt) || 0;
  next.schema = 2;
  next.version = BES_APPEARANCE_VERSION;
  return next;
}

function loadState() {
  const saved = safeJson(localStorage.getItem(STORAGE_KEY), {});
  return normalizeState(saved);
}

function saveState({ broadcast = true, cloud = true } = {}) {
  state.updatedAt = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (broadcast && channel) channel.postMessage({ type: 'sync', state });
  window.dispatchEvent(new CustomEvent('bes:appearance-changed', {
    detail: { version: BES_APPEARANCE_VERSION, state: { ...state } },
  }));
  if (cloud) requestCloudSync('push');
}

function requestCloudSync(direction) {
  const run = () => {
    try {
      const adapter = window.BESAppearanceCloud;
      if (adapter && direction === 'push' && typeof adapter.save === 'function') {
        Promise.resolve(adapter.save({ ...state })).catch(() => {});
      }
      if (adapter && direction === 'pull' && typeof adapter.load === 'function') {
        Promise.resolve(adapter.load()).then((incoming) => {
          if (incoming) syncFromExternal(incoming.settings || incoming);
        }).catch(() => {});
      }
      window.dispatchEvent(new CustomEvent('bes:appearance-cloud-sync', {
        detail: { direction, state: { ...state }, version: BES_APPEARANCE_VERSION },
      }));
    } catch {}
  };
  if (direction === 'push') {
    clearTimeout(cloudSyncTimer);
    cloudSyncTimer = setTimeout(run, 650);
  } else run();
}

function syncFromExternal(incoming) {
  const normalized = normalizeState(incoming);
  if (normalized.updatedAt && normalized.updatedAt < state.updatedAt) return;
  state = normalized;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  applyAll({ persist: false });
  refreshStudio();
}

function hexToRgb(hex) {
  const normalized = String(hex).replace('#', '').trim();
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return { r: 116, g: 71, b: 232 };
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  const part = (value) => Math.round(clamp(value, 0, 255)).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

function mix(a, b, ratio) {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  const t = clamp(ratio, 0, 1);
  return rgbToHex({
    r: x.r + (y.r - x.r) * t,
    g: x.g + (y.g - x.g) * t,
    b: x.b + (y.b - x.b) * t,
  });
}

function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb({ h, s, l }) {
  h = ((h % 360) + 360) % 360 / 360;
  s = clamp(s, 0, 100) / 100;
  l = clamp(l, 0, 100) / 100;
  if (s === 0) {
    const value = l * 255;
    return { r: value, g: value, b: value };
  }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: hue2rgb(p, q, h + 1 / 3) * 255,
    g: hue2rgb(p, q, h) * 255,
    b: hue2rgb(p, q, h - 1 / 3) * 255,
  };
}

function adjustSaturation(hex, amount) {
  const hsl = rgbToHsl(hexToRgb(hex));
  hsl.s = hsl.s * (clamp(amount, 35, 140) / 100);
  return rgbToHex(hslToRgb(hsl));
}

function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const transform = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b);
}

function contrastRatio(a, b) {
  const l1 = luminance(a), l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function bestTextColor(background) {
  const white = contrastRatio(background, '#FFFFFF');
  const ink = contrastRatio(background, '#111827');
  return white >= ink ? '#FFFFFF' : '#111827';
}

function resolveTheme() {
  if (state.projector) return 'projector';
  if (state.theme === 'system') return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  if (state.theme === 'auto-time') {
    const hour = new Date().getHours();
    return hour >= 18 || hour < 6 ? 'dark' : 'light';
  }
  return state.theme;
}

function routeKey() {
  return `${location.hash || ''} ${location.pathname || ''}`.toLowerCase();
}

function isSettingsRoute() {
  const routeParts = [location.hash || '', location.pathname || ''].map((part) => {
    try { return decodeURIComponent(part).toLowerCase(); } catch { return String(part).toLowerCase(); }
  });
  const settingsPattern = /(?:^|[\/#?&=_-])(settings?|cai-dat|cài-đặt|appearance)(?:$|[\/#?&=_-])/;
  return routeParts.some((part) => settingsPattern.test(part));
}

function cleanupAppearanceUiOutsideSettings() {
  if (isSettingsRoute()) return;
  closeStudio();
  document.querySelectorAll('.bes-quick-appearance').forEach((panel) => panel.remove());
}

function resolveAccentName() {
  if (state.accentMode === 'global') return state.accent;
  const route = routeKey();
  for (const [pattern, accent] of APP_ACCENTS) if (pattern.test(route)) return accent;
  if (state.accentMode === 'smart') {
    const hour = new Date().getHours();
    return hour >= 18 || hour < 6 ? 'lavender' : 'brian';
  }
  return state.accent;
}

function resolveAccentHex() {
  const name = resolveAccentName();
  const base = name === 'custom' ? state.accentCustom : (PALETTES[name]?.value || state.accentCustom);
  return adjustSaturation(base, state.saturation);
}

function detectPerformanceTier() {
  if (state.batterySaver) return 'low';
  if (!state.adaptivePerformance) return 'high';
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4;
  const saveData = Boolean(navigator.connection?.saveData);
  const smallScreen = matchMedia('(max-width: 760px)').matches;
  if (saveData || cores <= 2 || memory <= 2) return 'low';
  if (cores <= 4 || memory <= 4 || smallScreen) return 'medium';
  return 'high';
}

function applyPalette() {
  const accent = resolveAccentHex();
  const { r, g, b } = hexToRgb(accent);
  const strength = state.accentStrength / 100;
  const theme = resolveTheme();
  const isDark = ['dark', 'oled'].includes(theme);
  const scale = {
    50: mix(accent, isDark ? '#111827' : '#FFFFFF', isDark ? 0.86 : 0.92),
    100: mix(accent, isDark ? '#111827' : '#FFFFFF', isDark ? 0.75 : 0.82),
    200: mix(accent, isDark ? '#111827' : '#FFFFFF', isDark ? 0.62 : 0.68),
    300: mix(accent, isDark ? '#111827' : '#FFFFFF', isDark ? 0.42 : 0.48),
    400: mix(accent, isDark ? '#FFFFFF' : '#000000', isDark ? 0.12 : 0.03),
    500: accent,
    600: mix(accent, '#000000', isDark ? 0.02 : 0.12),
    700: mix(accent, '#000000', isDark ? 0.08 : 0.24),
    800: mix(accent, '#000000', isDark ? 0.14 : 0.36),
    900: mix(accent, '#000000', isDark ? 0.22 : 0.5),
  };
  Object.entries(scale).forEach(([key, value]) => ROOT.style.setProperty(`--bes-accent-${key}`, value));
  ROOT.style.setProperty('--bes-accent-rgb', `${r}, ${g}, ${b}`);
  ROOT.style.setProperty('--bes-accent', accent);
  ROOT.style.setProperty('--bes-on-accent', bestTextColor(scale[600]));
  ROOT.style.setProperty('--bes-accent-strength', String(strength));
  ROOT.style.setProperty('--bes-accent-tint-opacity', String(0.04 + strength * 0.16));
  ROOT.style.setProperty('--bes-accent-glow-opacity', String(0.08 + strength * 0.25));
}

function applySurfaceTokens() {
  const theme = resolveTheme();
  const isDark = ['dark', 'oled'].includes(theme);
  const temperature = state.temperature;
  const baseLight = temperature === 'warm' ? '#FFF9EF' : temperature === 'cool' ? '#F3F8FF' : '#F7F8FC';
  const paper = '#FFF8E8';
  const base = theme === 'paper' ? paper : theme === 'oled' ? '#000000' : isDark ? '#10131A' : baseLight;
  const surface = theme === 'paper' ? '#FFFCF5' : theme === 'oled' ? '#070707' : isDark ? '#171B24' : '#FFFFFF';
  const elevated = theme === 'paper' ? '#FFFFFF' : theme === 'oled' ? '#0D0D0D' : isDark ? '#202633' : '#FFFFFF';
  const ink = isDark || theme === 'oled' ? '#F5F7FC' : '#172033';
  const muted = isDark || theme === 'oled' ? '#A9B2C3' : '#61708A';
  const border = isDark || theme === 'oled' ? '#343B49' : '#DCE3EE';
  ROOT.style.setProperty('--bes-page-bg', base);
  ROOT.style.setProperty('--bes-surface', surface);
  ROOT.style.setProperty('--bes-surface-elevated', elevated);
  ROOT.style.setProperty('--bes-ink', ink);
  ROOT.style.setProperty('--bes-muted', muted);
  ROOT.style.setProperty('--bes-border', border);
}

function applyLayoutTokens() {
  const densityMap = {
    spacious: { gap: 24, pad: 24, control: 50 },
    comfortable: { gap: 18, pad: 20, control: 46 },
    compact: { gap: 13, pad: 16, control: 42 },
    ultra: { gap: 9, pad: 12, control: 38 },
  };
  const widthMap = { focused: 1120, wide: 1480, fluid: 1920 };
  const radiusMap = { square: 8, soft: 16, rounded: 24, pill: 32 };
  const borderMap = { thin: 1, medium: 1.5, strong: 2 };
  const density = densityMap[state.density] || densityMap.comfortable;
  ROOT.style.setProperty('--bes-ui-gap', `${density.gap}px`);
  ROOT.style.setProperty('--bes-card-padding', `${density.pad}px`);
  ROOT.style.setProperty('--bes-control-height', `${density.control}px`);
  ROOT.style.setProperty('--bes-content-max', `${widthMap[state.contentWidth] || widthMap.wide}px`);
  ROOT.style.setProperty('--bes-card-radius', `${radiusMap[state.radius] || radiusMap.rounded}px`);
  ROOT.style.setProperty('--bes-border-width', `${borderMap[state.border] || borderMap.medium}px`);
  ROOT.style.setProperty('--bes-text-scale', String(state.textScale / 100));
  ROOT.style.setProperty('--bes-effect-intensity', String(state.effectIntensity / 100));
}

function applyAttributes() {
  performanceTier = detectPerformanceTier();
  const resolvedTheme = resolveTheme();
  const shouldReduceMotion = state.reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches || state.batterySaver;
  const background = performanceTier === 'low' && ['particles', 'aurora', 'blobs'].includes(state.background) ? 'gradient' : state.background;
  ROOT.dataset.besAppearance = BES_APPEARANCE_VERSION;
  ROOT.dataset.besTheme = resolvedTheme;
  ROOT.dataset.theme = resolvedTheme === 'projector' ? 'light' : resolvedTheme;
  ROOT.dataset.besDensity = state.density;
  ROOT.dataset.besDepth = state.depth;
  ROOT.dataset.besMotion = shouldReduceMotion ? 'off' : state.motion;
  ROOT.dataset.besTransition = shouldReduceMotion ? 'none' : state.transition;
  ROOT.dataset.besCardEffect = shouldReduceMotion ? 'none' : state.cardEffect;
  ROOT.dataset.besBackground = state.batterySaver ? 'none' : background;
  ROOT.dataset.besContrast = state.highContrast || state.projector ? 'high' : 'normal';
  ROOT.dataset.besColorVision = state.colorVision;
  ROOT.dataset.besTouchTargets = state.touchTargets;
  ROOT.dataset.besPerformance = performanceTier;
  ROOT.dataset.besProjector = state.projector ? 'true' : 'false';
  ROOT.dataset.besBatterySaver = state.batterySaver ? 'true' : 'false';
  ROOT.classList.toggle('dark', ['dark', 'oled'].includes(resolvedTheme));
}

function ensureBackgroundLayer() {
  if (!document.body) return;
  backgroundLayer = document.querySelector('.bes-appearance-background');
  if (!backgroundLayer) {
    backgroundLayer = document.createElement('div');
    backgroundLayer.className = 'bes-appearance-background';
    backgroundLayer.setAttribute('aria-hidden', 'true');
    document.body.prepend(backgroundLayer);
  }
}

function applyAll({ persist = false } = {}) {
  applyAttributes();
  applyPalette();
  applySurfaceTokens();
  applyLayoutTokens();
  ensureBackgroundLayer();
  if (persist) saveState();
  scheduleLegacyEnhancement();
}

function updateState(patch, { persist = true } = {}) {
  state = normalizeState({ ...state, ...patch });
  applyAll({ persist });
  refreshStudio();
}

function labelForSetting(key, value) {
  const labels = {
    theme: { light: 'Sáng', dark: 'Tối', system: 'Theo hệ thống', 'auto-time': 'Theo thời gian', paper: 'Giấy kem', oled: 'OLED' },
    density: { spacious: 'Thoáng', comfortable: 'Vừa', compact: 'Gọn', ultra: 'Siêu gọn' },
    motion: { off: 'Tắt', subtle: 'Nhẹ', balanced: 'Cân bằng', lively: 'Sinh động', custom: 'Tùy chỉnh' },
  };
  return labels[key]?.[value] || value;
}

function createChoiceGroup(setting, options, current = state[setting]) {
  return `<div class="bes-choice-grid" data-choice-group="${setting}">${options.map(([value, label, icon = '']) => `
    <button type="button" class="bes-choice ${current === value ? 'is-selected' : ''}" data-setting="${setting}" data-value="${value}" aria-pressed="${current === value}">
      <span class="bes-choice-icon">${icon}</span><span>${label}</span>
    </button>`).join('')}</div>`;
}

function createSwitch(setting, title, description) {
  return `<label class="bes-switch-row">
    <span><strong>${title}</strong><small>${description}</small></span>
    <input type="checkbox" data-setting="${setting}" ${state[setting] ? 'checked' : ''}>
    <span class="bes-switch-ui" aria-hidden="true"></span>
  </label>`;
}

function createRange(setting, label, min, max, step = 1, suffix = '%') {
  return `<label class="bes-range-row"><span>${label}<output data-output="${setting}">${state[setting]}${suffix}</output></span>
    <input type="range" min="${min}" max="${max}" step="${step}" value="${state[setting]}" data-setting="${setting}">
  </label>`;
}

function previewMarkup() {
  return `<aside class="bes-preview" aria-label="Xem trước giao diện">
    <div class="bes-preview-window">
      <div class="bes-preview-bar"><i></i><i></i><i></i><span>Brian English Studio</span></div>
      <div class="bes-preview-content">
        <div class="bes-preview-tile"><span>✨</span><strong>Theme Studio</strong><small>Màu nhấn áp dụng toàn hệ thống</small></div>
        <div class="bes-preview-card"><div><strong>Thẻ đang chọn</strong><small>Viền, icon, nút và trạng thái dùng chung một accent.</small></div><span class="bes-preview-check">✓</span></div>
        <div class="bes-preview-actions"><button>Nút chính</button><label><input type="checkbox" checked><span></span></label></div>
      </div>
    </div>
    <div class="bes-preview-status"><span style="background:var(--bes-accent)"></span><b>${PALETTES[resolveAccentName()]?.label || 'Accent'}</b><em>${performanceTier.toUpperCase()}</em></div>
  </aside>`;
}

function studioPanels() {
  const paletteButtons = Object.entries(PALETTES).filter(([key]) => key !== 'custom').map(([key, item]) => `
    <button type="button" class="bes-color-swatch ${resolveAccentName() === key ? 'is-selected' : ''}" data-setting="accent" data-value="${key}" title="${item.label}" aria-label="${item.label}" style="--swatch:${item.value}"><span></span><small>${item.label}</small></button>`).join('');

  return {
    theme: `<section class="bes-panel is-active" data-panel="theme">
      <div class="bes-section-heading"><div><span>01</span><h3>Chủ đề & bề mặt</h3><p>Chọn nền sáng, tối, OLED hoặc giấy kem; toàn bộ surface và độ tương phản sẽ đổi đồng bộ.</p></div></div>
      ${createChoiceGroup('theme', [['light','Sáng','☀️'],['dark','Tối','🌙'],['system','Hệ thống','◐'],['auto-time','Theo thời gian','◴'],['paper','Giấy kem','📄'],['oled','OLED','⬛']])}
      <div class="bes-field-grid">
        <label class="bes-select-row"><span>Nhiệt độ bề mặt<small>Điều chỉnh sắc lạnh, trung tính hoặc ấm.</small></span><select data-setting="temperature"><option value="cool">Lạnh</option><option value="neutral">Trung tính</option><option value="warm">Ấm</option></select></label>
        ${createSwitch('rememberPerApp','Ghi nhớ theo ứng dụng','Cho phép từng khu vực dùng accent nhận diện riêng khi chọn chế độ Theo ứng dụng.')}
      </div>
    </section>`,
    color: `<section class="bes-panel" data-panel="color">
      <div class="bes-section-heading"><div><span>02</span><h3>Màu nhấn hệ thống</h3><p>Màu được sinh thành thang 50–900 và áp dụng cho nút, toggle, slider, focus, badge, tile và loading.</p></div></div>
      <div class="bes-accent-mode">${createChoiceGroup('accentMode', [['global','Toàn hệ thống','◎'],['app','Theo ứng dụng','▦'],['smart','Thông minh','✦']])}</div>
      <div class="bes-palette-grid">${paletteButtons}
        <label class="bes-color-swatch bes-custom-swatch ${state.accent === 'custom' ? 'is-selected' : ''}"><input type="color" value="${state.accentCustom}" data-setting="accentCustom"><span style="--swatch:${state.accentCustom}"></span><small>Tự chọn</small></label>
      </div>
      <div class="bes-field-grid">${createRange('accentStrength','Độ mạnh màu nhấn',0,100)}${createRange('saturation','Độ bão hòa',35,140)}</div>
      <div class="bes-contrast-check"><span class="bes-contrast-dot"></span><div><strong>Tự kiểm tra độ tương phản</strong><small>Màu chữ trên nút được chọn tự động để duy trì khả năng đọc.</small></div><b>${contrastRatio(resolveAccentHex(), bestTextColor(resolveAccentHex())).toFixed(1)}:1</b></div>
    </section>`,
    layout: `<section class="bes-panel" data-panel="layout">
      <div class="bes-section-heading"><div><span>03</span><h3>Bố cục & kích thước</h3><p>Điều chỉnh mật độ, độ rộng, bo góc và cỡ chữ bằng token chung để không làm vỡ layout.</p></div></div>
      <h4>Mật độ hiển thị</h4>${createChoiceGroup('density', [['spacious','Thoáng','↔'],['comfortable','Vừa','▤'],['compact','Gọn','▦'],['ultra','Siêu gọn','▥']])}
      <h4>Chiều rộng nội dung</h4>${createChoiceGroup('contentWidth', [['focused','Tập trung','▯'],['wide','Rộng','▭'],['fluid','Toàn màn hình','▬']])}
      <div class="bes-field-grid">
        <label class="bes-select-row"><span>Độ bo góc<small>Áp dụng cho card, panel, modal và control.</small></span><select data-setting="radius"><option value="square">Vuông</option><option value="soft">Mềm</option><option value="rounded">Bo tròn</option><option value="pill">Rất tròn</option></select></label>
        <label class="bes-select-row"><span>Độ dày đường viền<small>Tăng viền khi dùng máy chiếu hoặc màn hình kém.</small></span><select data-setting="border"><option value="thin">Mảnh</option><option value="medium">Vừa</option><option value="strong">Đậm</option></select></label>
      </div>
      ${createRange('textScale','Tỉ lệ chữ và control',90,135,5)}
    </section>`,
    motion: `<section class="bes-panel" data-panel="motion">
      <div class="bes-section-heading"><div><span>04</span><h3>Chuyển động</h3><p>Motion Engine tự giảm hiệu ứng khi thiết bị yếu hoặc hệ điều hành bật Reduce Motion.</p></div></div>
      <h4>Mức chuyển động</h4>${createChoiceGroup('motion', [['off','Tắt','○'],['subtle','Nhẹ','◌'],['balanced','Cân bằng','◉'],['lively','Sinh động','✺'],['custom','Tùy chỉnh','⚙']])}
      <label class="bes-select-row"><span>Hiệu ứng chuyển trang<small>Áp dụng sau khi route/hash thay đổi.</small></span><select data-setting="transition"><option value="metro">Metro Expand</option><option value="phone">Windows Phone Pivot</option><option value="spring">Material Spring</option><option value="layer">Layer Reveal</option><option value="fade">Fade & Scale</option><option value="stack">Card Stack</option><option value="curtain">Curtain Reveal</option><option value="none">Không hiệu ứng</option></select></label>
      <label class="bes-select-row"><span>Hiệu ứng thẻ<small>Hover và tương tác trên tile/card.</small></span><select data-setting="cardEffect"><option value="lift">Nâng nhẹ</option><option value="tilt">Nghiêng 3D</option><option value="glow">Ánh sáng theo accent</option><option value="gradient">Gradient chuyển động</option><option value="ripple">Ripple khi bấm</option><option value="none">Không hiệu ứng</option></select></label>
      ${createRange('effectIntensity','Cường độ hiệu ứng',0,100)}
      ${createSwitch('reduceMotion','Giảm chuyển động','Tắt parallax, route transition và animation không cần thiết.')}
    </section>`,
    effects: `<section class="bes-panel" data-panel="effects">
      <div class="bes-section-heading"><div><span>05</span><h3>Hiệu ứng & chiều sâu</h3><p>Chọn một ngôn ngữ hiệu ứng duy nhất; hệ thống tự tránh trộn nhiều loại bóng và nền động.</p></div></div>
      <h4>Hiệu ứng nền</h4>${createChoiceGroup('background', [['none','Không','○'],['gradient','Gradient','◒'],['aurora','Aurora','〰'],['mesh','Mesh','⌗'],['blobs','Blurred blobs','●'],['particles','Hạt nhẹ','✦'],['metro-grid','Lưới Metro','▦'],['paper','Paper texture','▧']])}
      <h4>Chiều sâu</h4>${createChoiceGroup('depth', [['flat','Flat','▱'],['soft','Soft shadow','▰'],['material','Material','◆'],['floating','Floating','⬒'],['outline','Outline','□']])}
      <div class="bes-field-grid">
        ${createSwitch('parallax','Parallax nhẹ','Nền và tile phản hồi rất nhẹ theo con trỏ trên thiết bị đủ mạnh.')}
        ${createSwitch('adaptivePerformance','Tự tối ưu hiệu suất','Dựa trên số lõi CPU, bộ nhớ, Save-Data và kích thước màn hình.')}
      </div>
    </section>`,
    access: `<section class="bes-panel" data-panel="access">
      <div class="bes-section-heading"><div><span>06</span><h3>Trợ năng & thích ứng</h3><p>Các chế độ này có quyền ưu tiên cao hơn theme để bảo đảm dễ đọc, dễ chạm và tiết kiệm tài nguyên.</p></div></div>
      <div class="bes-access-grid">
        ${createSwitch('highContrast','Tương phản cao','Viền và focus ring rõ hơn; giảm các tint quá nhạt.')}
        ${createSwitch('projector','Chế độ máy chiếu','Tăng chữ, viền và độ tương phản cho lớp học.')}
        ${createSwitch('batterySaver','Tiết kiệm pin','Tắt nền động, blur nặng và route animation.')}
      </div>
      <div class="bes-field-grid">
        <label class="bes-select-row"><span>Hỗ trợ nhận biết màu<small>Điều chỉnh cách hệ thống phân biệt trạng thái.</small></span><select data-setting="colorVision"><option value="none">Mặc định</option><option value="deuteranopia">Deuteranopia</option><option value="protanopia">Protanopia</option><option value="tritanopia">Tritanopia</option><option value="symbols">Ưu tiên biểu tượng</option></select></label>
        <label class="bes-select-row"><span>Vùng bấm<small>Tăng kích thước control trên tablet và màn hình cảm ứng.</small></span><select data-setting="touchTargets"><option value="normal">Bình thường</option><option value="large">Lớn</option><option value="extra">Rất lớn</option></select></label>
      </div>
      <div class="bes-device-status"><div><span>Hiệu suất hiện tại</span><strong>${performanceTier === 'high' ? 'Cao' : performanceTier === 'medium' ? 'Cân bằng' : 'Tiết kiệm'}</strong></div><div><span>Reduce Motion hệ thống</span><strong>${matchMedia('(prefers-reduced-motion: reduce)').matches ? 'Đang bật' : 'Không bật'}</strong></div><div><span>Save-Data</span><strong>${navigator.connection?.saveData ? 'Đang bật' : 'Không bật'}</strong></div></div>
    </section>`,
  };
}

function openStudio(initialTab = 'theme') {
  if (!isSettingsRoute()) {
    cleanupAppearanceUiOutsideSettings();
    return false;
  }
  if (!studio) buildStudio();
  studio.hidden = false;
  document.body.classList.add('bes-studio-open');
  activateTab(initialTab);
  const dialog = studio.querySelector('[role="dialog"]');
  dialog?.focus();
  return true;
}

function closeStudio() {
  document.body.classList.remove('bes-studio-open');
  if (!studio) return;
  studio.hidden = true;
}

function buildStudio() {
  studio = document.createElement('div');
  studio.className = 'bes-theme-studio';
  studio.hidden = true;
  studio.innerHTML = `<div class="bes-studio-backdrop" data-close-studio></div>
    <div class="bes-studio-dialog" role="dialog" aria-modal="true" aria-label="Brian Appearance Engine V2" tabindex="-1">
      <header class="bes-studio-header"><div><span class="bes-studio-logo">✦</span><div><strong>Brian Appearance Engine V2</strong><small>Accent · Motion · Adaptive Theme System</small></div></div><button type="button" class="bes-studio-close" data-close-studio aria-label="Đóng">×</button></header>
      <div class="bes-studio-shell">
        <nav class="bes-studio-nav" aria-label="Nhóm thiết lập">
          ${[['theme','Chủ đề','◐'],['color','Màu sắc','●'],['layout','Bố cục','▦'],['motion','Chuyển động','➜'],['effects','Hiệu ứng','✦'],['access','Trợ năng','♿']].map(([id,label,icon]) => `<button type="button" data-tab="${id}" class="${id === 'theme' ? 'is-active' : ''}"><span>${icon}</span>${label}</button>`).join('')}
          <div class="bes-studio-nav-status"><i></i><span>Adaptive UI</span><b>${performanceTier.toUpperCase()}</b></div>
        </nav>
        <main class="bes-studio-main"><div class="bes-panel-wrap">${Object.values(studioPanels()).join('')}</div>${previewMarkup()}</main>
      </div>
      <footer class="bes-studio-footer"><div><button type="button" data-action="import">Nhập theme</button><button type="button" data-action="export">Xuất theme</button><input type="file" accept="application/json" data-import-file hidden></div><div><button type="button" class="bes-danger-soft" data-action="reset">Khôi phục mặc định</button><button type="button" class="bes-primary" data-close-studio>Hoàn tất</button></div></footer>
    </div>`;
  document.body.append(studio);
  studio.addEventListener('click', handleStudioClick);
  studio.addEventListener('input', handleStudioInput);
  studio.addEventListener('change', handleStudioInput);
  studio.querySelector('[data-import-file]').addEventListener('change', importThemeFile);
  syncStudioControls();
}

function activateTab(tab) {
  if (!studio) return;
  studio.querySelectorAll('[data-tab]').forEach((button) => button.classList.toggle('is-active', button.dataset.tab === tab));
  studio.querySelectorAll('[data-panel]').forEach((panel) => panel.classList.toggle('is-active', panel.dataset.panel === tab));
}

function handleStudioClick(event) {
  const close = event.target.closest('[data-close-studio]');
  if (close) { closeStudio(); return; }
  const tab = event.target.closest('[data-tab]');
  if (tab) { activateTab(tab.dataset.tab); return; }
  const choice = event.target.closest('[data-setting][data-value]');
  if (choice) {
    const key = choice.dataset.setting;
    const value = choice.dataset.value;
    updateState({ [key]: value });
    return;
  }
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'reset') {
    if (confirm('Khôi phục toàn bộ thiết lập giao diện mặc định?')) {
      state = normalizeState({ ...DEFAULTS, updatedAt: Date.now() });
      applyAll({ persist: true });
      rebuildStudio();
    }
  }
  if (action === 'export') exportTheme();
  if (action === 'import') studio.querySelector('[data-import-file]').click();
}

function handleStudioInput(event) {
  const control = event.target.closest('[data-setting]');
  if (!control || control.dataset.value) return;
  const key = control.dataset.setting;
  let value;
  if (control.type === 'checkbox') value = control.checked;
  else if (control.type === 'range' || control.type === 'number') value = Number(control.value);
  else value = control.value;
  const patch = { [key]: value };
  if (key === 'accentCustom') patch.accent = 'custom';
  updateState(patch);
}

function syncStudioControls() {
  if (!studio) return;
  studio.querySelectorAll('[data-setting]').forEach((control) => {
    const key = control.dataset.setting;
    if (!(key in state)) return;
    if (control.dataset.value) {
      const selected = String(state[key]) === control.dataset.value;
      control.classList.toggle('is-selected', selected);
      control.setAttribute('aria-pressed', String(selected));
    } else if (control.type === 'checkbox') control.checked = Boolean(state[key]);
    else control.value = state[key];
  });
  studio.querySelectorAll('[data-output]').forEach((output) => {
    const key = output.dataset.output;
    output.textContent = `${state[key]}%`;
  });
  studio.querySelectorAll('select[data-setting]').forEach((select) => { select.value = state[select.dataset.setting]; });
  const custom = studio.querySelector('input[data-setting="accentCustom"]');
  if (custom) custom.value = state.accentCustom;
  const status = studio.querySelector('.bes-preview-status');
  if (status) status.innerHTML = `<span style="background:var(--bes-accent)"></span><b>${PALETTES[resolveAccentName()]?.label || 'Accent'}</b><em>${performanceTier.toUpperCase()}</em>`;
  const contrast = studio.querySelector('.bes-contrast-check b');
  if (contrast) contrast.textContent = `${contrastRatio(resolveAccentHex(), bestTextColor(resolveAccentHex())).toFixed(1)}:1`;
}

function refreshStudio() {
  syncStudioControls();
  refreshQuickPanel();
}

function rebuildStudio() {
  const wasOpen = studio && !studio.hidden;
  const active = studio?.querySelector('[data-tab].is-active')?.dataset.tab || 'theme';
  studio?.remove();
  studio = null;
  if (wasOpen) openStudio(active);
}

function exportTheme() {
  const payload = { product: 'Brian English Studio', type: 'appearance-theme', schema: 2, version: BES_APPEARANCE_VERSION, exportedAt: new Date().toISOString(), settings: state };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `brian-theme-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function importThemeFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const parsed = safeJson(String(reader.result), null);
    const candidate = parsed?.settings || parsed;
    if (!candidate || typeof candidate !== 'object') {
      alert('Tệp theme không hợp lệ.');
      return;
    }
    state = normalizeState({ ...candidate, updatedAt: Date.now() });
    applyAll({ persist: true });
    rebuildStudio();
  };
  reader.readAsText(file);
  event.target.value = '';
}

function textMatches(element, patterns) {
  const text = (element?.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
  return patterns.some((pattern) => text.includes(pattern));
}

function findTextElement(patterns) {
  const selectors = 'button,a,label,h1,h2,h3,h4,p,span,div';
  const elements = [...document.querySelectorAll(selectors)];
  return elements.find((element) => element.children.length < 5 && textMatches(element, patterns));
}

function findCard(element) {
  if (!element) return null;
  let node = element;
  let visualFallback = null;
  for (let i = 0; i < 8 && node; i += 1, node = node.parentElement) {
    const className = typeof node.className === 'string' ? node.className.toLowerCase() : '';
    const rect = node.getBoundingClientRect();
    const styles = getComputedStyle(node);
    const radius = parseFloat(styles.borderTopLeftRadius) || 0;
    const hasVisualCard = rect.width > 260 && rect.height > 180 && (radius >= 12 || styles.boxShadow !== 'none' || styles.borderStyle !== 'none');
    if (!visualFallback && hasVisualCard) visualFallback = node;
    if ((className.includes('card') || className.includes('panel') || className.includes('section') || className.includes('setting')) && rect.width > 260) return node;
  }
  return visualFallback || element.parentElement;
}

function enhanceLegacyAppearanceCard() {
  if (!isSettingsRoute()) return;
  const heading = findTextElement(['giao diện', 'appearance']);
  const card = findCard(heading);
  if (!card || card.querySelector('.bes-quick-appearance')) return;

  const panel = document.createElement('div');
  panel.className = 'bes-quick-appearance';
  panel.innerHTML = `<div class="bes-quick-heading"><div><strong>Appearance Engine V2</strong><small>Accent toàn hệ thống · Motion · Adaptive UI</small></div><button type="button" data-bes-open-studio>Mở nâng cao ↗</button></div>
    <div class="bes-quick-swatches" aria-label="Bảng màu nhấn mở rộng">${Object.entries(PALETTES).filter(([key]) => !['custom','monochrome'].includes(key)).map(([key,item]) => `<button type="button" data-bes-quick-accent="${key}" title="${item.label}" style="--quick-color:${item.value}"></button>`).join('')}<label title="Tự chọn"><input type="color" value="${state.accentCustom}" data-bes-quick-custom><span style="--quick-color:${state.accentCustom}">+</span></label></div>
    <div class="bes-quick-controls"><button type="button" data-bes-quick-tab="motion">➜ ${labelForSetting('motion', state.motion)}</button><button type="button" data-bes-quick-tab="effects">✦ ${state.background}</button><button type="button" data-bes-quick-tab="access">⚡ ${performanceTier === 'high' ? 'Hiệu suất cao' : performanceTier === 'medium' ? 'Cân bằng' : 'Tiết kiệm'}</button></div>`;
  card.append(panel);
  panel.addEventListener('click', (event) => {
    const open = event.target.closest('[data-bes-open-studio]');
    if (open) { openStudio('theme'); return; }
    const tab = event.target.closest('[data-bes-quick-tab]');
    if (tab) { openStudio(tab.dataset.besQuickTab); return; }
    const swatch = event.target.closest('[data-bes-quick-accent]');
    if (swatch) updateState({ accent: swatch.dataset.besQuickAccent, accentMode: 'global' });
  });
  panel.querySelector('[data-bes-quick-custom]').addEventListener('input', (event) => updateState({ accent: 'custom', accentCustom: event.target.value, accentMode: 'global' }));
  decorateLegacyControls(card);
}

function normalizedControlText(element) {
  return (element?.textContent || '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function controlTextEquals(element, labels) {
  const text = normalizedControlText(element);
  return labels.some((label) => text === label.toLowerCase());
}

function decorateLegacyControls(scope = document) {
  if (!isSettingsRoute()) return;

  const exactAdvancedLabels = ['thiết lập giao diện nâng cao', 'advanced appearance'];
  const clickableCandidates = [...scope.querySelectorAll('button,a,[role="button"]')];
  let advanced = clickableCandidates.find((element) => controlTextEquals(element, exactAdvancedLabels));

  if (!advanced) {
    const leaf = [...scope.querySelectorAll('span,div,p')].find((element) =>
      element.children.length === 0 && controlTextEquals(element, exactAdvancedLabels));
    advanced = leaf?.closest('button,a,[role="button"]') || leaf || null;
  }

  if (advanced && !advanced.dataset.besBound) {
    advanced.dataset.besBound = 'true';
    advanced.style.cursor = 'pointer';
    advanced.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      openStudio('theme');
    });
  }

  const mappings = [
    { labels: ['tối'], patch: { theme: 'dark' } },
    { labels: ['sáng'], patch: { theme: 'light' } },
    { labels: ['tự động'], patch: { theme: 'system' } },
    { labels: ['thoáng'], patch: { density: 'spacious' } },
    { labels: ['vừa'], patch: { density: 'comfortable' } },
    { labels: ['gọn'], patch: { density: 'compact' } },
  ];

  [...scope.querySelectorAll('button,[role="button"]')].forEach((button) => {
    if (button.dataset.besBound) return;
    const mapping = mappings.find((item) => controlTextEquals(button, item.labels));
    if (!mapping) return;
    button.dataset.besBound = 'true';
    button.addEventListener('click', () => updateState(mapping.patch));
  });
}

function refreshQuickPanel() {
  const panel = document.querySelector('.bes-quick-appearance');
  if (!panel) return;
  panel.querySelectorAll('[data-bes-quick-accent]').forEach((button) => button.classList.toggle('is-selected', button.dataset.besQuickAccent === resolveAccentName()));
  const buttons = panel.querySelectorAll('[data-bes-quick-tab]');
  if (buttons[0]) buttons[0].innerHTML = `➜ ${labelForSetting('motion', state.motion)}`;
  if (buttons[1]) buttons[1].innerHTML = `✦ ${state.background}`;
  if (buttons[2]) buttons[2].innerHTML = `⚡ ${performanceTier === 'high' ? 'Hiệu suất cao' : performanceTier === 'medium' ? 'Cân bằng' : 'Tiết kiệm'}`;
}

function scheduleLegacyEnhancement() {
  clearTimeout(legacyEnhanceTimer);
  legacyEnhanceTimer = setTimeout(() => {
    if (!isSettingsRoute()) {
      cleanupAppearanceUiOutsideSettings();
      return;
    }
    enhanceLegacyAppearanceCard();
    refreshQuickPanel();
  }, 120);
}

function routeTarget() {
  const candidates = [document.querySelector('main'), document.querySelector('[role="main"]'), document.querySelector('#root > div'), document.querySelector('#app > div')];
  return candidates.find((node) => node && node.getBoundingClientRect().width > 200);
}

function routeKeyframes(type) {
  const frames = {
    metro: [{ opacity: 0, transform: 'translateY(14px) scale(.965)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }],
    phone: [{ opacity: 0, transform: 'perspective(900px) translateX(42px) rotateY(-5deg)' }, { opacity: 1, transform: 'perspective(900px) translateX(0) rotateY(0)' }],
    spring: [{ opacity: 0, transform: 'translateY(20px) scale(.97)' }, { opacity: 1, transform: 'translateY(-3px) scale(1.006)', offset: .72 }, { opacity: 1, transform: 'translateY(0) scale(1)' }],
    layer: [{ opacity: .3, clipPath: 'circle(8% at 50% 10%)' }, { opacity: 1, clipPath: 'circle(150% at 50% 10%)' }],
    fade: [{ opacity: 0, transform: 'scale(.985)' }, { opacity: 1, transform: 'scale(1)' }],
    stack: [{ opacity: 0, transform: 'translateY(34px) rotateX(2deg)' }, { opacity: 1, transform: 'translateY(0) rotateX(0)' }],
    curtain: [{ opacity: .5, clipPath: 'inset(0 50% 0 50%)' }, { opacity: 1, clipPath: 'inset(0 0 0 0)' }],
  };
  return frames[type] || frames.fade;
}

function animateRoute() {
  applyAll({ persist: false });
  if (ROOT.dataset.besTransition === 'none') return;
  requestAnimationFrame(() => {
    const target = routeTarget();
    if (!target || typeof target.animate !== 'function') return;
    const motionMultiplier = state.motion === 'subtle' ? .72 : state.motion === 'lively' ? 1.25 : 1;
    const duration = Math.round((240 + state.effectIntensity * 2.2) * motionMultiplier);
    target.animate(routeKeyframes(ROOT.dataset.besTransition), { duration, easing: state.motion === 'lively' ? 'cubic-bezier(.2,.9,.2,1.12)' : 'cubic-bezier(.2,.8,.2,1)', fill: 'both' });
  });
}

function isInteractiveCard(element) {
  if (!element) return false;
  const className = typeof element.className === 'string' ? element.className.toLowerCase() : '';
  return /card|tile|panel|app-item|module/.test(className) && element.getBoundingClientRect().width >= 120;
}

function onPointerMove(event) {
  if (ROOT.dataset.besCardEffect !== 'tilt' || ROOT.dataset.besPerformance === 'low') return;
  const card = event.target.closest('[class*="card"],[class*="tile"],[class*="panel"]');
  if (!isInteractiveCard(card)) return;
  const rect = card.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - .5;
  const y = (event.clientY - rect.top) / rect.height - .5;
  card.style.setProperty('--bes-tilt-y', `${x * 5 * (state.effectIntensity / 100)}deg`);
  card.style.setProperty('--bes-tilt-x', `${-y * 5 * (state.effectIntensity / 100)}deg`);
  card.dataset.besTiltActive = 'true';
}

function onPointerOut(event) {
  const card = event.target.closest?.('[data-bes-tilt-active]');
  if (!card || card.contains(event.relatedTarget)) return;
  card.style.removeProperty('--bes-tilt-x');
  card.style.removeProperty('--bes-tilt-y');
  delete card.dataset.besTiltActive;
}

function onGlobalClick(event) {
  if (ROOT.dataset.besCardEffect !== 'ripple') return;
  const target = event.target.closest('button,[role="button"],a,[class*="card"],[class*="tile"]');
  if (!target || target.closest('.bes-theme-studio')) return;
  const rect = target.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.className = 'bes-global-ripple';
  const size = Math.max(rect.width, rect.height) * 1.25;
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
  target.classList.add('bes-ripple-host');
  target.append(ripple);
  ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
}

function onParallax(event) {
  if (!backgroundLayer || !state.parallax || ROOT.dataset.besPerformance === 'low' || ROOT.dataset.besMotion === 'off') return;
  const x = (event.clientX / innerWidth - .5) * 12;
  const y = (event.clientY / innerHeight - .5) * 12;
  backgroundLayer.style.setProperty('--bes-parallax-x', `${x}px`);
  backgroundLayer.style.setProperty('--bes-parallax-y', `${y}px`);
}

function setupSync() {
  if ('BroadcastChannel' in window) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.addEventListener('message', (event) => {
      if (event.data?.type === 'sync') syncFromExternal(event.data.state);
    });
  }
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY && event.newValue) syncFromExternal(safeJson(event.newValue, {}));
  });
  window.addEventListener('bes:appearance-cloud-load', (event) => {
    if (event.detail?.state) syncFromExternal(event.detail.state);
  });
}

function setupObservers() {
  observer = new MutationObserver(() => {
    if (isSettingsRoute()) scheduleLegacyEnhancement();
    else cleanupAppearanceUiOutsideSettings();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (state.theme === 'system') applyAll(); });
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', () => applyAll());
  window.addEventListener('hashchange', () => {
    if (location.hash !== lastRoute) {
      lastRoute = location.hash;
      if (isSettingsRoute()) scheduleLegacyEnhancement();
      else cleanupAppearanceUiOutsideSettings();
      animateRoute();
    }
  });
  window.addEventListener('popstate', () => {
    if (isSettingsRoute()) scheduleLegacyEnhancement();
    else cleanupAppearanceUiOutsideSettings();
  });
  window.addEventListener('resize', () => {
    const nextTier = detectPerformanceTier();
    if (nextTier !== performanceTier) applyAll();
  }, { passive: true });
  document.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('pointerout', onPointerOut, { passive: true });
  document.addEventListener('click', onGlobalClick);
  window.addEventListener('pointermove', onParallax, { passive: true });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && studio && !studio.hidden) closeStudio();
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'a' && isSettingsRoute()) {
      event.preventDefault();
      openStudio('theme');
    }
  });
}

function exposeApi() {
  window.BESAppearance = Object.freeze({
    version: BES_APPEARANCE_VERSION,
    open: openStudio,
    close: closeStudio,
    getState: () => ({ ...state }),
    setState: (patch) => updateState(patch),
    reset: () => { state = normalizeState({ ...DEFAULTS, updatedAt: Date.now() }); applyAll({ persist: true }); rebuildStudio(); },
    apply: () => applyAll({ persist: false }),
    palettes: { ...PALETTES },
  });
}

function init() {
  applyAll({ persist: false });
  setupSync();
  setupObservers();
  exposeApi();
  if (isSettingsRoute()) scheduleLegacyEnhancement();
  else cleanupAppearanceUiOutsideSettings();
  requestCloudSync('pull');
  document.dispatchEvent(new CustomEvent('bes:appearance-ready', { detail: { version: BES_APPEARANCE_VERSION } }));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
