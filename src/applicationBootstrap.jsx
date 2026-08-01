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
let applicationStarted = false;
let schoolRegistryLoaded = false;
let homeroomExtrasLoaded = false;
let routeListenerInstalled = false;
let class126RecoveryListenerInstalled = false;
let class126RecoveryTimer = 0;

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
  return /brian-team|personnel-hub/i.test(window.location.hash || '');
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
  if (isBrianTeamRoute() && !schoolRegistryLoaded) {
    schoolRegistryLoaded = true;
    import('./schoolClassBootstrap.jsx').catch((error) => {
      schoolRegistryLoaded = false;
      console.error('[SchoolClassRegistry] Không thể tải danh mục 27 lớp.', error);
    });
  }

  if (isHomeroomRoute() && !homeroomExtrasLoaded) {
    homeroomExtrasLoaded = true;
    Promise.all([
      import('./conductExportReports.js'),
      import('./conductCurrentWeekExport.js'),
      import('./class126ForensicExport.js'),
      import('./class126RestoreImporter.js'),
    ]).catch((error) => {
      homeroomExtrasLoaded = false;
      console.error('[HomeroomExtras] Không thể tải tiện ích báo cáo và cứu hộ dữ liệu.', error);
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
  const eager = isHomeroomRoute();
  return new Promise((resolve) => {
    const loadAndSync = async () => {
      try {
        const module = await import('./assignedSchoolClassBootstrap.js');
        module.installAssignedSchoolClassSync?.();
        await module.prepareAssignedSchoolClasses?.();
      } catch (error) {
        console.warn('[AssignedSchoolClasses] Chưa thể đồng bộ lớp được phân công.', error);
      } finally {
        resolve();
      }
    };
    if (eager) window.setTimeout(loadAndSync, 0);
    else runWhenIdle(loadAndSync, 2400);
  });
}

async function runClass126Recovery() {
  let recoveryModule = null;
  let recoveryResult = null;
  try {
    recoveryModule = await import('./class126DataRecovery.js');
    recoveryResult = await recoveryModule.recoverClass126Data();
  } catch (error) {
    recoveryResult = {
      status: 'error',
      changed: false,
      message: error?.message || String(error),
    };
    console.error('[Class126Recovery] Không thể hoàn tất quá trình dò và khôi phục dữ liệu lớp 12.6.', error);
  }
  recoveryModule?.announceClass126Recovery?.(recoveryResult);
  return recoveryResult;
}

function scheduleClass126Recovery(delay = 350) {
  window.clearTimeout(class126RecoveryTimer);
  class126RecoveryTimer = window.setTimeout(() => {
    runClass126Recovery().catch((error) => {
      console.error('[Class126Recovery] Không thể chạy lại quá trình khôi phục.', error);
    });
  }, delay);
}

function installClass126RecoveryListener() {
  if (class126RecoveryListenerInstalled) return;
  class126RecoveryListenerInstalled = true;
  window.addEventListener('bes-school-class-assignment-synced', () => scheduleClass126Recovery(500));
}

function startClass126Recovery(assignedSyncPromise) {
  runWhenIdle(async () => {
    await assignedSyncPromise.catch(() => {});
    await runClass126Recovery();
    installClass126RecoveryListener();
  }, 1200);
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

  // React shell is the only startup-critical module. Network font settings,
  // Supabase class sync, data recovery and feature bridges run after first paint.
  const mainModulePromise = import('./main.jsx');
  refreshSiteFontInBackground(cachedFont);

  await mainModulePromise;
  installRouteModuleLoader();
  const assignedSyncPromise = startAssignedClassSync();
  startClass126Recovery(assignedSyncPromise);
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
