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
let assignedClassSyncMode = '';
let assignedClassSyncResult = null;
let assignedClassSyncCompletedAt = 0;
let assignedHomeroomNavigationToken = 0;

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

function assignedHomeroomId(result) {
  return String(result?.homeroomWorkspaceId || result?.preferredWorkspaceId || '').trim();
}

function navigateAssignedHomeroomAfterMount(result) {
  if (!isHomeroomRoute()) return;
  const workspaceId = assignedHomeroomId(result);
  if (!workspaceId) return;

  // Durable in-memory source for the current session. This remains available even
  // if another background workspace persistence call temporarily moves localStorage.
  window.__besAssignedHomeroomWorkspaceId = workspaceId;

  const token = ++assignedHomeroomNavigationToken;
  const startedAt = Date.now();
  let attempts = 0;

  const deliver = () => {
    if (token !== assignedHomeroomNavigationToken || !isHomeroomRoute()) return;
    const mounted = document.querySelector('.hr-page[data-homeroom-hydrated="true"]');
    if (!mounted) {
      if (Date.now() - startedAt < 4000) window.setTimeout(deliver, 60);
      return;
    }

    attempts += 1;
    window.dispatchEvent(new CustomEvent('bes-homeroom-command', {
      detail: {
        type: 'homeroom.navigate',
        workspaceId,
        tab: 'overview',
        source: 'assigned-homeroom-entry-guard',
      },
    }));

    // React effects can attach after the first DOM commit. Re-deliver the same
    // idempotent navigation command for a short bounded window instead of relying
    // on one race-prone event. Once caught, later deliveries are harmless because
    // HomeroomWorkspace ignores navigation to its already-active workspace.
    if (attempts < 9 && Date.now() - startedAt < 3200) {
      window.setTimeout(deliver, Math.min(100 + attempts * 45, 320));
    }
  };

  deliver();
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
      import('./conductMidFinalReportsV4.js'),
      import('./conductMidFinalReportsV5.js'),
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
  const shouldPreferHomeroom = isHomeroomRoute();
  const mode = shouldPreferHomeroom ? 'prefer-homeroom' : 'sync-only';

  // Avoid an immediate duplicate RPC after the pre-main Homeroom sync, but never
  // reuse a sync-only result as a prefer-homeroom activation on a later route.
  if (
    assignedClassSyncResult
    && Date.now() - assignedClassSyncCompletedAt < 1600
    && (!shouldPreferHomeroom || assignedClassSyncMode === 'prefer-homeroom')
  ) {
    if (shouldPreferHomeroom) navigateAssignedHomeroomAfterMount(assignedClassSyncResult);
    return Promise.resolve(assignedClassSyncResult);
  }

  if (assignedClassSyncPromise) {
    if (!shouldPreferHomeroom || assignedClassSyncMode === 'prefer-homeroom') {
      return assignedClassSyncPromise.then((result) => {
        if (isHomeroomRoute()) navigateAssignedHomeroomAfterMount(result);
        return result;
      });
    }
    // A sync-only task was started elsewhere. Wait for it, then run a real
    // prefer-homeroom pass instead of treating the old promise as authoritative.
    return assignedClassSyncPromise.then(() => {
      assignedClassSyncPromise = null;
      return startAssignedClassSync();
    });
  }

  assignedClassSyncMode = mode;
  const task = (async () => {
    try {
      const module = await import('./assignedSchoolClassBootstrap.js');
      module.installAssignedSchoolClassSync?.();
      return await module.prepareAssignedSchoolClasses?.({
        preferHomeroom: shouldPreferHomeroom,
      }) || { ok: true };
    } catch (error) {
      console.warn('[AssignedSchoolClasses] Chưa thể đồng bộ lớp được phân công.', error);
      return { ok: false, error };
    }
  })();
  assignedClassSyncPromise = task;

  return task.then((result) => {
    assignedClassSyncResult = result;
    assignedClassSyncCompletedAt = Date.now();
    if (isHomeroomRoute()) navigateAssignedHomeroomAfterMount(result);
    return result;
  }).finally(() => {
    if (assignedClassSyncPromise === task) assignedClassSyncPromise = null;
  });
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

  // On the Homeroom route the admin assignment is authoritative. Finish that
  // synchronization before React reads getCurrentHomeroomWorkspaceId() for its
  // initial state. The sync itself now restores/commits selection only after all
  // background workspace reconciliation has completed.
  if (isHomeroomRoute()) {
    await startAssignedClassSync();
  }
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
