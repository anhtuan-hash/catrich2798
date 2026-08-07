import './tabResumeStability.js';
import './tabResumeAuthStability.js';
import './fourClassLocalPurge.js';
import './directClassRosterImportBootstrap.js';
import './styles/MotionRestore.css';
import './components/GlobalHomeroomMaterial3Refinement.css';
import {
  installSiteFontFromCache,
  loadSiteFontSetting,
  waitForSiteFontReady,
} from './utils/siteFontSettings.js';

const MAX_WAIT_MS = 20000;
const STARTED_AT = Date.now();
let externalAppsLoaded = false;
let externalAppsScheduled = false;
let applicationStarted = false;
let schoolRegistryLoaded = false;
let homeroomExtrasLoaded = false;
let routeListenerInstalled = false;
let assignedClassSyncPromise = null;

function runWhenIdle(callback, timeout = 1800) {
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => callback(), { timeout });
    return;
  }
  window.setTimeout(callback, Math.min(timeout, 650));
}

function isHomeroomRoute() {
  return /homeroom|chu-nhiem|gvcn/i.test(window.location.hash || '');
}

function isBrianTeamRoute() {
  return /brian-team|personnel-hub|work-hub/i.test(window.location.hash || '');
}

function isAssignedClassRoute() {
  return isHomeroomRoute() || isBrianTeamRoute();
}

async function preparePreferredHomeroomBeforeMain() {
  if (!isHomeroomRoute()) return;
  try {
    const module = await import('./preferredHomeroomEntry.js');
    module.installPreferredHomeroomEntry?.();
    await module.preparePreferredHomeroomEntry?.({ reloadOnChange: false });
  } catch (error) {
    console.warn('[PreferredHomeroomEntry] Chưa thể chọn lớp chủ nhiệm trước khi mở giao diện.', error);
  }
}

function refreshSiteFontInBackground(cachedFont) {
  runWhenIdle(async () => {
    try {
      const selectedFont = await loadSiteFontSetting(null);
      if (selectedFont && selectedFont !== cachedFont) await waitForSiteFontReady(selectedFont);
    } catch (error) {
      console.warn('[Global font] Background refresh failed; cached font remains active.', error);
    }
  }, 2200);
}

function loadRouteModules() {
  if (isAssignedClassRoute()) startAssignedClassSync().catch(() => {});
  if (isBrianTeamRoute() && !schoolRegistryLoaded) {
    schoolRegistryLoaded = true;
    Promise.all([
      import('./schoolClassBootstrap.jsx'),
      import('./departmentHeadGlobalStudentManager.jsx'),
    ]).catch((error) => {
      schoolRegistryLoaded = false;
      console.error('[SchoolClassRegistry] Không thể tải danh mục và quản lý học sinh toàn trường.', error);
    });
  }

  if (isHomeroomRoute() && !homeroomExtrasLoaded) {
    homeroomExtrasLoaded = true;
    Promise.all([
      import('./conductMidFinalReports.js'),
      import('./preferredHomeroomEntry.js'),
      import('./homeroomHeroIdentityRuntime.js'),
      import('./studentRosterCountFix.js'),
      import('./studentRosterFilterTabs.js'),
      import('./studentNameSortRuntime.js'),
      import('./studentPermanentDeleteRuntime.js'),
      import('./teacherClassFilterRuntime.js'),
      import('./homeroomGradebookImportRuntime.js'),
    ]).catch((error) => {
      homeroomExtrasLoaded = false;
      console.error('[HomeroomExtras] Không thể tải tiện ích lớp học.', error);
    });
  }
}

function installRouteModuleLoader() {
  if (routeListenerInstalled) return;
  routeListenerInstalled = true;
  window.addEventListener('hashchange', loadRouteModules);
  loadRouteModules();
}

function startAssignedClassSync() {
  if (!isAssignedClassRoute()) return Promise.resolve({ skipped: true });
  if (assignedClassSyncPromise) return assignedClassSyncPromise;

  assignedClassSyncPromise = new Promise((resolve) => {
    const loadAndSync = async () => {
      try {
        const module = await import('./assignedSchoolClassBootstrap.js');
        module.installAssignedSchoolClassSync?.();
        await module.prepareAssignedSchoolClasses?.();
        resolve({ ok: true });
      } catch (error) {
        assignedClassSyncPromise = null;
        console.warn('[AssignedSchoolClasses] Chưa thể đồng bộ lớp được phân công.', error);
        resolve({ ok: false, error });
      }
    };
    window.setTimeout(loadAndSync, 0);
  });
  return assignedClassSyncPromise;
}

function loadExternalAppsAfterMainShell() {
  if (externalAppsLoaded || externalAppsScheduled) return;

  const mainShellReady = Boolean(document.querySelector('#root .app-shell'));
  if (!mainShellReady) {
    if (Date.now() - STARTED_AT < MAX_WAIT_MS) {
      window.setTimeout(loadExternalAppsAfterMainShell, 140);
    }
    return;
  }

  externalAppsScheduled = true;
  runWhenIdle(async () => {
    externalAppsScheduled = false;
    if (externalAppsLoaded) return;
    externalAppsLoaded = true;
    try {
      await import('./externalAppsBootstrap.jsx');
    } catch (error) {
      externalAppsLoaded = false;
      console.error('[ExternalAppsBootstrap] Module phụ không tải được; giao diện chính vẫn được giữ nguyên.', error);
      window.dispatchEvent(new CustomEvent('bes-external-bootstrap-error', {
        detail: { message: String(error?.message || error || 'Unknown external bootstrap error') },
      }));
    }
  }, 2600);
}

async function startApplication() {
  if (applicationStarted) return;
  applicationStarted = true;

  document.documentElement.dataset.siteFontBoot = 'loading';
  const cachedFont = installSiteFontFromCache();
  document.documentElement.dataset.siteFontBoot = 'ready';

  // Trên app chủ nhiệm, chọn lớp chủ nhiệm từ dữ liệu phân công đã lưu
  // trước khi React dựng giao diện để không lóe hoặc mở nhầm lớp bộ môn.
  await preparePreferredHomeroomBeforeMain();
  const mainModulePromise = import('./main.jsx');
  refreshSiteFontInBackground(cachedFont);

  await mainModulePromise;
  installRouteModuleLoader();
  loadExternalAppsAfterMainShell();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => startApplication().catch((error) => {
    console.error('[ApplicationBootstrap] Main application failed to start.', error);
  }), { once: true });
} else {
  startApplication().catch((error) => {
    console.error('[ApplicationBootstrap] Main application failed to start.', error);
  });
}