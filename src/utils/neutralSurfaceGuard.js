const STYLE_ID = 'bes-neutral-surface-contract-v1';
const STORAGE_KEY = 'bes-appearance-v2';
const ROOT = document.documentElement;
const LIGHT_TOKENS = {
  '--bes-page-bg': '#f7f9fc',
  '--bes-theme-page': '#f7f9fc',
  '--bes-theme-page-soft': '#eef3f8',
  '--bes-theme-surface': '#ffffff',
  '--bes-theme-surface-low': '#ffffff',
  '--bes-theme-surface-mid': '#f1f3f4',
  '--bes-theme-surface-high': '#e8eaed',
  '--bes-surface': '#ffffff',
  '--bes-surface-elevated': '#ffffff',
  '--page': '#f7f9fc',
  '--bg': '#f7f9fc',
  '--bg-2': '#eef3f8',
  '--surface': '#ffffff',
  '--surface-2': '#f1f3f4',
  '--surface-3': '#e8eaed',
  '--panel': '#ffffff',
  '--panel-2': '#f1f3f4',
  '--card': '#ffffff',
  '--card-2': '#f1f3f4',
  '--burs-surface': '#ffffff',
  '--burs-soft': '#f5f7fb',
  '--g-surface': '#ffffff',
};

const DARK_TOKENS = {
  '--bes-page-bg': '#111318',
  '--bes-theme-page': '#111318',
  '--bes-theme-page-soft': '#15171c',
  '--bes-theme-surface': '#1b1d22',
  '--bes-theme-surface-low': '#15171c',
  '--bes-theme-surface-mid': '#24262c',
  '--bes-theme-surface-high': '#303238',
  '--bes-surface': '#1b1d22',
  '--bes-surface-elevated': '#24262c',
  '--page': '#111318',
  '--bg': '#111318',
  '--bg-2': '#15171c',
  '--surface': '#1b1d22',
  '--surface-2': '#24262c',
  '--surface-3': '#303238',
  '--panel': '#1b1d22',
  '--panel-2': '#24262c',
  '--card': '#1b1d22',
  '--card-2': '#24262c',
  '--burs-surface': '#1b1d22',
  '--burs-soft': '#24262c',
  '--g-surface': '#1b1d22',
};

const OLED_TOKENS = {
  ...DARK_TOKENS,
  '--bes-page-bg': '#000000',
  '--bes-theme-page': '#000000',
  '--bes-theme-page-soft': '#070707',
  '--bes-theme-surface': '#0d0d0d',
  '--bes-theme-surface-low': '#070707',
  '--bes-theme-surface-mid': '#151515',
  '--bes-theme-surface-high': '#202020',
  '--bes-surface': '#0d0d0d',
  '--bes-surface-elevated': '#151515',
  '--page': '#000000',
  '--bg': '#000000',
  '--bg-2': '#070707',
  '--surface': '#0d0d0d',
  '--surface-2': '#151515',
  '--surface-3': '#202020',
  '--panel': '#0d0d0d',
  '--panel-2': '#151515',
  '--card': '#0d0d0d',
  '--card-2': '#151515',
  '--burs-surface': '#0d0d0d',
  '--burs-soft': '#151515',
  '--g-surface': '#0d0d0d',
};

const CANDIDATE_SELECTOR = [
  'body', '#root', 'main', 'section', 'article', 'aside', 'dialog', '[role="dialog"]',
  'label', 'input', 'textarea', 'select',
  '[class*="card"]', '[class*="panel"]', '[class*="surface"]', '[class*="paper"]',
  '[class*="sheet"]', '[class*="workspace"]', '[class*="drawer"]', '[class*="modal"]',
  '[class*="page"]', '[class*="form"]', '[class*="field"]',
].join(',');

const SKIP_SELECTOR = [
  'button', 'a', '[role="button"]', '[role="tab"]',
  'svg', 'path', 'canvas', 'img', 'video', 'audio',
  '[class*="badge"]', '[class*="chip"]', '[class*="pill"]', '[class*="toast"]',
  '[class*="warning"]', '[class*="danger"]', '[class*="success"]', '[class*="error"]',
  '[class*="accent"]', '[class*="status"]', '[class*="illustration"]', '[class*="icon"]',
].join(',');

