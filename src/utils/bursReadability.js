import { FONT_SCALE_OPTIONS, normalizeFontScale } from './fontScale.js';

const DOCUMENT_STYLE_ID = 'bes-burs-document-style-lite';
const MOBILE_MIN_WIDTH = 700;

const liteCss = `
html[data-burs="comfortable"]{
  --brian-font-body:1rem;
  --brian-font-support:.9375rem;
  --brian-font-label:.875rem;
  --brian-font-control:1rem;
  --brian-touch-size:2.75rem;
  --brian-control-height:3rem;
  text-rendering:optimizeLegibility;
  -webkit-text-size-adjust:100%;
}
html[data-burs="comfortable"] body,
html[data-burs="comfortable"] .app-shell{
  font-size:var(--brian-font-body);
  line-height:1.55;
}
html[data-burs="comfortable"] .app-shell :where(p,li,dd,dt,td,th){line-height:1.55}
html[data-burs="comfortable"] .app-shell :where(button,[role="button"],a[href]){
  font-size:max(.875rem,var(--brian-font-support));
}
html[data-burs="comfortable"] .app-shell :where(input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]),textarea,select,option){
  font-size:var(--brian-font-control);
  line-height:1.4;
}
html[data-burs="comfortable"] .app-shell :where(input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]),textarea,select){
  min-height:var(--brian-control-height);
}
html[data-burs="comfortable"] .app-shell :where(label,small,.eyebrow,[class$="-label"],[class*="-label "],[class$="-meta"],[class*="-meta "]){
  font-size:max(.8125rem,var(--brian-font-label));
}
html[data-burs="comfortable"] .app-shell :where(table){font-size:var(--brian-font-support)}
html[data-burs="comfortable"] .app-shell :where([class*="table-wrap"],[class*="table-scroll"],[class*="data-grid"]){
  overflow-x:auto;
  -webkit-overflow-scrolling:touch;
}
html[data-burs="comfortable"] .app-shell :where(.card,.panel,.surface,[class$="-card"],[class*="-card "],[class$="-panel"],[class*="-panel "]){
  min-width:0;
}
@media(max-width:${MOBILE_MIN_WIDTH - 1}px){
  html[data-burs="comfortable"]{--brian-touch-size:2.65rem;--brian-control-height:2.85rem}
}
`;

function readAppearanceState() {
  try { return JSON.parse(localStorage.getItem('bes-appearance-v2') || '{}') || {}; } catch { return {}; }
}

function readRequestedScale() {
  const stored = Number(localStorage.getItem('bes-font-scale'));
  if (FONT_SCALE_OPTIONS.includes(stored)) return stored;
  const appearance = readAppearanceState();
  if (appearance.projector) return 135;
  return normalizeFontScale(appearance.textScale, 100);
}

function typographyMode(scale) {
  if (scale >= 135) return 'projector';
  if (scale >= 120) return 'xlarge';
  if (scale >= 110) return 'large';
  if (scale <= 90) return 'compact';
  return 'standard';
}

function applyTypographyScale(value, { persist = false } = {}) {
  const requested = normalizeFontScale(value, readRequestedScale());
  const mobile = window.matchMedia?.(`(max-width:${MOBILE_MIN_WIDTH - 1}px)`)?.matches;
  const effective = mobile && requested < 100 ? 100 : requested;
  const root = document.documentElement;

  root.dataset.fontScaleRequested = String(requested);
  root.dataset.fontScale = String(effective);
  root.dataset.typographyMode = typographyMode(requested);
  root.dataset.brianTypography = 'v2-lite';
  root.style.fontSize = `${effective}%`;
  root.style.setProperty('--brian-font-scale-factor', String(effective / 100));

  if (persist) {
    try { localStorage.setItem('bes-font-scale', String(requested)); } catch { /* optional */ }
  }

  return { requested, effective };
}

function ensureDocumentStyle() {
  let style = document.getElementById(DOCUMENT_STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = DOCUMENT_STYLE_ID;
    style.textContent = liteCss;
    document.head?.append(style);
  }
}

export function installBursReadability() {
  if (typeof window === 'undefined' || window.__BURS_READABILITY_INSTALLED__) return;
  window.__BURS_READABILITY_INSTALLED__ = true;

  document.documentElement.dataset.burs = 'comfortable';
  ensureDocumentStyle();
  applyTypographyScale(readRequestedScale());

  const onFontScale = (event) => {
    const requested = normalizeFontScale(event?.detail?.scale, readRequestedScale());
    applyTypographyScale(requested, { persist: true });
  };

  const onAppearance = (event) => {
    const state = event?.detail?.state || readAppearanceState();
    const requested = state.projector ? 135 : normalizeFontScale(state.textScale, readRequestedScale());
    applyTypographyScale(requested, { persist: true });
  };

  const onResize = () => applyTypographyScale(readRequestedScale());

  window.addEventListener('bes:font-scale-changed', onFontScale);
  window.addEventListener('bes:appearance-changed', onAppearance);
  window.addEventListener('bes:appearance-ready', onAppearance);
  window.addEventListener('resize', onResize, { passive: true });

  window.BURS = Object.freeze({
    mode: 'comfortable-lite',
    cardTypography: false,
    scales: [...FONT_SCALE_OPTIONS],
    applyScale: (scale) => applyTypographyScale(scale, { persist: true }),
    rescan: () => ensureDocumentStyle(),
  });
}
