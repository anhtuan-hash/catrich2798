import { getRuntimeState, subscribeRuntime } from './services/runtime/core.js';
import { canManageSupplementalLearning } from './supplementalAccess.js';

const INSTALL_KEY = '__besSupplementalClassNavigationBridgeInstalled';
let runtime = null;
let observer = null;

function nextFrame(callback) {
  requestAnimationFrame(() => requestAnimationFrame(callback));
}

function clearRestrictedReporting() {
  document.getElementById('bes-supplemental-reporting-panel')?.remove();
  document.getElementById('bes-supplemental-activity-filter')?.remove();
  document.body.classList.remove('bes-supplemental-report-exclusive');
}

function normalizeVisibleLabels() {
  if (!canManageSupplementalLearning(runtime || getRuntimeState())) {
    clearRestrictedReporting();
    return;
  }
  document.querySelectorAll('.bes-supplemental-history-card .bes-supplemental-source-badge').forEach((badge) => {
    if (/HỌC BỔ SUNG/i.test(badge.textContent || '')) badge.textContent = 'HỌC BỔ SUNG';
  });
  const query = document.querySelector('[data-report-query]');
  if (query?.getAttribute('placeholder')?.includes('nhóm')) {
    query.setAttribute('placeholder', 'Học sinh, môn, lớp, giáo viên');
  }
}

function openFilteredHistory(event) {
  if (!canManageSupplementalLearning(runtime || getRuntimeState())) return;
  const className = String(event?.detail?.className || '').trim();
  nextFrame(() => {
    document.querySelector('[data-activity-filter="supplemental"]')?.click();
    nextFrame(() => {
      const query = document.querySelector('[data-report-query]');
      if (query && className) {
        query.value = className;
        query.dispatchEvent(new Event('input', { bubbles: true }));
        query.dispatchEvent(new Event('change', { bubbles: true }));
      }
      document.querySelector('[data-report-refresh]')?.click();
      normalizeVisibleLabels();
    });
  });
}

function install() {
  if (window[INSTALL_KEY]) return;
  window[INSTALL_KEY] = true;
  runtime = getRuntimeState();
  window.addEventListener('bes-supplemental-open-history', openFilteredHistory);
  subscribeRuntime((next) => {
    runtime = next || getRuntimeState();
    normalizeVisibleLabels();
  });
  observer = new MutationObserver(normalizeVisibleLabels);
  observer.observe(document.body, { childList: true, subtree: true });
  normalizeVisibleLabels();
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') install();
