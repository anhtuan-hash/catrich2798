const FONT_STORAGE_KEY = 'bes-system-font-family-v1';
const FONT_STYLE_ID = 'bes-system-font-catalog';
const DEFAULT_FONT_ID = 'brian';

export const FONT_OPTIONS = [
  {
    id: 'brian',
    label: 'Brian Gesco',
    description: 'Phông chữ mặc định của English Hub',
    stack: "'BrianGescoExact', 'BrianGesco', '1FTV HF Gesco', '1FTVHFGesco', sans-serif",
  },
  {
    id: 'quicksand',
    label: 'Quicksand',
    description: 'Hiện đại, rõ ràng, hỗ trợ 5 độ đậm',
    stack: "'Quicksand BES', 'Quicksand', system-ui, sans-serif",
  },
  {
    id: 'mj-bexdroga',
    label: 'MJ Bexdroga',
    description: 'Kiểu chữ trang trí mềm mại',
    stack: "'MJ Bexdroga BES', 'MJ Bexdroga', sans-serif",
  },
  {
    id: '1ftv-nasi',
    label: '1FTV Nasi',
    description: 'Kiểu chữ cá tính cho giao diện',
    stack: "'1FTV Nasi BES', '1FTV Nasi', sans-serif",
  },
  {
    id: 'vl-monologue',
    label: 'VL Monologue',
    description: 'Kiểu chữ viết tay giàu biểu cảm',
    stack: "'VL Monologue BES', 'VL Monologue', sans-serif",
  },
];

const FONT_BY_ID = new Map(FONT_OPTIONS.map((font) => [font.id, font]));

function catalogCss() {
  const staticFace = (family, url) => [300, 400, 500, 600, 700].map((weight) => `
@font-face {
  font-family: '${family}';
  src: url('${url}') format('woff2');
  font-weight: ${weight};
  font-style: normal;
  font-display: swap;
}`).join('\n');

  return `
${staticFace('MJ Bexdroga BES', '/fonts/system/mj-bexdroga.woff2')}
${staticFace('1FTV Nasi BES', '/fonts/system/1ftv-nasi.woff2')}
${staticFace('VL Monologue BES', '/fonts/system/vl-monologue.woff2')}
`;
}

function ensureQuicksandStylesheet() {
  if (typeof document === 'undefined') return;
  const id = 'bes-quicksand-font-stylesheet';
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&display=swap';
  document.head.appendChild(link);
}

function ensureCatalogStyles() {
  if (typeof document === 'undefined') return;
  let style = document.getElementById(FONT_STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = FONT_STYLE_ID;
    document.head.appendChild(style);
  }
  if (!style.textContent) style.textContent = catalogCss();
}

function normalizeFontId(value) {
  const id = String(value || '').trim().toLowerCase();
  return FONT_BY_ID.has(id) ? id : DEFAULT_FONT_ID;
}

export function getStoredSystemFont() {
  if (typeof window === 'undefined') return DEFAULT_FONT_ID;
  try {
    return normalizeFontId(window.localStorage.getItem(FONT_STORAGE_KEY));
  } catch {
    return DEFAULT_FONT_ID;
  }
}

export function applySystemFont(value, options = {}) {
  const id = normalizeFontId(value);
  const font = FONT_BY_ID.get(id) || FONT_BY_ID.get(DEFAULT_FONT_ID);
  const persist = options.persist !== false;

  if (typeof document !== 'undefined') {
    ensureCatalogStyles();
    if (id === 'quicksand') ensureQuicksandStylesheet();
    const root = document.documentElement;
    root.style.setProperty('--font-ui', font.stack);
    root.style.setProperty('--metro-font', 'var(--font-ui)');
    root.style.setProperty('--english-hub-personal-font', 'var(--font-ui)');
    root.dataset.systemFont = id;
  }

  if (persist && typeof window !== 'undefined') {
    try { window.localStorage.setItem(FONT_STORAGE_KEY, id); } catch { /* preference is optional */ }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bes-system-font-updated', { detail: { id, label: font.label } }));
  }

  return id;
}

export function installStoredSystemFont() {
  return applySystemFont(getStoredSystemFont(), { persist: false });
}
