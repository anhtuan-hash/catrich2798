const STYLE_ID = 'bes-burs-shadow-style-v2';
const MIN_TEXT_PX = 13;
const MIN_CONTROL_PX = 14;
const FONT_SCALE_LEVELS = Object.freeze([100, 110, 120, 130, 140]);
const meaningfulPattern = /[\p{L}\p{N}]/u;
const controlSelector = 'button,input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]),textarea,select,option,[role="button"],[role="tab"],[role="menuitem"],[contenteditable="true"]';
const shellSelector = '.bes-top-chrome,.global-notice-shell,.global-flat-navigation';
const displaySelector = 'h1,h2,[role="heading"][aria-level="1"],[role="heading"][aria-level="2"],.burs-type-display,.burs-type-page-title';
const managedFonts = new WeakMap();

const shadowCss = `
:host{--burs-font-meta:13px;--burs-font-caption:14px;--burs-font-body:16px;--burs-font-control:15px;--burs-touch-size:44px;--burs-radius:18px}
:host,*{text-rendering:optimizeLegibility}
button,input,textarea,select,option,[role="button"],[role="tab"]{min-height:var(--burs-touch-size)!important}
input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),textarea,select{padding:.75rem 1rem;border-radius:.875rem}
small,.burs-readable-text,.kicker,.eyebrow,.badge,[class$="-badge"],[class*="-badge "],[class$="-chip"],[class*="-chip "]{line-height:1.45!important}
.burs-readable-control{min-height:var(--burs-touch-size)!important}
.burs-layout-safe{min-width:0!important;overflow-wrap:anywhere}
.card,.panel,.workspace-page,.change-list,.review-pane,.document-paper,.ai-output-card,.modal{border-radius:var(--burs-radius)}
.workspace-large-display .document-paper p,.document-paper p,.review-content p{line-height:1.72!important}
@media(max-width:1180px){.workspace-layout{grid-template-columns:18.75rem minmax(0,1fr)!important}.review-pane{width:min(31rem,60vw)}}
@media(max-width:760px){.workspace-layout{grid-template-columns:6.5rem minmax(0,1fr)!important}.review-pane{width:92vw}.ai-action-grid{grid-template-columns:1fr!important}}
`;

function directText(element) {
  return Array.from(element.childNodes || [])
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent || '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isMeaningful(element) {
  if (!element || element.matches?.('script,style,svg,path,canvas,video,audio,br,hr')) return false;
  if (element.closest?.('svg') || element.getAttribute?.('aria-hidden') === 'true' || element.hasAttribute?.('data-burs-skip')) return false;
  const text = directText(element);
  return text.length >= 2 && meaningfulPattern.test(text);
}

function ensureShadowStyle(root) {
  if (!(root instanceof ShadowRoot)) return;
  if (!root.querySelector(`style[data-style-id="${STYLE_ID}"]`)) {
    const style = document.createElement('style');
    style.dataset.styleId = STYLE_ID;
    style.textContent = shadowCss;
    root.prepend(style);
  }
}

function collectElements(root, output = []) {
  if (!root) return output;
  if (root instanceof ShadowRoot) ensureShadowStyle(root);
  const start = root instanceof Document ? root.documentElement : root;
  if (start instanceof Element) output.push(start);
  const walker = document.createTreeWalker(start, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode();
  while (node) {
    output.push(node);
    if (node.shadowRoot) collectElements(node.shadowRoot, output);
    node = walker.nextNode();
  }
  return output;
}

function originalFontState(element) {
  let state = managedFonts.get(element);
  if (!state) {
    state = {
      value: element.style.getPropertyValue('font-size'),
      priority: element.style.getPropertyPriority('font-size'),
    };
    managedFonts.set(element, state);
  }
  return state;
}

function restoreOriginalFont(element) {
  const state = managedFonts.get(element);
  if (!state) return;
  if (state.value) element.style.setProperty('font-size', state.value, state.priority || '');
  else element.style.removeProperty('font-size');
}

function selectedScale() {
  const percent = Number(document.documentElement.dataset.fontScale || 100);
  const normalized = FONT_SCALE_LEVELS.includes(percent) ? percent : 100;
  return normalized / 100;
}

function scaleForElement(element, baseSize) {
  const contentScale = selectedScale();
  if (element.closest?.(shellSelector)) return 1 + ((contentScale - 1) * .4);
  if (baseSize >= 32 || element.matches?.(displaySelector)) return 1 + ((contentScale - 1) * .5);
  return contentScale;
}

function scanRoot(root = document) {
  const elements = collectElements(root, []);

  /* Measure every base size before reapplying managed sizes, preventing nested scaling. */
  elements.forEach(restoreOriginalFont);
  const measurements = elements.map((element) => {
    const control = element.matches?.(controlSelector) || false;
    const meaningful = isMeaningful(element);
    if (!control && !meaningful) return { element, control, meaningful, baseSize: 0 };
    const size = Number.parseFloat(getComputedStyle(element).fontSize || '0');
    return { element, control, meaningful, baseSize: Number.isFinite(size) ? size : 0 };
  });

  measurements.forEach(({ element, control, meaningful, baseSize }) => {
    if (!control && !meaningful) return;
    originalFontState(element);
    const minimum = control ? MIN_CONTROL_PX : MIN_TEXT_PX;
    const readableBase = Math.max(baseSize || minimum, minimum);
    const scaled = readableBase * scaleForElement(element, readableBase);
    element.style.setProperty('font-size', `${Number(scaled.toFixed(2))}px`, 'important');
    element.dataset.bursManaged = 'true';
    element.dataset.bursBaseFont = String(Number(readableBase.toFixed(2)));
    element.classList.toggle('burs-readable-text', meaningful && baseSize > 0 && baseSize < MIN_TEXT_PX);
    element.classList.toggle('burs-readable-control', control);
  });

  elements.forEach((element) => {
    if (!(element instanceof Element) || element.matches('pre,code,table,textarea,input')) return;
    const overflowing = element.clientWidth > 0 && element.scrollWidth > element.clientWidth + 2;
    element.classList.toggle('burs-layout-safe', overflowing);
  });
}

export function installBursReadability() {
  if (typeof window === 'undefined' || window.__BURS_READABILITY_INSTALLED__) return;
  window.__BURS_READABILITY_INSTALLED__ = true;
  document.documentElement.dataset.burs = 'comfortable-v2';

  let frame = 0;
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      frame = 0;
      try { scanRoot(document); } catch (error) { console.warn('[BURS 2.0] readability scan skipped', error); }
    });
  };

  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.addedNodes?.length || mutation.type === 'characterData')) schedule();
  });
  observer.observe(document.documentElement, { childList: true, characterData: true, subtree: true });

  window.addEventListener('hashchange', schedule);
  window.addEventListener('bes:font-scale-changed', schedule);
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('load', schedule, { once: true });
  schedule();

  window.BURS = Object.freeze({
    mode: 'comfortable-v2',
    minTextPx: MIN_TEXT_PX,
    minControlPx: MIN_CONTROL_PX,
    scaleLevels: FONT_SCALE_LEVELS,
    rescan: schedule,
  });
}
