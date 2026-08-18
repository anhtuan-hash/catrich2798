/*
 * Brian English — Compact Drawer Runtime V3
 *
 * V2 used :where(...), which deliberately has zero selector specificity.
 * Several feature styles (for example .tth-modal) therefore won even when
 * both declarations were !important. V3 uses repeated-class specificity so
 * the compact geometry reliably wins without having to rewrite every module.
 */

const STYLE_ID = 'bes-compact-drawer-v3-style';
const SHADOW_STYLE_ATTR = 'data-bes-compact-drawer-v3-style';
const INSTALL_FLAG = '__BES_COMPACT_DRAWER_RUNTIME_V3__';
const observedRoots = new WeakSet();
const queuedRoots = new Set();
let frame = 0;

const SHELL_SELECTOR = [
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

const BACKDROP_SELECTOR = [
  '[class$="-backdrop"]', '[class*="-backdrop "]',
  '[class$="-scrim"]', '[class*="-scrim "]',
  '[class$="-overlay"]', '[class*="-overlay "]',
  '[class$="-layer"]', '[class*="-layer "]',
  '[data-modal-backdrop]', '[data-dialog-backdrop]',
].join(',');

const SKIP_SELECTOR = [
  '[data-bes-compact-drawer="off"]',
  '[data-bes-drawer-size="wide"]', '[data-bes-drawer-size="full"]',
  '[data-bes-modal-size="wide"]', '[data-bes-modal-size="full"]',
  '.fullscreen', '.full-screen', '.is-fullscreen',
  '.wide-modal', '.wide-dialog', '.modal-full', '.dialog-full',
].join(',');

const css = `
/* ===== Global compact geometry ===== */
.bes-compact-overlay.bes-compact-overlay{
  --bes-cd-width:560px;
  --bes-cd-side-width:400px;
  --bes-cd-pad-x:16px;
  --bes-cd-control-h:40px;
  box-sizing:border-box!important;
  width:min(var(--bes-cd-width),calc(100vw - 28px))!important;
  max-width:min(var(--bes-cd-width),calc(100vw - 28px))!important;
  height:auto!important;
  max-height:min(640px,82dvh)!important;
  border-radius:18px!important;
  overscroll-behavior:contain!important;
}
.bes-compact-overlay.bes-compact-overlay:not(.bes-compact-side-drawer){overflow:auto!important}
.bes-compact-overlay.bes-compact-overlay.bes-compact-side-drawer{
  --bes-cd-width:var(--bes-cd-side-width);
  width:min(var(--bes-cd-side-width),calc(100vw - 16px))!important;
  max-width:min(var(--bes-cd-side-width),calc(100vw - 16px))!important;
  height:calc(100dvh - 16px)!important;
  max-height:calc(100dvh - 16px)!important;
  border-radius:16px!important;
}

.bes-compact-overlay.bes-compact-overlay .bes-compact-overlay-header{
  padding:12px var(--bes-cd-pad-x) 10px!important;
  gap:10px!important;
}
.bes-compact-overlay.bes-compact-overlay .bes-compact-overlay-body{
  padding:12px var(--bes-cd-pad-x)!important;
  gap:10px!important;
  overflow:auto!important;
  overscroll-behavior:contain!important;
}
.bes-compact-overlay.bes-compact-overlay .bes-compact-overlay-footer{
  padding:9px var(--bes-cd-pad-x) 11px!important;
  gap:7px!important;
}
.bes-compact-overlay.bes-compact-overlay .bes-compact-overlay-header h1,
.bes-compact-overlay.bes-compact-overlay .bes-compact-overlay-header h2,
.bes-compact-overlay.bes-compact-overlay .bes-compact-overlay-header h3,
.bes-compact-overlay.bes-compact-overlay .bes-compact-overlay-header [class$="-title"],
.bes-compact-overlay.bes-compact-overlay .bes-compact-overlay-header [class*="-title "]{
  margin-block:0!important;
  font-size:clamp(1.16rem,1.55vw,1.34rem)!important;
  line-height:1.16!important;
  letter-spacing:-.025em!important;
}
.bes-compact-overlay.bes-compact-overlay .bes-compact-overlay-header p,
.bes-compact-overlay.bes-compact-overlay .bes-compact-overlay-header small,
.bes-compact-overlay.bes-compact-overlay .bes-compact-overlay-header [class$="-subtitle"],
.bes-compact-overlay.bes-compact-overlay .bes-compact-overlay-header [class*="-subtitle "]{
  margin-block:.12rem 0!important;
  font-size:.78rem!important;
  line-height:1.35!important;
}

.bes-compact-overlay.bes-compact-overlay input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]):not([type="button"]):not([type="submit"]):not([type="reset"]),
.bes-compact-overlay.bes-compact-overlay select{
  min-height:var(--bes-cd-control-h)!important;
  height:var(--bes-cd-control-h)!important;
  padding:7px 10px!important;
  border-radius:10px!important;
  font-size:.9rem!important;
  line-height:1.28!important;
}
.bes-compact-overlay.bes-compact-overlay textarea{
  min-height:68px!important;
  padding:8px 10px!important;
  border-radius:10px!important;
  font-size:.9rem!important;
  line-height:1.38!important;
}
.bes-compact-overlay.bes-compact-overlay label,
.bes-compact-overlay.bes-compact-overlay [class$="-label"],
.bes-compact-overlay.bes-compact-overlay [class*="-label "]{
  font-size:.8rem!important;
  line-height:1.25!important;
}
.bes-compact-overlay.bes-compact-overlay button,
.bes-compact-overlay.bes-compact-overlay [role="button"]{
  min-height:36px!important;
}
.bes-compact-overlay.bes-compact-overlay button[aria-label*="close" i],
.bes-compact-overlay.bes-compact-overlay button[aria-label*="đóng" i],
.bes-compact-overlay.bes-compact-overlay [class$="-close"],
.bes-compact-overlay.bes-compact-overlay [class*="-close "]{
  width:32px!important;
  min-width:32px!important;
  height:32px!important;
  min-height:32px!important;
  padding:0!important;
  border-radius:10px!important;
}

/* ===== Teaching Tool Hub: exact editor shown in the report ===== */
.bes-compact-overlay.bes-compact-overlay.tth-modal{
  --bes-cd-width:560px;
  width:min(560px,calc(100vw - 28px))!important;
  max-width:min(560px,calc(100vw - 28px))!important;
  max-height:min(610px,82dvh)!important;
  border-radius:18px!important;
}
.bes-compact-overlay.bes-compact-overlay.tth-modal > header{
  padding:11px 16px 10px!important;
}
.bes-compact-overlay.bes-compact-overlay.tth-modal > header span{
  font-size:.58rem!important;
  letter-spacing:.1em!important;
}
.bes-compact-overlay.bes-compact-overlay.tth-modal > header h2{
  margin:2px 0 0!important;
  font-size:1.28rem!important;
  line-height:1.16!important;
}
.bes-compact-overlay.bes-compact-overlay.tth-modal .tth-form-grid{
  gap:9px 11px!important;
  padding:11px 16px!important;
}
.bes-compact-overlay.bes-compact-overlay.tth-modal .tth-form-grid label{
  gap:4px!important;
  font-size:.76rem!important;
}
.bes-compact-overlay.bes-compact-overlay.tth-modal .tth-form-grid input{
  height:40px!important;
  min-height:40px!important;
  padding:0 10px!important;
}
.bes-compact-overlay.bes-compact-overlay.tth-modal .tth-form-grid textarea{
  min-height:66px!important;
  height:66px!important;
  padding:8px 10px!important;
  resize:vertical!important;
}
.bes-compact-overlay.bes-compact-overlay.tth-modal .tth-switch{
  gap:8px!important;
  padding:9px 10px!important;
  border-radius:11px!important;
}
.bes-compact-overlay.bes-compact-overlay.tth-modal .tth-switch input{
  width:18px!important;
  min-width:18px!important;
  height:18px!important;
  min-height:18px!important;
  padding:0!important;
}
.bes-compact-overlay.bes-compact-overlay.tth-modal .tth-switch small{
  font-size:.68rem!important;
  line-height:1.25!important;
}
.bes-compact-overlay.bes-compact-overlay.tth-modal .tth-form-error{
  margin:0 16px 8px!important;
  padding:8px 10px!important;
}
.bes-compact-overlay.bes-compact-overlay.tth-modal > footer{
  padding:9px 16px 11px!important;
}
.bes-compact-overlay.bes-compact-overlay.tth-modal > footer button{
  min-height:36px!important;
  padding:0 13px!important;
  border-radius:10px!important;
  font-size:.78rem!important;
}

/* Teacher sharing needs a scrollable list, but should still be substantially
   smaller than the old 720×760 shell. */
.bes-compact-overlay.bes-compact-overlay.tth-share-modal{
  --bes-cd-width:600px;
  width:min(600px,calc(100vw - 28px))!important;
  max-width:min(600px,calc(100vw - 28px))!important;
  height:min(590px,82dvh)!important;
  max-height:min(590px,82dvh)!important;
}
.bes-compact-overlay.bes-compact-overlay.tth-share-modal .tth-share-tools{
  padding:10px 16px 7px!important;
  gap:8px!important;
}
.bes-compact-overlay.bes-compact-overlay.tth-share-modal .tth-share-summary{
  padding:2px 17px 8px!important;
}
.bes-compact-overlay.bes-compact-overlay.tth-share-modal .tth-teacher-list{
  padding:5px 16px 10px!important;
  gap:6px!important;
}
.bes-compact-overlay.bes-compact-overlay.tth-share-modal .tth-teacher-row{
  min-height:54px!important;
  padding:6px 9px!important;
  gap:9px!important;
  border-radius:12px!important;
}

/* Older linked-site editor variants. */
.bes-compact-overlay.bes-compact-overlay.launcher-link-form,
.bes-compact-overlay.bes-compact-overlay.launcher-link-manager{
  --bes-cd-width:560px;
  width:min(560px,calc(100vw - 28px))!important;
  max-width:min(560px,calc(100vw - 28px))!important;
  max-height:min(610px,82dvh)!important;
}
.bes-compact-overlay.bes-compact-overlay.launcher-link-form .launcher-link-form-header{padding:11px 16px 10px!important}
.bes-compact-overlay.bes-compact-overlay.launcher-link-form .launcher-link-form-content{grid-template-columns:minmax(0,1fr) 160px!important;gap:11px!important;padding:11px 16px!important}
.bes-compact-overlay.bes-compact-overlay.launcher-link-form .launcher-link-form-fields{gap:8px!important}
.bes-compact-overlay.bes-compact-overlay.launcher-link-form .launcher-link-field{gap:4px!important}
.bes-compact-overlay.bes-compact-overlay.launcher-link-form .launcher-link-form-preview{gap:6px!important;padding:9px!important;border-radius:12px!important}
.bes-compact-overlay.bes-compact-overlay.launcher-link-form .launcher-link-form-note{margin:0 16px 9px!important;padding:7px 9px!important}
.bes-compact-overlay.bes-compact-overlay.launcher-link-form .launcher-link-form-footer{padding:9px 16px 11px!important}

.shared-chatbot-drawer-v1167.bes-compact-overlay.bes-compact-side-drawer,
.android-detail-panel.bes-compact-overlay.bes-compact-side-drawer{
  --bes-cd-side-width:400px;
  width:min(400px,calc(100vw - 16px))!important;
  max-width:min(400px,calc(100vw - 16px))!important;
}

@media(max-width:699px){
  .bes-compact-overlay.bes-compact-overlay{
    --bes-cd-pad-x:13px;
    --bes-cd-control-h:40px;
    width:calc(100vw - 12px)!important;
    max-width:calc(100vw - 12px)!important;
    max-height:calc(100dvh - 12px)!important;
    border-radius:15px!important;
  }
  .bes-compact-overlay.bes-compact-overlay.bes-compact-side-drawer{
    width:calc(100vw - 8px)!important;
    max-width:calc(100vw - 8px)!important;
    height:calc(100dvh - 8px)!important;
    max-height:calc(100dvh - 8px)!important;
  }
  .bes-compact-overlay.bes-compact-overlay.tth-modal .tth-form-grid{
    grid-template-columns:1fr!important;
  }
  .bes-compact-overlay.bes-compact-overlay.tth-modal .tth-form-grid label.is-wide{
    grid-column:auto!important;
  }
  .bes-compact-overlay.bes-compact-overlay.launcher-link-form .launcher-link-form-content{
    grid-template-columns:minmax(0,1fr)!important;
  }
  .bes-compact-overlay.bes-compact-overlay.launcher-link-form .launcher-link-form-preview{display:none!important}
}
`;

function classText(element) {
  return typeof element?.className === 'string' ? element.className : '';
}

function skipped(element) {
  return Boolean(element?.matches?.(SKIP_SELECTOR) || element?.closest?.('[data-bes-compact-drawer="off"]'));
}

function looksViewportBackdrop(element) {
  if (!(element instanceof HTMLElement)) return false;
  const style = getComputedStyle(element);
  if (style.position !== 'fixed') return false;
  const rect = element.getBoundingClientRect();
  return rect.width >= window.innerWidth * .9 && rect.height >= window.innerHeight * .84;
}

function markSection(element, type) {
  if (element instanceof HTMLElement && !element.classList.contains(`bes-compact-overlay-${type}`)) {
    element.classList.add(`bes-compact-overlay-${type}`);
  }
}

function markDirectSections(shell) {
  Array.from(shell.children || []).forEach((child) => {
    const token = `${child.tagName || ''} ${classText(child)}`.toLowerCase();
    if (/\b(header|heading|head)\b|[-_](header|heading|head)(?:[-_\s]|$)/.test(token)) markSection(child, 'header');
    else if (/\bfooter\b|[-_]footer(?:[-_\s]|$)/.test(token)) markSection(child, 'footer');
    else if (/\b(body|content|main|scroll|log|messages|fields|form-grid|form-content)\b|[-_](body|content|main|scroll|log|messages|fields|form-grid|form-content)(?:[-_\s]|$)/.test(token)) markSection(child, 'body');
  });

  shell.querySelectorAll?.('.tth-form-grid,.launcher-link-form-content,.launcher-link-form-fields').forEach((node) => markSection(node, 'body'));
  shell.querySelectorAll?.('.launcher-link-form-header').forEach((node) => markSection(node, 'header'));
  shell.querySelectorAll?.('.launcher-link-form-footer').forEach((node) => markSection(node, 'footer'));
}

function applyCompactClass(shell, { force = false } = {}) {
  if (!(shell instanceof HTMLElement) || skipped(shell)) return;
  if (!force && !shell.matches?.(SHELL_SELECTOR)) return;

  if (looksViewportBackdrop(shell) && Array.from(shell.children || []).some((child) => child.matches?.(SHELL_SELECTOR))) return;

  if (!shell.classList.contains('bes-compact-overlay')) shell.classList.add('bes-compact-overlay');
  const token = `${classText(shell)} ${shell.getAttribute('data-variant') || ''}`;
  const side = /(^|[-_\s])(drawer|sheet)([-_\s]|$)|shared-chatbot-drawer|android-detail-panel/i.test(token);
  if (shell.classList.contains('bes-compact-side-drawer') !== side) shell.classList.toggle('bes-compact-side-drawer', side);
  markDirectSections(shell);
}

function boundedBackdropChild(backdrop) {
  if (!looksViewportBackdrop(backdrop) || skipped(backdrop)) return null;
  const visibleChildren = Array.from(backdrop.children || []).filter((child) => {
    if (!(child instanceof HTMLElement)) return false;
    const style = getComputedStyle(child);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    const rect = child.getBoundingClientRect();
    return rect.width >= 280 && rect.width <= Math.min(980, window.innerWidth * .9) && rect.height >= 120 && rect.height <= window.innerHeight * .96;
  });
  if (visibleChildren.length !== 1) return null;
  return visibleChildren[0];
}

function classifyBackdrop(backdrop) {
  if (!(backdrop instanceof HTMLElement) || !backdrop.matches?.(BACKDROP_SELECTOR)) return;
  const child = boundedBackdropChild(backdrop);
  if (child) applyCompactClass(child, { force: true });
}

function ensureDocumentStyle() {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
  }
  if (document.head?.lastElementChild !== style) document.head?.append(style);
}

