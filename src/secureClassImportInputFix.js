const INPUT_SELECTOR = '[data-import-code]';
const SUBMIT_SELECTOR = '[data-import-submit]';
const EXPECTED_LENGTH = 24;

function normalizeImportCode(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/[^A-Za-z0-9]/g, '');
}

function normalizeInput(input, announce = false) {
  if (!(input instanceof HTMLInputElement) || !input.matches(INPUT_SELECTOR)) return;
  const normalized = normalizeImportCode(input.value);
  if (input.value !== normalized) input.value = normalized;
  if (!announce) return;
  const root = input.closest('#bes-secure-class-import-root');
  const message = root?.querySelector('[data-import-message]');
  if (!message || message.dataset.kind === 'working' || message.dataset.kind === 'success') return;
  message.textContent = normalized.length
    ? `Đã nhận ${normalized.length}/${EXPECTED_LENGTH} ký tự.`
    : '';
  message.dataset.kind = normalized.length === EXPECTED_LENGTH ? 'working' : '';
}

function inputFromEventTarget(target) {
  if (target instanceof HTMLInputElement && target.matches(INPUT_SELECTOR)) return target;
  return document.querySelector(INPUT_SELECTOR);
}

document.addEventListener('paste', (event) => {
  const input = inputFromEventTarget(event.target);
  if (!input) return;
  window.setTimeout(() => normalizeInput(input, true), 0);
}, true);

document.addEventListener('input', (event) => {
  const input = inputFromEventTarget(event.target);
  if (input) normalizeInput(input, true);
}, true);

document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element) || !event.target.closest(SUBMIT_SELECTOR)) return;
  const input = document.querySelector(INPUT_SELECTOR);
  if (input) normalizeInput(input, true);
}, true);

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  const input = inputFromEventTarget(event.target);
  if (input) normalizeInput(input, true);
}, true);

window.__BES_SECURE_CLASS_CODE_NORMALIZER__ = Object.freeze({
  expectedLength: EXPECTED_LENGTH,
  normalize: normalizeImportCode,
});
