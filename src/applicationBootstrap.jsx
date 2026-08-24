import './tabResumeStability.js';
import './styles/WidescreenDrawerReadability.css';
import './tabResumeAuthStability.js';
import './fourClassLocalPurge.js';
import './directClassRosterImportBootstrap.js';
import './removeKnowledgeHubRuntime.js';
import './tesolMethodRouteRegistry.js';
import './styles/MotionRestore.css';
import {
  installSiteFontFromCache,
  loadSiteFontSetting,
  waitForSiteFontReady,
} from './utils/siteFontSettings.js';

const MAX_WAIT_MS = 20000;
const STARTED_AT = Date.now();
let externalAppsLoaded = false;
let externalAppsScheduled = false;
let compactDrawerRuntimeLoaded = false;
let compactDrawerRuntimeScheduled = false;
let compactDrawerInteractionArmed = false;
let appearanceRuntimeLoaded = false;
let appearanceRuntimeScheduled = false;
let applicationStarted = false;
let schoolRegistryLoaded = false;
let homeroomExtrasLoaded = false;
let routeListenerInstalled = false;
let assignedClassSyncPromise = null;
const routeStylesLoaded = new Set();

function runWhenIdle(callback, timeout = 1800) {
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => callback(), { timeout });
    return;
  }
  window.setTimeout(callback, Math.min(timeout, 650));
}

function currentHash() {
  return String(window.location.hash || '').toLowerCase();
}

function isHomeroomRoute() {
  return /homeroom|chu-nhiem|gvcn/i.test(currentHash());
}

function isBrianTeamRoute() {
  return /brian-team|personnel-hub|work-hub/i.test(currentHash());
}