function ensureShadowStyle(root) {
  if (!(root instanceof ShadowRoot)) return;
  let style = root.querySelector(`style[${SHADOW_STYLE_ATTR}]`);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute(SHADOW_STYLE_ATTR, 'true');
    style.textContent = css;
    root.append(style);
  } else if (root.lastElementChild !== style) {
    root.append(style);
  }
}

function scan(root) {
  if (!root) return;
  if (root instanceof Document) ensureDocumentStyle();
  if (root instanceof ShadowRoot) ensureShadowStyle(root);

  const queryRoot = root instanceof Document || root instanceof ShadowRoot || root instanceof Element ? root : null;
  if (!queryRoot?.querySelectorAll) return;

  if (root instanceof HTMLElement) {
    applyCompactClass(root);
    classifyBackdrop(root);
  }
  queryRoot.querySelectorAll(SHELL_SELECTOR).forEach((node) => applyCompactClass(node));
  queryRoot.querySelectorAll(BACKDROP_SELECTOR).forEach((node) => classifyBackdrop(node));
  queryRoot.querySelectorAll('*').forEach((node) => {
    if (node.shadowRoot) {
      observe(node.shadowRoot);
      scan(node.shadowRoot);
    }
  });
}

function flush() {
  frame = 0;
  const roots = Array.from(queuedRoots);
  queuedRoots.clear();
  roots.forEach((root) => {
    try { scan(root); } catch (error) { console.warn('[CompactDrawerV3] scan skipped', error); }
  });
}

