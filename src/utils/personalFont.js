const FONT_DATA_KEY = 'bes-personal-font-data-url';
const FONT_NAME_KEY = 'bes-personal-font-file-name';
const STYLE_ID = 'bes-personal-font-runtime';

export const PERSONAL_FONT_FAMILY = 'BrianGesco';
export const PERSONAL_FONT_INTERNAL_NAMES = ['1FTV HF Gesco', '1FTVHFGesco', '1FTV HF Gesco Regular'];

function sanitizeFontUrl(dataUrl) {
  return String(dataUrl || '').replace(/\)/g, '%29').replace(/\(/g, '%28');
}

export function buildPersonalFontCss(dataUrl = '') {
  const runtimeUrl = dataUrl ? `url("${sanitizeFontUrl(dataUrl)}") format('truetype'),` : '';
  return `
@font-face {
  font-family: '${PERSONAL_FONT_FAMILY}';
  src:
    ${runtimeUrl}
    local('1FTV HF Gesco'),
    local('1FTVHFGesco'),
    local('1FTV HF Gesco Regular'),
    local('1FTV-HF-Gesco'),
    url('/bes-fonts/brian-personal-font.ttf?v=12.0.0') format('truetype');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
:root {
  --font-ui: '${PERSONAL_FONT_FAMILY}', '1FTV HF Gesco', '1FTVHFGesco', '1FTV-HF-Gesco', Gesco, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
html, body, #root, .app-shell, .metro-shell { font-family: var(--font-ui) !important; }
body *:not(svg):not(path), body *::before, body *::after, button, input, textarea, select, option, dialog, pre, code, kbd, samp { font-family: var(--font-ui) !important; }
`;
}

function injectRuntimeCss(dataUrl = '') {
  if (typeof document === 'undefined') return false;
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = buildPersonalFontCss(dataUrl);
  document.documentElement.classList.add('brian-personal-font-active');
  document.documentElement.style.setProperty('--font-ui', `'${PERSONAL_FONT_FAMILY}', '1FTV HF Gesco', '1FTVHFGesco', '1FTV-HF-Gesco', Gesco, Inter, ui-sans-serif, system-ui, sans-serif`);
  return true;
}

export function installStoredPersonalFont() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  const dataUrl = window.localStorage.getItem(FONT_DATA_KEY) || '';
  injectRuntimeCss(dataUrl);
  return Boolean(dataUrl);
}

export function getPersonalFontState() {
  if (typeof window === 'undefined') return { active: false, name: '' };
  const dataUrl = window.localStorage.getItem(FONT_DATA_KEY);
  return {
    active: Boolean(dataUrl) || document.documentElement.classList.contains('brian-personal-font-active'),
    name: window.localStorage.getItem(FONT_NAME_KEY) || (dataUrl ? 'BrianGesco.ttf' : '1FTV HF Gesco'),
  };
}

export async function waitForPersonalFontLoad() {
  if (typeof document === 'undefined' || !document.fonts?.load) return false;
  try {
    await document.fonts.load(`16px "${PERSONAL_FONT_FAMILY}"`, 'Brian English Studio');
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
    const valid = /\.(ttf|otf)$/i.test(file.name || '') || /font|octet-stream/.test(file.type || '');
    if (!valid) {
      reject(new Error('Vui lòng chọn file .ttf hoặc .otf'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không đọc được file font'));
    reader.onload = async () => {
      try {
        const dataUrl = String(reader.result || '');
        window.localStorage.setItem(FONT_DATA_KEY, dataUrl);
        window.localStorage.setItem(FONT_NAME_KEY, file.name || '1FTV HF Gesco.ttf');
        injectRuntimeCss(dataUrl);
        await waitForPersonalFontLoad();
        window.dispatchEvent(new CustomEvent('bes-personal-font-updated', { detail: getPersonalFontState() }));
        resolve(getPersonalFontState());
      } catch (err) {
        reject(new Error('Không thể lưu font vào trình duyệt. Hãy giữ font tại public/bes-fonts/brian-personal-font.ttf.'));
      }
    };
    reader.readAsDataURL(file);
  });
}

export function clearStoredPersonalFont() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  window.localStorage.removeItem(FONT_DATA_KEY);
  window.localStorage.removeItem(FONT_NAME_KEY);
  document.getElementById(STYLE_ID)?.remove();
  document.documentElement.classList.remove('brian-personal-font-ready');
  injectRuntimeCss('');
  window.dispatchEvent(new CustomEvent('bes-personal-font-updated', { detail: getPersonalFontState() }));
}
