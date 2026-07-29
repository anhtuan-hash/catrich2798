const RANGE_SELECTOR = '.hero-editor .hero-editor__range input[type="range"]';
const STRUCTURE_SELECTOR = '.hero-editor__body, .hero-editor__panel, .hero-editor__section';
const enhancedRanges = new WeakSet();
let scanFrame = 0;

function numericAttribute(input, name, fallback) {
  const value = Number(input.getAttribute(name));
  return Number.isFinite(value) ? value : fallback;
}

function decimalPlaces(value) {
  const text = String(value);
  const decimal = text.indexOf('.');
  return decimal < 0 ? 0 : text.length - decimal - 1;
}

function valueFromClientX(input, clientX) {
  const rect = input.getBoundingClientRect();
  const min = numericAttribute(input, 'min', 0);
  const max = numericAttribute(input, 'max', 100);
  const step = Math.max(Number.EPSILON, numericAttribute(input, 'step', 1));
  const ratio = rect.width > 0 ? Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) : 0;
  const raw = min + ratio * (max - min);
  const stepped = min + Math.round((raw - min) / step) * step;
  const precision = Math.max(decimalPlaces(step), decimalPlaces(min));
  return Math.max(min, Math.min(max, Number(stepped.toFixed(precision))));
}

function dispatchRangeValue(input, value) {
  const next = String(value);
  if (input.value === next) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  if (setter) setter.call(input, next);
  else input.value = next;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function enhanceRange(input) {
  if (!input || enhancedRanges.has(input)) return;
  enhancedRanges.add(input);
  let activePointerId = null;

  const update = (event) => {
    if (activePointerId !== null && event.pointerId !== activePointerId) return;
    dispatchRangeValue(input, valueFromClientX(input, event.clientX));
  };

  input.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    activePointerId = event.pointerId;
    input.focus({ preventScroll: true });
    try { input.setPointerCapture(event.pointerId); } catch {}
    update(event);
    event.preventDefault();
  }, { passive: false });

  input.addEventListener('pointermove', (event) => {
    if (activePointerId === null || event.pointerId !== activePointerId) return;
    update(event);
    event.preventDefault();
  }, { passive: false });

  const finish = (event) => {
    if (activePointerId === null || event.pointerId !== activePointerId) return;
    update(event);
    try { input.releasePointerCapture(event.pointerId); } catch {}
    activePointerId = null;
    event.preventDefault();
  };

  input.addEventListener('pointerup', finish, { passive: false });
  input.addEventListener('pointercancel', (event) => {
    if (event.pointerId === activePointerId) activePointerId = null;
  });
}

function lockEditorBackground(editor) {
  editor.querySelectorAll(STRUCTURE_SELECTOR).forEach((node) => {
    node.style.setProperty('background-color', '#f8fafd', 'important');
    node.style.setProperty('background-image', 'none', 'important');
  });
  editor.querySelectorAll('.hero-editor__section > .hero-editor__section-title, .hero-editor__section > .hero-editor__languages, .hero-editor__section > .hero-editor__field, .hero-editor__section > .hero-editor__grid, .hero-editor__section > .hero-editor__card, .hero-editor__section > .hero-editor__upload').forEach((node) => {
    node.style.setProperty('background-color', '#ffffff', 'important');
    node.style.setProperty('background-image', 'none', 'important');
  });
}

function scan() {
  document.querySelectorAll('.hero-editor').forEach((editor) => lockEditorBackground(editor));
  document.querySelectorAll(RANGE_SELECTOR).forEach(enhanceRange);
}

function queueScan() {
  if (scanFrame) return;
  scanFrame = window.requestAnimationFrame(() => {
    scanFrame = 0;
    scan();
  });
}

if (!window.__brianHeroEditorInteractionFixInstalled) {
  window.__brianHeroEditorInteractionFixInstalled = true;
  const observer = new MutationObserver(queueScan);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('DOMContentLoaded', queueScan, { once: true });
  queueScan();
}
