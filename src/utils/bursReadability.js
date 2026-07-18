const STYLE_ID = 'bes-burs-shadow-style-v3';
const MIN_TEXT_PX = 13;
const MIN_CONTROL_PX = 14;
const FONT_SCALE_LEVELS = Object.freeze([100, 110, 120, 130, 140]);
const meaningfulPattern = /[\p{L}\p{N}]/u;
const controlSelector = 'button,input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]),textarea,select,option,[role="button"],[role="tab"],[role="menuitem"],[contenteditable="true"]';
const semanticSelector = '[class*="burs-type-"]';

const shadowCss = `
:host{--burs-font-micro:13px;--burs-font-caption:14px;--burs-font-label:15px;--burs-font-body:16px;--burs-font-control:15px;--burs-touch-size:44px;--burs-radius:18px}
:host,*{text-rendering:optimizeLegibility}
button,input,textarea,select,option,[role="button"],[role="tab"]{min-height:var(--burs-touch-size)!important}
input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),textarea,select{padding:.75rem 1rem;border-radius:.875rem}
small,.kicker,.eyebrow,.badge,[class$="-badge"],[class*="-badge "],[class$="-chip"],[class*="-chip "]{line-height:1.45!important}
.burs-readable-control{min-height:var(--burs-touch-size)!important}
.burs-long-token{overflow-wrap:anywhere;word-break:break-word}
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

function isLongUnbrokenToken(element) {
  if (!element || element.matches?.('pre,textarea,input')) return false;
  const text = directText(element);
  return text.length >= 28 && !/\s/.test(text);
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

function routeName(element) {
  return element.closest?.('[data-route]')?.getAttribute('data-route') || 'unknown';
}

function describeElement(element, baseSize) {
  return {
    tag: element.tagName?.toLowerCase() || 'unknown',
    className: typeof element.className === 'string' ? element.className.slice(0, 160) : '',
    route: routeName(element),
    fontSize: Number(baseSize.toFixed(2)),
    text: directText(element).slice(0, 120),
  };
}

function scanRoot(root = document) {
  const elements = collectElements(root, []);
  const underText = [];
  const underControls = [];
  const overflows = [];

  elements.forEach((element) => {
    if (!(element instanceof Element)) return;

    const semantic = Boolean(element.closest?.(semanticSelector));
    const control = !semantic && element.matches?.(controlSelector);
    const meaningful = !semantic && isMeaningful(element);
    const baseSize = Number.parseFloat(getComputedStyle(element).fontSize || '0');
    const validSize = Number.isFinite(baseSize) ? baseSize : 0;
    const underMinimum = validSize > 0 && validSize < (control ? MIN_CONTROL_PX : MIN_TEXT_PX);

    element.classList.toggle('burs-readable-control', Boolean(control));
    element.classList.toggle('burs-readable-text', Boolean(meaningful && underMinimum));
    element.classList.toggle('burs-long-token', isLongUnbrokenToken(element));

    if (underMinimum) {
      element.dataset.bursUnderMin = control ? 'control' : 'text';
      const detail = describeElement(element, validSize);
      if (control) underControls.push(detail);
      else if (meaningful) underText.push(detail);
    } else {
      delete element.dataset.bursUnderMin;
    }

    if (!element.matches('pre,code,table,textarea,input') && element.clientWidth > 0 && element.scrollWidth > element.clientWidth + 2) {
      element.dataset.bursOverflow = 'true';
      if (overflows.length < 40) overflows.push(describeElement(element, validSize));
    } else {
      delete element.dataset.bursOverflow;
    }
  });

  const report = Object.freeze({
    mode: 'comfortable-v3',
    fontScale: Number(document.documentElement.dataset.fontScale || 100),
    scanned: elements.length,
    underTextCount: underText.length,
    underControlCount: underControls.length,
    overflowCount: overflows.length,
    underText: underText.slice(0, 40),
    underControls: underControls.slice(0, 40),
    overflows,
    timestamp: Date.now(),
  });

  window.dispatchEvent(new CustomEvent('burs:readability-report', { detail: report }));
  return report;
}

export function installBursReadability() {
  if (typeof window === 'undefined' || window.__BURS_READABILITY_INSTALLED__) return;
  window.__BURS_READABILITY_INSTALLED__ = true;
  document.documentElement.dataset.burs = 'comfortable-v3';

  let frame = 0;
  let lastReport = null;
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      frame = 0;
      try {
        lastReport = scanRoot(document);
      } catch (error) {
        console.warn('[BURS 3.0] readability audit skipped', error);
      }
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
    mode: 'comfortable-v3',
    minTextPx: MIN_TEXT_PX,
    minControlPx: MIN_CONTROL_PX,
    scaleLevels: FONT_SCALE_LEVELS,
    rescan: schedule,
    audit: () => scanRoot(document),
    get lastReport() { return lastReport; },
  });
}