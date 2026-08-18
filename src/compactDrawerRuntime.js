/*
 * Brian English — global compact overlay / drawer runtime.
 *
 * The app contains many lazy-loaded tools and portal-mounted dialogs whose
 * component CSS is loaded after the main bundle. This runtime gives all
 * drawers, sheets, dialogs and modal shells a consistent compact geometry
 * without affecting normal navigation sidebars or full-screen workspaces.
 */

const STYLE_ID = 'bes-compact-drawer-runtime-style';
const SHADOW_STYLE_ATTR = 'data-bes-compact-drawer-style';
const INSTALL_FLAG = '__BES_COMPACT_DRAWER_RUNTIME_V1__';
const OBSERVED_ROOTS = new WeakSet();
const pendingRoots = new Set();
let animationFrame = 0;

const OVERLAY_SELECTOR = [
  'dialog',
  '[role="dialog"]',
  '[aria-modal="true"]',
  '.launcher-link-form',
  '.launcher-link-manager',
  '.shared-chatbot-drawer-v1167',
  '.android-detail-panel',
  '[class$="-drawer"]', '[class*="-drawer "]',
  '[class$="-sheet"]', '[class*="-sheet "]',
  '[class$="-dialog"]', '[class*="-dialog "]',
  '[class$="-modal"]', '[class*="-modal "]',
].join(',');

const SKIP_SELECTOR = [
  '[data-bes-compact-drawer="off"]',
  '[data-bes-drawer-size="wide"]',
  '[data-bes-drawer-size="full"]',
  '[data-bes-modal-size="wide"]',
  '[data-bes-modal-size="full"]',
  '.fullscreen', '.full-screen', '.is-fullscreen',
  '.wide-modal', '.wide-dialog', '.modal-full', '.dialog-full',
].join(',');