const PAGE_SELECTOR = [
  'html', 'body', '#root', '.app-shell', '.metro-shell', '.metro-clean-system',
  '#bes-main-content', '.wp8-page-stage', '.wp8-door-page',
  '[class$="-page"]', '[class*="-page "]', '[class$="-workspace"]', '[class*="-workspace "]',
].join(',');

const CONTRACT_CSS = `
html:not([data-theme="dark"]):not([data-bes-theme="dark"]):not([data-bes-theme="oled"]) {
  color-scheme: light !important;
}

html:not([data-theme="dark"]):not([data-bes-theme="dark"]):not([data-bes-theme="oled"]) :where(
  input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]),
  textarea
) {
  background-color: #ffffff !important;
  background-image: none !important;
  background-blend-mode: normal !important;
  color: #1f1f1f !important;
  -webkit-text-fill-color: #1f1f1f !important;
  caret-color: #0b57d0 !important;
  filter: none !important;
  mix-blend-mode: normal !important;
  color-scheme: light !important;
}

html:not([data-theme="dark"]):not([data-bes-theme="dark"]):not([data-bes-theme="oled"]) select {
  background-color: #ffffff !important;
  color: #1f1f1f !important;
  -webkit-text-fill-color: #1f1f1f !important;
  color-scheme: light !important;
}

html:not([data-theme="dark"]):not([data-bes-theme="dark"]):not([data-bes-theme="oled"]) :where(
  input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]),
  textarea,
  select
):is(:hover, :focus, :focus-visible, :active) {
  background-color: #ffffff !important;
}

html:not([data-theme="dark"]):not([data-bes-theme="dark"]):not([data-bes-theme="oled"]) :where(input, textarea):-webkit-autofill,
html:not([data-theme="dark"]):not([data-bes-theme="dark"]):not([data-bes-theme="oled"]) :where(input, textarea):-webkit-autofill:hover,
html:not([data-theme="dark"]):not([data-bes-theme="dark"]):not([data-bes-theme="oled"]) :where(input, textarea):-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 1000px #ffffff inset !important;
  box-shadow: 0 0 0 1000px #ffffff inset !important;
  -webkit-text-fill-color: #1f1f1f !important;
}

html[data-bes-background="paper"] .bes-appearance-background {
  display: none !important;
}

html[data-bes-background="mesh"] .bes-appearance-background {
  background:
    radial-gradient(circle at 12% 15%, rgba(var(--bes-accent-rgb), .20), transparent 26%),
    radial-gradient(circle at 82% 18%, rgba(35, 203, 166, .12), transparent 24%),
    radial-gradient(circle at 76% 84%, rgba(66, 133, 244, .10), transparent 30%),
    radial-gradient(circle at 20% 78%, rgba(77, 85, 216, .10), transparent 25%) !important;
}

[data-bes-neutralized-surface="surface"] {
  background-color: #ffffff !important;
  background-image: none !important;
  background-blend-mode: normal !important;
}

[data-bes-neutralized-surface="page"] {
  background-color: #f7f9fc !important;
  background-image: none !important;
  background-blend-mode: normal !important;
}
`;

let installed = false;
let applyingAppearance = false;
let scanFrame = 0;

function getThemeMode() {
  const values = [ROOT.dataset.besTheme, ROOT.dataset.theme].map((value) => String(value || '').toLowerCase());
  if (values.includes('oled')) return 'oled';
  if (values.includes('dark') || ROOT.classList.contains('dark')) return 'dark';
  return 'light';
}

function isDarkTheme() {
  return getThemeMode() !== 'light';
}

function ensureStyle() {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CONTRACT_CSS;
    document.head.appendChild(style);
  }
}

function normalizeStoredAppearance() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const state = JSON.parse(raw);
    if (!state || typeof state !== 'object') return;
    let changed = false;
    if (state.theme === 'paper') { state.theme = 'light'; changed = true; }
    if (state.temperature === 'warm') { state.temperature = 'neutral'; changed = true; }
    if (state.background === 'paper') { state.background = 'none'; changed = true; }
    if (changed) {
      state.updatedAt = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch { /* invalid appearance state is ignored */ }
}