function isAppsRoute() {
  return /(^|\/)apps(?:$|[/?#])|applications/i.test(currentHash());
}

function isAdminRoute() {
  return /#\/admin(?:$|[/?#])/i.test(currentHash());
}

function isNewsRoute() {
  return /#\/news(?:$|[/?#])/i.test(currentHash());
}

function isGamesRoute() {
  return /#\/games(?:$|[/?#])/i.test(currentHash());
}

function isDashboardRoute() {
  return /#\/dashboard(?:$|[/?#])/i.test(currentHash());
}

function isWorkHubRoute() {
  return /#\/work-hub(?:$|[/?#])/i.test(currentHash());
}

function isLightweightPublicRoute() {
  return /#\/(?:home|contact|login|register|setup|resources)(?:$|[/?#])/i.test(currentHash());
}

function isAssignedClassRoute() {
  return isHomeroomRoute() || isBrianTeamRoute();
}

function loadStyleGroup(key, loaders) {
  if (routeStylesLoaded.has(key)) return;
  routeStylesLoaded.add(key);
  Promise.all(loaders.map((loader) => loader())).catch((error) => {
    routeStylesLoaded.delete(key);
    console.warn(`[RouteStyles] ${key} styles failed to load.`, error);
  });
}

function loadRouteStyles() {
  const hash = currentHash();

  if (isHomeroomRoute()) {
    loadStyleGroup('homeroom', [
      () => import('./components/GlobalHomeroomMaterial3Refinement.css'),
    ]);
  }

  if (isAdminRoute()) {
    loadStyleGroup('admin', [
      () => import('./styles/AdminSidebarInternalScroll.css'),
      () => import('./styles/AdminWorkspaceViewportScroll.css'),
      () => import('./styles/AdminCoreOverviewHidden.css'),
      () => import('./styles/AdminCompactWorkspace2026.css'),
    ]);
  }

  if (isAppsRoute()) {
    loadStyleGroup('apps-shell', [
      () => import('./components/GlobalAppsGoogle.css'),
      () => import('./components/GlobalAppsContrastPolish.css'),
      () => import('./components/GlobalAppsAndroidLauncher.css'),
      () => import('./components/GlobalAppsWorkspaceRedesign.css'),
      () => import('./components/GlobalAppsWorkspaceCompact.css'),
      () => import('./components/GlobalAppsHorizontalLauncher.css'),
      () => import('./components/GlobalAppsPhoneTiles.css'),
      () => import('./components/GlobalAppsAndroidDrawer.css'),
      () => import('./components/GlobalAppsRemoveQuickSearch.css'),
    ]);
  }

  if (isNewsRoute()) {
    loadStyleGroup('news', [
      () => import('./styles/NewsReaderContainerWidthFix.css'),
      () => import('./components/GlobalNewsAndroidGoogle.css'),
      () => import('./components/GlobalNewsDrawerScroll.css'),
    ]);
  }

  if (isGamesRoute()) {
    loadStyleGroup('games', [
      () => import('./styles/GamesTabletViewportFix.css'),
    ]);
  }

  if (isDashboardRoute()) {
    loadStyleGroup('dashboard', [
      () => import('./styles/teacher-dashboard-google-v2.css'),
      () => import('./components/GlobalDashboardVisualFix.css'),
    ]);
  }

  if (isWorkHubRoute()) {
    loadStyleGroup('work-hub', [
      () => import('./components/GlobalWorkHubGoogleRedesign.css'),
      () => import('./components/GlobalWorkScheduleModern.css'),
      () => import('./components/GlobalWorkHubGoogleHeroV2.css'),
      () => import('./components/GlobalWorkHubViewportModal.css'),
      () => import('./components/GlobalWorkHubViewportModalFinal.css'),
      () => import('./components/GlobalWorkHubModalAnchor.css'),
      () => import('./components/GlobalWorkHubModalCenter.css'),
    ]);
  }

  if (hash.includes('crossword-trial')) {
    loadStyleGroup('crossword-trial', [
      () => import('./styles/CrosswordTrialGoogleRedesign.css'),
      () => import('./styles/CrosswordTrialNoPurpleFix.css'),
    ]);
  }

  if (hash.includes('knowledge-train')) {
    loadStyleGroup('knowledge-train', [
      () => import('./styles/KnowledgeTrainGoogleRedesign.css'),
      () => import('./styles/KnowledgeTrainBottomProgressCleanup.css'),
    ]);
  }

  if (hash.includes('textlab-activities')) {
    loadStyleGroup('textlab', [
      () => import('./components/GlobalTextLabGoogleLarge.css'),
    ]);
  }

  if (hash.includes('word2graph')) {
    loadStyleGroup('word2graph', [
      () => import('./components/GlobalWordGraphGoogleM3.css'),
    ]);
  }
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
  loadRouteStyles();

  // Compact-drawer normalization is no longer part of the initial route boot.
  // Load it only after the first real interaction on routes that can need it.
  if (!isAppsRoute() && !isLightweightPublicRoute()) armCompactDrawerRuntime();
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

function armCompactDrawerRuntime() {
  if (
    compactDrawerRuntimeLoaded
    || compactDrawerRuntimeScheduled
    || compactDrawerInteractionArmed
    || isAppsRoute()
    || isLightweightPublicRoute()
  ) return;

  compactDrawerInteractionArmed = true;

  const cleanup = () => {
    window.removeEventListener('pointerdown', trigger, true);
    window.removeEventListener('keydown', trigger, true);
  };

  const trigger = () => {
    cleanup();
    compactDrawerInteractionArmed = false;
    if (isAppsRoute() || isLightweightPublicRoute()) return;
    loadCompactDrawerRuntimeAfterMainShell();
  };

  window.addEventListener('pointerdown', trigger, { capture: true, passive: true });
  window.addEventListener('keydown', trigger, { capture: true });
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
  import('./compactDrawerRuntimeV3.js').then(() => {
    compactDrawerRuntimeLoaded = true;
    compactDrawerRuntimeScheduled = false;
    window.BESCompactDrawer?.rescan?.();
  }).catch((error) => {
    compactDrawerRuntimeScheduled = false;
    console.warn('[CompactDrawerV3] Interaction-triggered runtime failed to load.', error);
  });
}

function loadExternalAppsAfterMainShell() {
  // Critical fix: externalAppsBootstrap used to be scheduled on every route from
  // startApplication(). Keep the whole chunk exclusive to #/apps.
  if (!isAppsRoute() || externalAppsLoaded || externalAppsScheduled) return;

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

function scheduleAppearanceRuntime() {
  if (appearanceRuntimeLoaded || appearanceRuntimeScheduled) return;
  appearanceRuntimeScheduled = true;
  runWhenIdle(async () => {
    appearanceRuntimeScheduled = false;
    if (appearanceRuntimeLoaded) return;
    try {
      await import('./noCreamSurfaceRuntime.js');
      appearanceRuntimeLoaded = true;
    } catch (error) {
      console.warn('[NoCream] Deferred appearance runtime failed to load.', error);
    }
  }, 3600);
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
  scheduleAppearanceRuntime();
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
