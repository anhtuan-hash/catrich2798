const STYLE_ID = 'bes-burs-shadow-style';
const DOCUMENT_STYLE_ID = 'bes-burs-document-style';
const MIN_TEXT_PX = 14;
const MIN_CONTROL_PX = 15;
const meaningfulPattern = /[\p{L}\p{N}]/u;
const controlSelector = 'button,input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]),textarea,select,option,[role="button"],[role="tab"],[role="menuitem"],a[href]';
const cardSelector = [
  '.card', '.panel', '.tile', '.surface', '.metric',
  '[class$="-card"]', '[class*="-card "]',
  '[class$="-panel"]', '[class*="-panel "]',
  '[class$="-tile"]', '[class*="-tile "]',
  '[class$="-surface"]', '[class*="-surface "]',
  '[class$="-metric"]', '[class*="-metric "]',
].join(',');
const metricCardPattern = /(^|\s|[-_])(metric|stat|kpi|summary)([-_]|\s|$)/i;

const cardTypographyCss = `
.burs-card-typography{
  --burs-card-title-size:clamp(1.125rem,1.2vw,1.375rem);
  --burs-card-body-size:1rem;
  --burs-card-support-size:.9375rem;
  --burs-card-meta-size:.875rem;
  --burs-card-action-size:.9375rem;
  --burs-card-value-size:clamp(1.75rem,2.6vw,2.5rem);
  text-rendering:optimizeLegibility;
}
.burs-card-typography>:where(header,[class$="-header"],[class*="-header "]) :where(h2,h3,h4,[class$="-title"],[class*="-title "]),
.burs-card-typography>:where(h2,h3,h4,[class$="-title"],[class*="-title "]){
  font-size:var(--burs-card-title-size)!important;
  line-height:1.24!important;
  letter-spacing:-.012em;
}
.burs-card-typography :where(p,li,dd,[class$="-body-text"],[class*="-body-text "]){
  font-size:var(--burs-card-body-size)!important;
  line-height:1.58!important;
}
.burs-card-typography :where(small,[class$="-subtitle"],[class*="-subtitle "],[class$="-description"],[class*="-description "],[class$="-support"],[class*="-support "]){
  font-size:var(--burs-card-support-size)!important;
  line-height:1.48!important;
}
.burs-card-typography :where(.eyebrow,.kicker,[class$="-eyebrow"],[class*="-eyebrow "],[class$="-kicker"],[class*="-kicker "],[class$="-meta"],[class*="-meta "],[class$="-label"],[class*="-label "],[class$="-badge"],[class*="-badge "],[class$="-chip"],[class*="-chip "],[class*="status-pill"],[class*="count-pill"]){
  font-size:var(--burs-card-meta-size)!important;
  line-height:1.4!important;
}
.burs-card-typography :where(button,[role="button"],a[class*="btn"],a[class*="button"]){
  font-size:var(--burs-card-action-size)!important;
  line-height:1.3!important;
}
.burs-card-typography.burs-metric-card :where(strong,[class$="-value"],[class*="-value "]){
  font-size:var(--burs-card-value-size)!important;
  line-height:1.05!important;
}

html[data-burs="comfortable"] .app-shell[data-route="dashboard"] :where(.gd-hero-copy>span,.gpl-eyebrow){font-size:.875rem!important;line-height:1.35!important}
html[data-burs="comfortable"] .app-shell[data-route="dashboard"] .gd-hero-copy h1{font-size:clamp(2.5rem,4.4vw,4rem)!important}
html[data-burs="comfortable"] .app-shell[data-route="dashboard"] :where(.gd-hero-copy p,.gpl-title-group p){font-size:1.0625rem!important;line-height:1.55!important}
html[data-burs="comfortable"] .app-shell[data-route="dashboard"] :where(.gd-button,.gd-text-button,.gd-quick-action,.gpl-button,.gpl-edit-button,.gpl-filter-chip){font-size:.9375rem!important}
html[data-burs="comfortable"] .app-shell[data-route="dashboard"] :where(.gd-metric-copy>span,.gpl-metric small){font-size:.9375rem!important;line-height:1.4!important}
html[data-burs="comfortable"] .app-shell[data-route="dashboard"] :where(.gd-metric-copy strong,.gpl-metric strong){font-size:clamp(2rem,2.8vw,2.5rem)!important;line-height:1.05!important}
html[data-burs="comfortable"] .app-shell[data-route="dashboard"] :where(.gd-metric-copy small,.gd-alert small,.gd-calendar-title p,.gd-surface-heading p,.gd-calendar-toolbar span:not(.gd-count-chip),.gd-row-copy small,.gd-tile-copy small,.gd-empty p,.gpl-result-count,.gpl-inline-alert,.gpl-missing-banner small){font-size:.875rem!important;line-height:1.45!important}
html[data-burs="comfortable"] .app-shell[data-route="dashboard"] :where(.gd-calendar-title h2,.gd-surface-heading h2,.gpl-title-group h2){font-size:clamp(1.375rem,1.8vw,1.75rem)!important;line-height:1.22!important}
html[data-burs="comfortable"] .app-shell[data-route="dashboard"] :where(.gd-calendar-toolbar strong,.gd-agenda>header h3,.gd-selected-day h3,.gd-row-copy strong,.gd-tile-copy strong,.gd-event-copy strong,.gpl-person-row strong,.gpl-person-row b){font-size:1rem!important;line-height:1.35!important}
html[data-burs="comfortable"] .app-shell[data-route="dashboard"] :where(.gd-count-chip,.gd-status-chip,.gd-day>span,.gd-day>small,.gd-day>em,.gd-selected-day>span,.gd-selected-day>div span,.gd-agenda>header>div>span,.gd-event-time small,.gd-event-copy small,.gd-homeroom span,.gpl-filter-chip,.gpl-table-head,.gpl-person-row small,.gpl-status,.gpl-missing-banner strong,.gpl-missing-banner b){font-size:.875rem!important;line-height:1.4!important}
html[data-burs="comfortable"] .app-shell[data-route="dashboard"] :where(.gd-event-time strong,.gd-selected-day p,.gd-event-copy p,.gpl-search input){font-size:.9375rem!important;line-height:1.48!important}
html[data-burs="comfortable"] .app-shell[data-route="dashboard"] .gpl-profile-hero h3{font-size:1.5rem!important;line-height:1.2!important}
html[data-burs="comfortable"] .app-shell[data-route="dashboard"] :where(.gpl-drawer-header>span,.gpl-profile-content h4,.gpl-form h4){font-size:1rem!important;line-height:1.35!important}
html[data-burs="comfortable"] .app-shell[data-route="dashboard"] :where(.gpl-profile-hero p,.gpl-save-notice,.gpl-profile-content dd,.gpl-other-degrees p,.gpl-form input,.gpl-form select,.gpl-form textarea){font-size:.9375rem!important;line-height:1.48!important}
html[data-burs="comfortable"] .app-shell[data-route="dashboard"] :where(.gpl-profile-content dt,.gpl-account-note,.gpl-other-degrees>span,.gpl-form label>span){font-size:.875rem!important;line-height:1.42!important}

@media(max-width:620px){
  html[data-burs="comfortable"] .app-shell[data-route="dashboard"] .gd-hero-copy h1{font-size:2.25rem!important}
  html[data-burs="comfortable"] .app-shell[data-route="dashboard"] :where(.gd-hero-copy p,.gpl-title-group p){font-size:1rem!important}
  html[data-burs="comfortable"] .app-shell[data-route="dashboard"] :where(.gd-metric-copy strong,.gpl-metric strong){font-size:2rem!important}
}
`;