function schedule(root = document) {
  queuedRoots.add(root || document);
  if (frame) return;
  frame = requestAnimationFrame(flush);
}

function observe(root) {
  if (!root || observedRoots.has(root)) return;
  observedRoots.add(root);
  const observer = new MutationObserver((records) => {
    records.forEach((record) => {
      if (record.type === 'attributes') {
        schedule(record.target);
        return;
      }
      record.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) schedule(node);
      });
    });
  });
  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'open', 'aria-modal', 'role'],
  });
}

export function installCompactDrawerRuntimeV3() {
  if (typeof window === 'undefined' || window[INSTALL_FLAG]) return;
  window[INSTALL_FLAG] = true;

  const start = () => {
    ensureDocumentStyle();
    observe(document.documentElement);
    schedule(document);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();

  window.addEventListener('hashchange', () => schedule(document));
  window.addEventListener('resize', () => schedule(document), { passive: true });
  window.addEventListener('load', () => { ensureDocumentStyle(); schedule(document); }, { once: true });
  window.addEventListener('bes:appearance-changed', () => schedule(document));

  window.BESCompactDrawer = Object.freeze({
    version: 3,
    rescan: () => { ensureDocumentStyle(); schedule(document); },
    maxModalWidth: 560,
    maxSideDrawerWidth: 400,
  });
}

installCompactDrawerRuntimeV3();
