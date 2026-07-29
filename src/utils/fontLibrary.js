const FONT_STORAGE_KEY = 'bes-ui-font-family-v1';
const STYLE_ID = 'bes-ui-font-library-runtime';

export const FONT_LIBRARY_OPTIONS = [
  { id: 'brian', label: 'BrianGesco', labelVi: 'BrianGesco (mặc định)' },
  { id: 'quicksand', label: 'Quicksand', labelVi: 'Quicksand' },
  { id: 'bexdroga', label: 'MJ Bexdroga', labelVi: 'MJ Bexdroga' },
  { id: 'nasi', label: '1FTV Nasi', labelVi: '1FTV Nasi' },
  { id: 'monologue', label: 'VL Monologue', labelVi: 'VL Monologue' },
];

const FONT_DEFINITIONS = {
  brian: { family: "'BrianGescoExact', 'BrianGesco', '1FTV HF Gesco', sans-serif", css: '' },
  quicksand: {
    family: "'EnglishHubQuicksand', sans-serif",
    css: "@font-face{font-family:'EnglishHubQuicksand';src:url('https://cdn.jsdelivr.net/fontsource/fonts/quicksand:vf@5.3.0/vietnamese-wght-normal.woff2') format('woff2-variations');font-style:normal;font-weight:300 700;font-display:swap;}",
  },
  bexdroga: {
    family: "'EnglishHubBexdroga', sans-serif",
    css: "@font-face{font-family:'EnglishHubBexdroga';src:url('/fonts/ui/MJ-Bexdroga.ttf') format('truetype');font-style:normal;font-weight:400;font-display:swap;}",
  },
  nasi: {
    family: "'EnglishHubNasi', sans-serif",
    css: "@font-face{font-family:'EnglishHubNasi';src:url('/fonts/ui/1FTV-Nasi.ttf') format('truetype');font-style:normal;font-weight:400;font-display:swap;}",
  },
  monologue: {
    family: "'EnglishHubMonologue', sans-serif",
    css: "@font-face{font-family:'EnglishHubMonologue';src:url('/fonts/ui/VL-Monologue.ttf') format('truetype');font-style:normal;font-weight:400;font-display:swap;}",
  },
};

function globalCss(family) {
  return `:root{--font-ui:${family};--metro-font:var(--font-ui);--english-hub-personal-font:var(--font-ui);}html,body,#root,.app-shell,.metro-shell{font-family:var(--font-ui)!important;}body *:not(svg):not(path):not(.material-icons):not(.material-symbols-rounded):not(.material-symbols-outlined):not([class^='fa']):not([class*=' fa']),body *::before,body *::after,button,input,textarea,select,option,dialog,pre,code,kbd,samp{font-family:var(--font-ui)!important;}.material-icons{font-family:'Material Icons'!important;}.material-symbols-rounded{font-family:'Material Symbols Rounded'!important;}.material-symbols-outlined{font-family:'Material Symbols Outlined'!important;}[class^='fa'],[class*=' fa']{font-family:'Font Awesome 6 Free','Font Awesome 5 Free',FontAwesome!important;}`;
}

export function getSelectedFontId() {
  try {
    const value = localStorage.getItem(FONT_STORAGE_KEY) || 'brian';
    return FONT_DEFINITIONS[value] ? value : 'brian';
  } catch { return 'brian'; }
}

export function applySelectedFont(id = getSelectedFontId()) {
  if (typeof document === 'undefined') return id;
  const safeId = FONT_DEFINITIONS[id] ? id : 'brian';
  const definition = FONT_DEFINITIONS[safeId];
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = `${definition.css}\n${globalCss(definition.family)}`;
  document.documentElement.dataset.uiFont = safeId;
  return safeId;
}

export function setSelectedFontId(id) {
  const safeId = FONT_DEFINITIONS[id] ? id : 'brian';
  try { localStorage.setItem(FONT_STORAGE_KEY, safeId); } catch { /* optional */ }
  applySelectedFont(safeId);
  window.dispatchEvent(new CustomEvent('bes-ui-font-updated', { detail: { id: safeId } }));
  return safeId;
}

export function installFontLibrary() {
  const selected = applySelectedFont(getSelectedFontId());
  window.addEventListener('storage', (event) => {
    if (event.key === FONT_STORAGE_KEY) applySelectedFont(event.newValue || 'brian');
  });
  return selected;
}
