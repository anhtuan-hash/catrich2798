import '../styles/brian-gesco-global.css';

const FONT_DATA_KEY = 'bes-personal-font-data-url';
const FONT_NAME_KEY = 'bes-personal-font-file-name';
const STYLE_ID = 'bes-personal-font-runtime';

export const PERSONAL_FONT_FAMILY = 'BrianGesco';
export const PERSONAL_FONT_INTERNAL_NAMES = ['1FTV HF Gesco', '1FTVHFGesco', '1FTV HF Gesco Regular'];

export function buildPersonalFontCss() {
  return `
:root {
  --font-ui: '${PERSONAL_FONT_FAMILY}', '1FTV HF Gesco', '1FTVHFGesco', sans-serif;
}
html, body, #root, .app-shell, .metro-shell { font-family: var(--font-ui) !important; }
body :where(h1,h2,h3,h4,h5,h6,p,span,a,button,label,input,textarea,select,option,li,dt,dd,th,td,caption,legend,summary,blockquote,small,strong,b,em,[role='button'],[role='tab'],[role='menuitem'],[role='option']):not(code):not(pre):not(kbd):not(samp):not([class*='material-icons']):not([class*='material-symbol']):not(.material-icons):not(.material-symbols-outlined):not(.material-symbols-rounded):not(.material-symbols-sharp) { font-family: var(--font-ui) !important; }
input::placeholder, textarea::placeholder { font-family: var(--font-ui) !important; }
`;
}

function injectRuntimeCss() {
  if (typeof document === 'undefined') return false;
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = buildPersonalFontCss();
  document.documentElement.classList.add('brian-personal-font-active');
  document.documentElement.style.setProperty('--font-ui', `'${PERSONAL_FONT_FAMILY}', '1FTV HF Gesco', '1FTVHFGesco', sans-serif`);
  return true;
}

export function installStoredPersonalFont() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  // Old per-browser binary copies caused Chrome, Safari and new devices to use
  // different sources. The verified bundled Gesco file is now the sole source.
  try {
    window.localStorage.removeItem(FONT_DATA_KEY);
    window.localStorage.setItem(FONT_NAME_KEY, 'BrianGesco.ttf');
  } catch {
    // Storage is optional; the bundled font still works without it.
  }
  injectRuntimeCss();
  return true;
}

export function getPersonalFontState() {
  return {
    active: true,
    name: 'BrianGesco.ttf',
  };
}

export async function waitForPersonalFontLoad() {
  if (typeof document === 'undefined' || !document.fonts?.load) return false;
  try {
    await document.fonts.load(`16px "${PERSONAL_FONT_FAMILY}"`, 'Tiếng Việt Nguyễn Anh Tuấn');
    const ready = document.fonts.check(`16px "${PERSONAL_FONT_FAMILY}"`, 'Tiếng Việt Nguyễn Anh Tuấn');
    if (ready) document.documentElement.classList.add('brian-personal-font-ready');
    return ready;
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
    const valid = /\.(ttf|otf|woff2?)$/i.test(file.name || '') || /font|octet-stream/.test(file.type || '');
    if (!valid) {
      reject(new Error('Vui lòng chọn file .ttf, .otf, .woff hoặc .woff2'));
      return;
    }

    // The approved BrianGesco.ttf is shipped with every deployment. Do not save
    // font binaries in localStorage because that would recreate device-specific state.
    try {
      window.localStorage.removeItem(FONT_DATA_KEY);
      window.localStorage.setItem(FONT_NAME_KEY, 'BrianGesco.ttf');
    } catch {
      // Continue with bundled source.
    }
    injectRuntimeCss();
    waitForPersonalFontLoad().finally(() => {
      const state = getPersonalFontState();
      window.dispatchEvent(new CustomEvent('bes-personal-font-updated', { detail: state }));
      resolve(state);
    });
  });
}

export function clearStoredPersonalFont() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  try {
    window.localStorage.removeItem(FONT_DATA_KEY);
    window.localStorage.setItem(FONT_NAME_KEY, 'BrianGesco.ttf');
  } catch {
    // The font remains bundled even if storage is unavailable.
  }
  document.getElementById(STYLE_ID)?.remove();
  injectRuntimeCss();
  waitForPersonalFontLoad();
  window.dispatchEvent(new CustomEvent('bes-personal-font-updated', { detail: getPersonalFontState() }));
}