const compactCss = `
/* Brian English — compact overlay design system */
:where(.bes-compact-overlay){
  --bes-compact-width:620px;
  --bes-compact-side-width:460px;
  --bes-compact-pad-x:18px;
  --bes-compact-pad-y:15px;
  --bes-compact-control-height:44px;
  box-sizing:border-box!important;
  width:min(var(--bes-compact-width),calc(100vw - 32px))!important;
  max-width:min(var(--bes-compact-width),calc(100vw - 32px))!important;
  max-height:min(760px,88dvh)!important;
  border-radius:18px!important;
  overscroll-behavior:contain!important;
}

:where(.bes-compact-overlay:not(.bes-compact-side-drawer)){
  overflow:auto!important;
}

:where(.bes-compact-overlay.bes-compact-side-drawer){
  --bes-compact-width:var(--bes-compact-side-width);
  width:min(var(--bes-compact-side-width),calc(100vw - 20px))!important;
  max-width:min(var(--bes-compact-side-width),calc(100vw - 20px))!important;
  max-height:calc(100dvh - 20px)!important;
}

:where(.bes-compact-overlay-header){
  padding:14px var(--bes-compact-pad-x)!important;
  gap:12px!important;
}

:where(.bes-compact-overlay-body){
  padding:15px var(--bes-compact-pad-x)!important;
  gap:14px!important;
  overflow:auto!important;
  overscroll-behavior:contain!important;
}

:where(.bes-compact-overlay-footer){
  padding:11px var(--bes-compact-pad-x) 13px!important;
  gap:8px!important;
}

:where(.bes-compact-overlay-header) :where(h1,h2,h3,[class$="-title"],[class*="-title "]){
  margin-block:0!important;
  font-size:clamp(1.25rem,2vw,1.5rem)!important;
  line-height:1.18!important;
  letter-spacing:-.025em!important;
}

:where(.bes-compact-overlay-header) :where(p,small,[class$="-subtitle"],[class*="-subtitle "]){
  margin-block:.2rem 0!important;
  font-size:.875rem!important;
  line-height:1.4!important;
}

:where(.bes-compact-overlay) :where(
  input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]):not([type="button"]):not([type="submit"]):not([type="reset"]),
  select
){
  min-height:var(--bes-compact-control-height)!important;
  height:auto!important;
  padding:9px 12px!important;
  border-radius:11px!important;
  font-size:.95rem!important;
  line-height:1.35!important;
}

:where(.bes-compact-overlay) textarea{
  min-height:82px!important;
  padding:10px 12px!important;
  border-radius:11px!important;
  font-size:.95rem!important;
  line-height:1.42!important;
}

:where(.bes-compact-overlay) :where(
  label,
  [class$="-field"]>span,
  [class*="-field "]>span,
  [class$="-label"],
  [class*="-label "]
){
  font-size:.9rem!important;
  line-height:1.3!important;
}

:where(.bes-compact-overlay) :where([class$="-field"],[class*="-field "]){
  gap:6px!important;
}

:where(.bes-compact-overlay) :where(button,[role="button"]){
  min-height:40px!important;
}

:where(.bes-compact-overlay) :where(
  [class$="-close"],[class*="-close "],
  button[aria-label*="close" i],button[aria-label*="đóng" i]
){
  width:36px!important;
  min-width:36px!important;
  height:36px!important;
  min-height:36px!important;
  padding:0!important;
  border-radius:11px!important;
}

/* The linked-websites editor used in Teaching Tool Hub historically used a
   760px shell and 52px fields. Keep its useful preview column, but compact it. */
:where(.bes-compact-overlay.launcher-link-form,.bes-compact-overlay.launcher-link-manager){
  width:min(620px,calc(100vw - 32px))!important;
  max-width:min(620px,calc(100vw - 32px))!important;
  max-height:min(720px,88dvh)!important;
}

:where(.bes-compact-overlay.launcher-link-form) .launcher-link-form-header{
  padding:15px 18px 13px!important;
}
:where(.bes-compact-overlay.launcher-link-form) .launcher-link-form-content{
  grid-template-columns:minmax(0,1fr) 185px!important;
  gap:15px!important;
  padding:15px 18px!important;
}
:where(.bes-compact-overlay.launcher-link-form) .launcher-link-form-fields{
  gap:12px!important;
}
:where(.bes-compact-overlay.launcher-link-form) .launcher-link-field{
  gap:6px!important;
}
:where(.bes-compact-overlay.launcher-link-form) .launcher-link-field input{
  min-height:44px!important;
  padding:9px 12px!important;
}
:where(.bes-compact-overlay.launcher-link-form) .launcher-link-form-preview{
  gap:8px!important;
  padding:12px!important;
  border-radius:15px!important;
}
:where(.bes-compact-overlay.launcher-link-form) .launcher-link-form-note{
  margin:0 18px 13px!important;
  padding:9px 11px!important;
}
:where(.bes-compact-overlay.launcher-link-form) .launcher-link-form-footer{
  padding:11px 18px 13px!important;
}

/* Chat and app detail drawers are side drawers: narrow enough to preserve the
   page context while still leaving a comfortable reading column. */
:where(.shared-chatbot-drawer-v1167.bes-compact-side-drawer,.android-detail-panel.bes-compact-side-drawer){
  width:min(460px,calc(100vw - 20px))!important;
  max-width:min(460px,calc(100vw - 20px))!important;
}

@media(max-width:699px){
  :where(.bes-compact-overlay){
    --bes-compact-pad-x:14px;
    --bes-compact-control-height:43px;
    width:calc(100vw - 16px)!important;
    max-width:calc(100vw - 16px)!important;
    max-height:calc(100dvh - 16px)!important;
    border-radius:16px!important;
  }
  :where(.bes-compact-overlay.bes-compact-side-drawer){
    width:calc(100vw - 12px)!important;
    max-width:calc(100vw - 12px)!important;
    max-height:calc(100dvh - 12px)!important;
  }
  :where(.bes-compact-overlay.launcher-link-form) .launcher-link-form-content{
    grid-template-columns:minmax(0,1fr)!important;
  }
  :where(.bes-compact-overlay.launcher-link-form) .launcher-link-form-preview{
    display:none!important;
  }
}
`;

function classText(element) {
  return typeof element?.className === 'string' ? element.className : '';
}

function hasLargeMode(element) {
  return Boolean(element.matches?.(SKIP_SELECTOR) || element.closest?.('[data-bes-compact-drawer="off"]'));
}

function isBackdropLike(element) {
  if (!(element instanceof HTMLElement)) return false;
  const rect = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  const viewportSized = rect.width >= window.innerWidth * .9 && rect.height >= window.innerHeight * .9;
  if (style.position !== 'fixed' || !viewportSized) return false;
  return Array.from(element.children || []).some((child) => child.matches?.(OVERLAY_SELECTOR));
}

function markSection(child, type) {
  if (!(child instanceof HTMLElement)) return;
  child.classList.add(`bes-compact-overlay-${type}`);
}

