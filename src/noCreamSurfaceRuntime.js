/*
 * Brian English — runtime near-white warm-surface neutralizer.
 *
 * Performance-safe version: CSS handles known form controls and this runtime
 * performs bounded scans only at startup, route changes and appearance changes.
 * It deliberately avoids a document-wide MutationObserver.
 */

const RUNTIME_FLAG = '__BES_NO_CREAM_RUNTIME_V1__';
const pendingRoots = new Set();
let frame = 0;

const SKIP_SELECTOR = [
  '[data-bes-allow-cream]',
  '[role="alert"]',
  '[role="status"]',
  '[class*="warning"]',
  '[class*="alert"]',
  '[class*="status"]',
  '[class*="badge"]',
  '[class*="chip"]',
  '[class*="toast"]',
  '[class*="notice"]',
  '[class*="error"]',
  '[class*="success"]',
  '[class*="pending"]',
  '[class*="star"]',
  '[class*="pin"]',
  '[class*="highlight"]',
  '[class*="yellow"]',
  '[class*="amber"]',
  '[class*="gold"]',
].join(',');

const FORM_SURFACE_SELECTOR = [
  'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]):not([type="button"]):not([type="submit"]):not([type="reset"])',
  'textarea',
  'select',
  '[contenteditable="true"]',
].join(',');

const SURFACE_SELECTOR = [
  FORM_SURFACE_SELECTOR,
  'dialog',
  '[role="dialog"]',
  '[aria-modal="true"]',
  '.card', '.panel', '.surface', '.sheet', '.drawer', '.modal', '.popover',
  '[class$="-card"]', '[class*="-card "]',
  '[class$="-panel"]', '[class*="-panel "]',
  '[class$="-surface"]', '[class*="-surface "]',
  '[class$="-sheet"]', '[class*="-sheet "]',
  '[class$="-drawer"]', '[class*="-drawer "]',
  '[class$="-modal"]', '[class*="-modal "]',
  '[class$="-dialog"]', '[class*="-dialog "]',
  '[class$="-popover"]', '[class*="-popover "]',
  '[class$="-field"]', '[class*="-field "]',
  '[class$="-input"]', '[class*="-input "]',
  '[class$="-control"]', '[class*="-control "]',
  '[class$="-form"]', '[class*="-form "]',
].join(',');

function parseRgb(value) {
  const match = String(value || '').match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/i);
  if (!match) return null;
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
    a: match[4] == null ? 1 : Number(match[4]),
  };
}

function isCreamRgb(rgb) {
  if (!rgb || rgb.a <= 0.03) return false;
  const { r, g, b } = rgb;
  const warmDelta = r - b;
  return r >= 245
    && g >= 240
    && b >= 235
    && r >= g
    && g >= b
    && warmDelta >= 4
    && warmDelta <= 18
    && (g - b) >= 1;
}

function neutralizeWarmGradient(image) {
  if (!image || image === 'none' || !/gradient/i.test(image)) return null;
  let changed = false;
  const next = image.replace(/rgba?\(\s*[\d.]+\s*[, ]\s*[\d.]+\s*[, ]\s*[\d.]+(?:\s*[,/]\s*[\d.]+)?\s*\)/gi, (token) => {
    const rgb = parseRgb(token);
    if (!isCreamRgb(rgb)) return token;
    changed = true;
    return rgb?.a != null && rgb.a < 1 ? `rgba(255, 255, 255, ${rgb.a})` : 'rgb(255, 255, 255)';
  });
  return changed ? next : null;
}

function isSemanticSurface(element) {
  return Boolean(element.closest?.(SKIP_SELECTOR));
}

function neutralizeElement(element) {
  if (!(element instanceof HTMLElement)) return;
  if (!element.matches(SURFACE_SELECTOR)) return;
  if (element.hasAttribute('data-bes-allow-cream') || isSemanticSurface(element)) return;

  const style = getComputedStyle(element);
  const background = parseRgb(style.backgroundColor);
  const isFormSurface = element.matches(FORM_SURFACE_SELECTOR);

  if (isFormSurface) {
    const disabled = element.matches(':disabled') || element.matches('input:read-only,textarea:read-only');
    const target = disabled ? '#f7f9fc' : '#ffffff';
    const expectedRgb = disabled ? 'rgb(247, 249, 252)' : 'rgb(255, 255, 255)';
    if (style.backgroundColor !== expectedRgb) {
      element.style.setProperty('background-color', target, 'important');
    }
    if (style.backgroundImage !== 'none') {
      element.style.setProperty('background-image', 'none', 'important');
    }
    element.dataset.besNoCream = 'form';
    return;
  }

  if (isCreamRgb(background)) {
    element.style.setProperty('background-color', '#ffffff', 'important');
    element.dataset.besNoCream = 'surface';
  }

  const gradient = neutralizeWarmGradient(style.backgroundImage);
  if (gradient) {
    element.style.setProperty('background-image', gradient, 'important');
    element.dataset.besNoCream = 'gradient';
  }
}

function scanTree(root) {
  if (!root) return;
  if (root instanceof HTMLElement) neutralizeElement(root);

  const queryRoot = root instanceof Document || root instanceof ShadowRoot || root instanceof Element ? root : null;
  if (!queryRoot?.querySelectorAll) return;

  queryRoot.querySelectorAll(SURFACE_SELECTOR).forEach((element) => {
    neutralizeElement(element);
    if (element.shadowRoot) scanTree(element.shadowRoot);
  });

  queryRoot.querySelectorAll('*').forEach((element) => {
    if (element.shadowRoot) scanTree(element.shadowRoot);
  });
}

function flush() {
  frame = 0;
  const roots = Array.from(pendingRoots);
  pendingRoots.clear();
  roots.forEach((root) => {
    try { scanTree(root); } catch (error) { console.warn('[NoCream] scan skipped', error); }
  });
}

function schedule(root) {
  pendingRoots.add(root || document);
  if (frame) return;
  frame = requestAnimationFrame(flush);
}

export function installNoCreamSurfaceRuntime() {
  if (typeof window === 'undefined' || window[RUNTIME_FLAG]) return;
  window[RUNTIME_FLAG] = true;

  const start = () => schedule(document);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();

  // These are infrequent lifecycle boundaries, unlike continuous DOM mutation
  // observation. They preserve the visual cleanup without main-thread churn.
  window.addEventListener('hashchange', () => schedule(document));
  window.addEventListener('load', () => schedule(document), { once: true });
  window.addEventListener('bes:appearance-changed', () => schedule(document));
}

installNoCreamSurfaceRuntime();
