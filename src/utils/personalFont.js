import fontChunk00 from '../assets/brianGesco/chunk00.js';
import fontChunk01 from '../assets/brianGesco/chunk01.js';
import fontChunk02 from '../assets/brianGesco/chunk02.js';

const FONT_DATA_KEY = 'bes-personal-font-data-url';
const FONT_NAME_KEY = 'bes-personal-font-file-name';
const FONT_VERSION_KEY = 'bes-personal-font-bundled-version';
const STYLE_ID = 'bes-personal-font-runtime';
const EMBEDDED_FONT_VERSION = 'BrianGesco-3-20260728';
const EMBEDDED_FONT_FILE_NAME = 'BrianGesco(3).ttf';
const EMBEDDED_FONT_SHA256 = '31eb09b56ca62096f7af80674050ec96328837eca5d6a9643eaa2aa36d2329a5';
const EMBEDDED_FONT_DATA_URL = `data:font/woff2;base64,${fontChunk00}${fontChunk01}${fontChunk02}`;

export const PERSONAL_FONT_FAMILY = 'BrianGescoExact';
export const PERSONAL_FONT_INTERNAL_NAMES = ['1FTV HF Gesco', '1FTVHFGesco', '1FTV HF Gesco Regular'];

function sanitizeFontUrl(dataUrl) {
  return String(dataUrl || '').replace(/\)/g, '%29').replace(/\(/g, '%28');
}

function resolveFontDataUrl(dataUrl = '') {
  return dataUrl || EMBEDDED_FONT_DATA_URL;
}

export function buildPersonalFontCss(dataUrl = '', { activateAsSiteFont = true } = {}) {
  const exactUrl = sanitizeFontUrl(resolveFontDataUrl(dataUrl));
  const rootVariables = activateAsSiteFont ? `
:root {
  --font-ui: 'BrianGescoExact', 'BrianGesco', '1FTV HF Gesco', '1FTVHFGesco', '1FTV-HF-Gesco', sans-serif;
  --metro-font: var(--font-ui);
  --english-hub-personal-font: var(--font-ui);
}` : '';
  return `
@font-face {
  font-family: 'BrianGescoExact';
  src: url("${exactUrl}") format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: block;
}
@font-face {
  font-family: 'BrianGesco';
  src: url("${exactUrl}") format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: block;
}
${rootVariables}
html, body, #root, .app-shell, .metro-shell { font-family: var(--font-ui) !important; }
body *:not(svg):not(path):not(.material-icons):not(.material-symbols-rounded):not(.material-symbols-outlined):not([class^='fa']):not([class*=' fa']),
body *::before,
body *::after,
button,
input,
textarea,
select,
option,
dialog,
pre,
code,
kbd,
samp {
  font-family: var(--font-ui) !important;
}
.material-icons { font-family: 'Material Icons' !important; }
.material-symbols-rounded { font-family: 'Material Symbols Rounded' !important; }
.material-symbols-outlined { font-family: 'Material Symbols Outlined' !important; }
[class^='fa'], [class*=' fa'] { font-family: 'Font Awesome 6 Free', 'Font Awesome 5 Free', FontAwesome !important; }
`;
}

function injectRuntimeCss(dataUrl = '') {
  if (typeof document === 'undefined') return false;
  const selectedSiteFont = String(document.documentElement.dataset.siteFont || '').trim();
  const activateAsSiteFont = !selectedSiteFont || selectedSiteFont === 'brian-gesco';
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = buildPersonalFontCss(dataUrl, { activateAsSiteFont });
  document.documentElement.classList.add('brian-personal-font-active');
  if (activateAsSiteFont) {
    document.documentElement.style.setProperty('--font-ui', `'BrianGescoExact', 'BrianGesco', '1FTV HF Gesco', '1FTVHFGesco', '1FTV-HF-Gesco', sans-serif`);
    document.documentElement.style.setProperty('--metro-font', 'var(--font-ui)');
    document.documentElement.style.setProperty('--english-hub-personal-font', 'var(--font-ui)');
  }
  document.documentElement.dataset.personalFont = EMBEDDED_FONT_FILE_NAME;
  document.documentElement.dataset.personalFontHash = EMBEDDED_FONT_SHA256;
  return true;
}

export function installStoredPersonalFont() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  try {
    const installedVersion = window.localStorage.getItem(FONT_VERSION_KEY) || '';
    if (installedVersion !== EMBEDDED_FONT_VERSION) {
      window.localStorage.removeItem(FONT_DATA_KEY);
      window.localStorage.removeItem(FONT_NAME_KEY);
      window.localStorage.setItem(FONT_VERSION_KEY, EMBEDDED_FONT_VERSION);
    }
  } catch { /* exact bundled font remains available without storage */ }
  injectRuntimeCss(EMBEDDED_FONT_DATA_URL);
  return true;
}

export function getPersonalFontState() {
  if (typeof window === 'undefined') {
    return { active: true, name: EMBEDDED_FONT_FILE_NAME, sha256: EMBEDDED_FONT_SHA256 };
  }
  return {
    active: true,
    name: EMBEDDED_FONT_FILE_NAME,
    sha256: EMBEDDED_FONT_SHA256,
  };
}

export async function waitForPersonalFontLoad() {
  if (typeof document === 'undefined' || !document.fonts?.load) return false;
  try {
    await document.fonts.load(`400 16px "${PERSONAL_FONT_FAMILY}"`, 'Brian English Studio');
    document.documentElement.classList.add('brian-personal-font-ready');
    return true;
  } catch {
    return false;
  }
}

export function savePersonalFontFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No font file selected'));
      return;
    }
    const valid = /\.(ttf|otf|woff|woff2)$/i.test(file.name || '') || /font|octet-stream/.test(file.type || '');
    if (!valid) {
      reject(new Error('Vui lòng chọn file .ttf, .otf, .woff hoặc .woff2'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không đọc được file font'));
    reader.onload = async () => {
      try {
        const dataUrl = String(reader.result || '');
        window.localStorage.setItem(FONT_DATA_KEY, dataUrl);
        window.localStorage.setItem(FONT_NAME_KEY, file.name || EMBEDDED_FONT_FILE_NAME);
        injectRuntimeCss(dataUrl);
        await waitForPersonalFontLoad();
        window.dispatchEvent(new CustomEvent('bes-personal-font-updated', { detail: getPersonalFontState() }));
        resolve(getPersonalFontState());
      } catch {
        reject(new Error('Không thể nạp file font vào trình duyệt.'));
      }
    };
    reader.readAsDataURL(file);
  });
}

export function clearStoredPersonalFont() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  try {
    window.localStorage.removeItem(FONT_DATA_KEY);
    window.localStorage.removeItem(FONT_NAME_KEY);
    window.localStorage.setItem(FONT_VERSION_KEY, EMBEDDED_FONT_VERSION);
  } catch { /* storage is optional */ }
  document.getElementById(STYLE_ID)?.remove();
  document.documentElement.classList.remove('brian-personal-font-ready');
  injectRuntimeCss(EMBEDDED_FONT_DATA_URL);
  window.dispatchEvent(new CustomEvent('bes-personal-font-updated', { detail: getPersonalFontState() }));
}