const documentCss = `
html[data-burs="comfortable"]{--burs-font-meta:.875rem;--burs-font-caption:.9375rem;--burs-font-body:1rem;--burs-font-control:1rem;--burs-touch-size:2.75rem;--burs-radius:1.125rem}
html[data-burs="comfortable"] .burs-readable-text{font-size:var(--burs-font-meta)!important;line-height:1.45!important}
html[data-burs="comfortable"] .burs-readable-control{font-size:var(--burs-font-control)!important;min-height:var(--burs-touch-size)}
html[data-burs="comfortable"] .burs-layout-safe{min-width:0!important;max-width:100%}
${cardTypographyCss}
`;

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
${cardTypographyCss}
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
  if (element.matches(cardSelector) && !element.matches('svg,path,input,textarea,select,option')) {
    element.classList.add('burs-card-typography');
    if (metricCardPattern.test(element.className || '')) element.classList.add('burs-metric-card');
  }
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

function ensureDocumentStyle() {
  let style = document.getElementById(DOCUMENT_STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = DOCUMENT_STYLE_ID;
    style.dataset.styleId = DOCUMENT_STYLE_ID;
    style.textContent = documentCss;
  }
  if (document.head?.lastElementChild !== style) document.head?.append(style);
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
  if (root instanceof Document) ensureDocumentStyle();
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
  ensureDocumentStyle();

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
    cardTypography: true,
    rescan: () => schedule(document),
  });
}
