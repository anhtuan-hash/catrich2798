import { ensureRuntimeReady, getRuntimeState, subscribeRuntime } from './services/runtime/core.js';
import { canManageSupplementalLearning } from './supplementalAccess.js';

const INSTALL_KEY = '__besSupplementalLearningRouteBootstrapInstalled';
let loaded = false;
let loading = null;
let observer = null;
let runtime = null;

function isAttendanceRoute() {
  return /attendance|diem-danh/i.test(window.location.hash || '')
    || Boolean(document.querySelector('.attendance-tabs,[data-attendance-daily-status-root]'));
}

function clearSupplementalUi() {
  document.querySelector('.bes-supplemental-nav-tab')?.remove();
  document.getElementById('bes-supplemental-learning-admin')?.remove();
  document.getElementById('bes-supplemental-rollcall')?.remove();
  document.getElementById('bes-supplemental-reporting-panel')?.remove();
  document.getElementById('bes-supplemental-activity-filter')?.remove();
  document.querySelectorAll('.bes-supplemental-daily-section').forEach((node) => node.remove());
  document.body.classList.remove('bes-supplemental-report-exclusive');
}

async function ensureSupplementalAttendance() {
  if (!isAttendanceRoute() || !canManageSupplementalLearning(runtime || getRuntimeState())) {
    clearSupplementalUi();
    return null;
  }
  if (loaded || loading) return loading;

  loading = import('./supplementalSingleModalBridge.js')
    .then(() => Promise.all([
      import('./supplementalLearningBootstrap.js'),
      import('./supplementalAttendanceQuickBootstrap.js'),
      import('./supplementalAttendanceReportingBootstrap.js'),
      import('./supplementalClassNavigationBridge.js'),
      import('./styles/SupplementalLearningAdminCompleteness.css'),
    ]))
    .then(() => { loaded = true; })
    .catch((error) => {
      console.error('[SupplementalLearning] Không thể tải tiện ích Học bổ sung.', error);
      window.dispatchEvent(new CustomEvent('bes-supplemental-learning-load-error', {
        detail: { message: String(error?.message || error || 'Unknown supplemental learning bootstrap error') },
      }));
    })
    .finally(() => { loading = null; });
  return loading;
}

async function install() {
  if (window[INSTALL_KEY]) return;
  window[INSTALL_KEY] = true;
  try { await ensureRuntimeReady(); } catch { /* runtime can recover */ }
  runtime = getRuntimeState();

  window.addEventListener('hashchange', () => void ensureSupplementalAttendance());
  observer = new MutationObserver(() => {
    if (isAttendanceRoute()) void ensureSupplementalAttendance();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  subscribeRuntime((next) => {
    runtime = next || getRuntimeState();
    if (!canManageSupplementalLearning(runtime)) clearSupplementalUi();
    else if (isAttendanceRoute()) void ensureSupplementalAttendance();
  });

  void ensureSupplementalAttendance();
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') install();
