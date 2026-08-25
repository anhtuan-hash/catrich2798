/* System-wide font selection is retired.
   This compatibility module keeps older imports working while returning font
   ownership to the base stylesheet and each route/component. */

const STORAGE_KEY = 'bes-global-font-id-v1';
const STYLE_ID = 'bes-global-font-runtime';
const QUICKSAND_LINK_ID = 'bes-global-font-quicksand';
const NATIVE_FONT_ID = 'component-native';

export const SITE_FONT_OPTIONS = [
  {
    id: NATIVE_FONT_ID,
    labelVi: 'Theo giao diện gốc',
    label: 'Component native',
    family: 'inherit',
    noteVi: 'Mỗi trang và thành phần sử dụng kiểu chữ do stylesheet gốc của nó quy định.',
    note: 'Each route and component uses the font declared by its own original stylesheet.',
  },
];

function cleanupGlobalFontRuntime() {
  if (typeof document === 'undefined') return;
  document.getElementById(STYLE_ID)?.remove();
  document.getElementById(QUICKSAND_LINK_ID)?.remove();
  const root = document.documentElement;
  [
    '--font-ui',
    '--metro-font',
    '--english-hub-personal-font',
    '--bes-font-personal',
    '--font-sans',
    '--font-display',
    '--font-body',
  ].forEach((name) => root.style.removeProperty(name));
  root.removeAttribute('data-site-font');
  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* optional */ }
}

export function getSiteFontOption() {
  return SITE_FONT_OPTIONS[0];
}

export function readSiteFontLocal() {
  return NATIVE_FONT_ID;
}

export function applySiteFont() {
  cleanupGlobalFontRuntime();
  return SITE_FONT_OPTIONS[0];
}

export function installSiteFontFromCache() {
  cleanupGlobalFontRuntime();
  return SITE_FONT_OPTIONS[0];
}

export async function waitForSiteFontReady() {
  cleanupGlobalFontRuntime();
  return SITE_FONT_OPTIONS[0];
}

export async function loadSiteFontSetting() {
  cleanupGlobalFontRuntime();
  return SITE_FONT_OPTIONS[0];
}

export async function saveSiteFontSetting() {
  cleanupGlobalFontRuntime();
  return SITE_FONT_OPTIONS[0];
}

export function subscribeSiteFontSetting(_user, listener) {
  cleanupGlobalFontRuntime();
  listener?.(SITE_FONT_OPTIONS[0]);
  return () => {};
}
