/* Document-wide personal-font injection is retired.
   Keep the historical API so older imports remain safe, but do not register or
   force a font family over route/component typography. */

const FONT_DATA_KEY = 'bes-personal-font-data-url';
const FONT_NAME_KEY = 'bes-personal-font-file-name';
const FONT_VERSION_KEY = 'bes-personal-font-bundled-version';
const STYLE_ID = 'bes-personal-font-runtime';

export const PERSONAL_FONT_FAMILY = 'BrianGescoExact';
export const PERSONAL_FONT_INTERNAL_NAMES = ['1FTV HF Gesco', '1FTVHFGesco', '1FTV HF Gesco Regular'];

function cleanupPersonalFontRuntime() {
  if (typeof document === 'undefined') return;
  document.getElementById(STYLE_ID)?.remove();
  const root = document.documentElement;
  root.classList.remove('brian-personal-font-active', 'brian-personal-font-ready');
  root.removeAttribute('data-personal-font');
  root.removeAttribute('data-personal-font-hash');
  root.style.removeProperty('--english-hub-personal-font');
  try {
    window.localStorage.removeItem(FONT_DATA_KEY);
    window.localStorage.removeItem(FONT_NAME_KEY);
    window.localStorage.removeItem(FONT_VERSION_KEY);
  } catch {
    /* storage is optional */
  }
}

export function buildPersonalFontCss() {
  return '';
}

export function installStoredPersonalFont() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  cleanupPersonalFontRuntime();
  return false;
}

export function getPersonalFontState() {
  return { active: false, name: '', sha256: '' };
}

export async function waitForPersonalFontLoad() {
  return false;
}

export function savePersonalFontFile() {
  return Promise.reject(new Error('Cơ chế font chữ toàn hệ thống đã được gỡ; mỗi giao diện sử dụng font gốc của nó.'));
}

export function clearStoredPersonalFont() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  cleanupPersonalFontRuntime();
  window.dispatchEvent(new CustomEvent('bes-personal-font-updated', { detail: getPersonalFontState() }));
}