function normalizeAppearanceApi() {
  if (applyingAppearance || !window.BESAppearance?.getState || !window.BESAppearance?.setState) return;
  const state = window.BESAppearance.getState();
  const patch = {};
  if (state.theme === 'paper') patch.theme = 'light';
  if (state.temperature === 'warm') patch.temperature = 'neutral';
  if (state.background === 'paper') patch.background = 'none';
  if (!Object.keys(patch).length) return;
  applyingAppearance = true;
  try { window.BESAppearance.setState(patch); } finally {
    queueMicrotask(() => { applyingAppearance = false; });
  }
}

function applyNeutralTokens() {
  const mode = getThemeMode();
  const tokens = mode === 'oled' ? OLED_TOKENS : mode === 'dark' ? DARK_TOKENS : LIGHT_TOKENS;
  Object.entries(tokens).forEach(([property, value]) => {
    if (ROOT.style.getPropertyValue(property).trim() !== value || ROOT.style.getPropertyPriority(property) !== 'important') {
      ROOT.style.setProperty(property, value, 'important');
    }
  });
  if (ROOT.dataset.besTheme === 'paper') ROOT.dataset.besTheme = 'light';
  if (ROOT.dataset.theme === 'paper') ROOT.dataset.theme = 'light';
  if (ROOT.dataset.besBackground === 'paper') ROOT.dataset.besBackground = 'none';
}

function parseRgb(value) {
  const match = String(value || '').match(/rgba?\(\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)(?:\s*[,\/]\s*(\d*\.?\d+))?\s*\)/i);
  if (!match) return null;
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a: match[4] == null ? 1 : Number(match[4]) };
}

function isWarmNearWhite(value) {
  const color = parseRgb(value);
  if (!color || color.a < .45) return false;
  return color.r >= 245 && color.g >= 238 && color.b >= 220 && color.r - color.b >= 5 && color.g - color.b >= 2;
}

function shouldSkip(element) {
  return element.matches?.(SKIP_SELECTOR) || Boolean(element.closest?.('.bes-theme-studio'));
}

function neutralizeElement(element) {
  if (!(element instanceof Element) || shouldSkip(element)) return;
  const backgroundColor = getComputedStyle(element).backgroundColor;
  if (isWarmNearWhite(backgroundColor)) {
    element.dataset.besNeutralizedSurface = element.matches(PAGE_SELECTOR) ? 'page' : 'surface';
  } else if (element.hasAttribute('data-bes-neutralized-surface')) {
    delete element.dataset.besNeutralizedSurface;
  }
}

function removeWarmControls(scope = document) {
  scope.querySelectorAll?.('[data-setting="theme"][data-value="paper"], [data-setting="background"][data-value="paper"], select[data-setting="temperature"] option[value="warm"]').forEach((element) => element.remove());
  scope.querySelectorAll?.('.bes-section-heading p').forEach((paragraph) => {
    if (/giấy kem/i.test(paragraph.textContent || '')) {
      paragraph.textContent = (paragraph.textContent || '').replace(/,?\s*hoặc giấy kem/gi, '').replace(/giấy kem,?\s*/gi, '');
    }
  });
}

function scanWarmSurfaces() {
  cancelAnimationFrame(scanFrame);
  scanFrame = requestAnimationFrame(() => {
    scanFrame = 0;
    applyNeutralTokens();
    removeWarmControls();
    if (isDarkTheme()) {
      document.querySelectorAll('[data-bes-neutralized-surface]').forEach((element) => delete element.dataset.besNeutralizedSurface);
      return;
    }
    document.querySelectorAll(CANDIDATE_SELECTOR).forEach(neutralizeElement);
  });
}

function enforceNeutralSystem() {
  normalizeStoredAppearance();
  normalizeAppearanceApi();
  applyNeutralTokens();
  scanWarmSurfaces();
}

export function installNeutralSurfaceGuard() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  ensureStyle();
  enforceNeutralSystem();

  const contentObserver = new MutationObserver((records) => {
    if (records.some((record) => record.addedNodes.length > 0)) scanWarmSurfaces();
  });
  contentObserver.observe(document.documentElement, { childList: true, subtree: true });

  const themeObserver = new MutationObserver(enforceNeutralSystem);
  themeObserver.observe(ROOT, {
    attributes: true,
    attributeFilter: ['class', 'data-theme', 'data-bes-theme', 'data-bes-background'],
  });

  ['hashchange', 'popstate', 'load', 'bes:appearance-ready', 'bes:appearance-changed'].forEach((eventName) => {
    window.addEventListener(eventName, enforceNeutralSystem);
  });
}