function markSections(element) {
  const children = Array.from(element.children || []);
  children.forEach((child) => {
    const token = `${child.tagName || ''} ${classText(child)}`.toLowerCase();
    if (/\b(header|heading|head)\b|[-_](header|heading|head)(?:[-_\s]|$)/.test(token)) markSection(child, 'header');
    else if (/\b(footer)\b|[-_]footer(?:[-_\s]|$)/.test(token)) markSection(child, 'footer');
    else if (/\b(body|content|main|scroll|log|messages)\b|[-_](body|content|main|scroll|log|messages)(?:[-_\s]|$)/.test(token)) markSection(child, 'body');
  });

  /* A few long-lived overlays use named descendants rather than semantic tags. */
  element.querySelectorAll?.('.launcher-link-form-header').forEach((node) => markSection(node, 'header'));
  element.querySelectorAll?.('.launcher-link-form-content').forEach((node) => markSection(node, 'body'));
  element.querySelectorAll?.('.launcher-link-form-footer').forEach((node) => markSection(node, 'footer'));
}

function classifyOverlay(element) {
  if (!(element instanceof HTMLElement)) return;
  if (!element.matches?.(OVERLAY_SELECTOR) || hasLargeMode(element) || isBackdropLike(element)) return;

  element.classList.add('bes-compact-overlay');
  const token = `${classText(element)} ${element.getAttribute('data-variant') || ''}`;
  const isSideDrawer = /(^|[-_\s])(drawer|sheet)([-_\s]|$)|shared-chatbot-drawer|android-detail-panel/i.test(token);
  element.classList.toggle('bes-compact-side-drawer', isSideDrawer);
  markSections(element);
}

function ensureDocumentStyle() {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = compactCss;
  }
  /* Keeping this style last protects the compact geometry from route CSS that
     is imported lazily after a modal or drawer opens. */
  if (document.head?.lastElementChild !== style) document.head?.append(style);
}

function ensureShadowStyle(root) {
  if (!(root instanceof ShadowRoot)) return;
  let style = root.querySelector(`style[${SHADOW_STYLE_ATTR}]`);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute(SHADOW_STYLE_ATTR, 'true');
    style.textContent = compactCss;
    root.append(style);
  } else if (root.lastElementChild !== style) {
    root.append(style);
  }
}

function scanRoot(root) {
  if (!root) return;
  if (root instanceof Document) ensureDocumentStyle();
  if (root instanceof ShadowRoot) ensureShadowStyle(root);

  const start = root instanceof Document ? root.documentElement : root;
  if (start instanceof HTMLElement) classifyOverlay(start);
  const queryRoot = root instanceof Document || root instanceof ShadowRoot || root instanceof Element ? root : null;
  if (!queryRoot?.querySelectorAll) return;

  queryRoot.querySelectorAll(OVERLAY_SELECTOR).forEach((element) => classifyOverlay(element));
  queryRoot.querySelectorAll('*').forEach((element) => {
    if (element.shadowRoot) {
      observeRoot(element.shadowRoot);
      scanRoot(element.shadowRoot);
    }
  });
}

function flush() {
  animationFrame = 0;
  const roots = Array.from(pendingRoots);
  pendingRoots.clear();
  roots.forEach((root) => {
    try { scanRoot(root); } catch (error) { console.warn('[CompactDrawer] scan skipped', error); }
  });
}

function schedule(root = document) {
  pendingRoots.add(root || document);
  if (animationFrame) return;
  animationFrame = requestAnimationFrame(flush);
}

function observeRoot(root) {
  if (!root || OBSERVED_ROOTS.has(root)) return;
  OBSERVED_ROOTS.add(root);
  const observer = new MutationObserver((records) => {
    records.forEach((record) => {
      if (record.type === 'attributes') {
        schedule(record.target?.getRootNode?.() || document);
        return;
      }
      record.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) schedule(node.getRootNode?.() || document);
      });
    });
  });
  observer.observe(root, {
    childList:true,
    subtree:true,
    attributes:true,
    attributeFilter:['class','style','open','aria-modal','role'],
  });
}

export function installCompactDrawerRuntime() {
  if (typeof window === 'undefined' || window[INSTALL_FLAG]) return;
  window[INSTALL_FLAG] = true;

  const start = () => {
    ensureDocumentStyle();
    observeRoot(document.documentElement);
    schedule(document);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();

  window.addEventListener('hashchange', () => schedule(document));
  window.addEventListener('resize', () => schedule(document), { passive:true });
  window.addEventListener('load', () => schedule(document), { once:true });
  window.addEventListener('bes:appearance-changed', () => schedule(document));

  window.BESCompactDrawer = Object.freeze({
    rescan:() => schedule(document),
    maxModalWidth:620,
    maxSideDrawerWidth:460,
  });
}

installCompactDrawerRuntime();
