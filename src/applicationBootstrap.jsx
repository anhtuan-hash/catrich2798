import './tabResumeStability.js';
import './noCreamSurfaceRuntime.js';
import './styles/WidescreenDrawerReadability.css';
import './tabResumeAuthStability.js';
import './fourClassLocalPurge.js';
import './directClassRosterImportBootstrap.js';
import './removeKnowledgeHubRuntime.js';
import './tesolMethodRouteRegistry.js';
import './components/GlobalHomeroomMaterial3Refinement.css';
import { bootstrapPublicTypographyBeforeApp } from './publicTypographyBootstrap.js';
import { bootstrapBrianThemeRuntime } from './theme/brianTheme.js';

const MAX_WAIT_MS = 20000;
const STARTED_AT = Date.now();
let externalAppsLoaded = false;
let externalAppsScheduled = false;
let compactDrawerRuntimeLoaded = false;
let compactDrawerRuntimeScheduled = false;
let applicationStarted = false;
let schoolRegistryLoaded = false;
let homeroomExtrasLoaded = false;
let routeListenerInstalled = false;
let assignedClassSyncPromise = null;

// Theme is application chrome. Resolve the persisted/system preference before
// React mounts and keep it synchronized across tabs and OS appearance changes.
bootstrapBrianThemeRuntime();

// applicationBootstrap is loaded before main.jsx. Install the preload circuit
// breaker here so a stale/failed lazy chunk can never enter the legacy
// `vite:preloadError -> window.location.reload()` loop still present in main.
// stopImmediatePropagation is intentional: it prevents later listeners from
// turning a recoverable route-module failure into a full browser reload.
function installPreloadReloadCircuitBreaker() {
  if (typeof window === 'undefined' || window.__besPreloadReloadCircuitBreakerInstalled) return;
  window.__besPreloadReloadCircuitBreakerInstalled = true;
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault?.();
    event.stopImmediatePropagation?.();
    const error = event?.payload || event?.detail || event;
    console.warn('[PreloadCircuitBreaker] Giữ nguyên phiên làm việc; chunk tải lỗi sẽ không reload toàn trang.', error);
    window.dispatchEvent(new CustomEvent('bes-preload-error-contained', {
      detail: {
        route: window.location.hash || '',
        message: String(error?.message || error || 'Unknown preload error'),
        at: Date.now(),
      },
    }));
  });
}

installPreloadReloadCircuitBreaker();

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

function isAppsRoute() {
  return /(^|\/)apps(?:$|[/?#])|applications/i.test(window.location.hash || '');
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

function loadRouteModules() {
  if (isAppsRoute()) loadExternalAppsAfterMainShell();

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
      import('./conductMidFinalReportsV2.js'),
      import('./conductMidFinalReportsV3.js'),
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

function loadCompactDrawerRuntimeAfterMainShell() {
  if (compactDrawerRuntimeLoaded || compactDrawerRuntimeScheduled || isAppsRoute()) return;

  const mainShellReady = Boolean(document.querySelector('#root .app-shell'));
  if (!mainShellReady) {
    if (Date.now() - STARTED_AT < MAX_WAIT_MS) {
      window.setTimeout(loadCompactDrawerRuntimeAfterMainShell, 180);
    }
    return;
  }

  compactDrawerRuntimeScheduled = true;
  runWhenIdle(async () => {
    compactDrawerRuntimeScheduled = false;
    if (compactDrawerRuntimeLoaded || isAppsRoute()) return;
    try {
      await import('./compactDrawerRuntimeV3.js');
      compactDrawerRuntimeLoaded = true;
      window.BESCompactDrawer?.rescan?.();
    } catch (error) {
      console.warn('[CompactDrawerV3] Deferred runtime failed to load.', error);
    }
  }, 1200);
}

function loadExternalAppsAfterMainShell() {
  if (!isAppsRoute() || externalAppsLoaded || externalAppsScheduled) return;

  const mainShellReady = Boolean(document.querySelector('#root .app-shell'));
  if (!mainShellReady) {
    if (Date.now() - STARTED_AT < MAX_WAIT_MS) {
      window.setTimeout(loadExternalAppsAfterMainShell, 180);
    }
    return;
  }

  externalAppsScheduled = true;
  runWhenIdle(async () => {
    externalAppsScheduled = false;
    if (!isAppsRoute() || externalAppsLoaded) return;
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
  }, 220);
}

async function startApplication() {
  if (applicationStarted) return;
  applicationStarted = true;

  // Typography is system chrome, not an authenticated preference. Resolve the
  // Admin-selected public typography before Brian renders its first frame.
  await bootstrapPublicTypographyBeforeApp();
  await preparePreferredHomeroomBeforeMain();
  await import('./main.jsx');
  import('./homeWeeklyPracticeStatisticsBootstrap.jsx').catch((error) => {
    console.warn('[WeeklyPracticeStatistics] Không thể khởi tạo bộ điều khiển thống kê TTCM.', error);
  });
  installRouteModuleLoader();
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
