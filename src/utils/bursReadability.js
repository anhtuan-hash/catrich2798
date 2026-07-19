const STYLE_ID = 'bes-burs-shadow-style';
const MIN_TEXT_PX = 13;
const MIN_CONTROL_PX = 14;
const meaningfulPattern = /[\p{L}\p{N}]/u;
const controlSelector = 'button,input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]),textarea,select,option,[role="button"],[role="tab"],[role="menuitem"],a[href]';

const shadowCss = `
:host{--burs-font-meta:.875rem;--burs-font-caption:.9375rem;--burs-font-body:1rem;--burs-font-control:1rem;--burs-touch-size:2.75rem;--burs-radius:1.125rem}
:host,*{text-rendering:optimizeLegibility}
button,input,textarea,select,option,[role="button"],[role="tab"]{font-size:var(--burs-font-control)!important}
button,[role="button"],[role="tab"]{min-height:var(--burs-touch-size)}
input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),textarea,select{min-height:3.25rem;padding:.75rem 1rem;border-radius:.875rem}
small,.burs-readable-text,.kicker,.eyebrow,.badge,[class$="-badge"],[class*="-badge "],[class$="-chip"],[class*="-chip "]{font-size:var(--burs-font-meta)!important;line-height:1.45!important}
.burs-readable-control{font-size:var(--burs-font-control)!important;min-height:var(--burs-touch-size)}
.card,.panel,.workspace-page,.change-list,.review-pane,.document-paper,.ai-output-card,.modal{border-radius:var(--burs-radius)}
.workspace-large-display .document-paper p,.document-paper p,.review-content p{font-size:var(--burs-font-body)!important;line-height:1.72!important}
.change-scroll strong{font-size:1rem!important}.change-scroll small,.change-scroll em{font-size:var(--burs-font-meta)!important}
.pane-heading h2{font-size:1.25rem!important}.proposal-metadata span{font-size:var(--burs-font-meta)!important}.proposal-metadata strong{font-size:var(--burs-font-caption)!important}
.ai-action-grid strong{font-size:1.0625rem!important}.ai-action-grid small,.ai-run-row small,.ai-provider-status small{font-size:var(--burs-font-meta)!important}
.ai-prompt-field textarea{font-size:var(--burs-font-body)!important;min-height:8rem}
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
  if (element.getAttribute?.('aria-hidden') === 'true' || element.hasAttribute?.('data-burs-skip')) return false;
  const text = directText(element);
  return text.length >= 2 && meaningfulPattern.test(text);
}

function applyElementRules(element) {
  if (!(element instanceof Element)) return;
  if (element.matches(controlSelector)) {
    const size = Number.parseFloat(getComputedStyle(element).fontSize || '0');
    if (size && size < MIN_CONTROL_PX) element.classList.add('burs-readable-control');
  }
  if (isMeaningful(element)) {
    const size = Number.parseFloat(getComputedStyle(element).fontSize || '0');
    if (size && size < MIN_TEXT_PX) element.classList.add('burs-readable-text');
  }
  if (element.scrollWidth > element.clientWidth + 2 && !element.matches('pre,code,table,textarea,input')) {
    element.classList.add('burs-layout-safe');
  }
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

function scanRoot(root) {
  if (!root) return;
  if (root instanceof ShadowRoot) ensureShadowStyle(root);
  const start = root instanceof Document ? root.documentElement : root;
  if (start instanceof Element) applyElementRules(start);
  const walker = document.createTreeWalker(start, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode();
  while (node) {
    applyElementRules(node);
    if (node.shadowRoot) scanRoot(node.shadowRoot);
    node = walker.nextNode();
  }
}

export function installBursReadability() {
  if (typeof window === 'undefined' || window.__BURS_READABILITY_INSTALLED__) return;
  window.__BURS_READABILITY_INSTALLED__ = true;
  document.documentElement.dataset.burs = 'comfortable';

  let frame = 0;
  const schedule = (root = document) => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      frame = 0;
      try { scanRoot(root); } catch (error) { console.warn('[BURS] readability scan skipped', error); }
    });
  };

  const observer = new MutationObserver((mutations) => {
    const root = mutations.find((mutation) => mutation.addedNodes?.length)?.target?.getRootNode?.() || document;
    schedule(root instanceof ShadowRoot ? root : document);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('hashchange', () => schedule(document));
  window.addEventListener('bes:font-scale-changed', () => schedule(document));
  window.addEventListener('load', () => schedule(document), { once: true });
  schedule(document);

  window.BURS = Object.freeze({
    mode: 'comfortable',
    minTextPx: MIN_TEXT_PX,
    minControlPx: MIN_CONTROL_PX,
    rescan: () => schedule(document),
  });
}
