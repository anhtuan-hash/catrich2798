import './styles/MotionRestore.css';
import {
  installSiteFontFromCache,
  loadSiteFontSetting,
  waitForSiteFontReady,
} from './utils/siteFontSettings.js';

const MAX_WAIT_MS = 20000;
const STARTED_AT = Date.now();
let externalAppsLoaded = false;
let applicationStarted = false;

async function loadExternalAppsAfterMainShell() {
  if (externalAppsLoaded) return;

  const mainShellReady = Boolean(document.querySelector('#root .app-shell'));
  if (!mainShellReady) {
    if (Date.now() - STARTED_AT < MAX_WAIT_MS) {
      window.setTimeout(loadExternalAppsAfterMainShell, 120);
    }
    return;
  }

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
}

async function startApplication() {
  if (applicationStarted) return;
  applicationStarted = true;
  document.documentElement.dataset.siteFontBoot = 'loading';

  let selectedFont = installSiteFontFromCache();
  try {
    selectedFont = await loadSiteFontSetting(null);
    await waitForSiteFontReady(selectedFont);
  } catch (error) {
    console.warn('[Global font] Early bootstrap failed; continuing with cached font.', error);
  } finally {
    document.documentElement.dataset.siteFontBoot = 'ready';
  }

  let assignedSchoolClassModule = null;
  try {
    assignedSchoolClassModule = await import('./assignedSchoolClassBootstrap.js');
    await assignedSchoolClassModule.prepareAssignedSchoolClasses();
  } catch (error) {
    console.warn('[AssignedSchoolClasses] Chưa thể đồng bộ lớp được phân công trước khi mở ứng dụng.', error);
  }

  let class126RecoveryModule = null;
  let class126RecoveryResult = null;
  try {
    class126RecoveryModule = await import('./class126DataRecovery.js');
    class126RecoveryResult = await class126RecoveryModule.recoverClass126Data();
  } catch (error) {
    class126RecoveryResult = {
      status: 'error',
      changed: false,
      message: error?.message || String(error),
    };
    console.error('[Class126Recovery] Không thể hoàn tất quá trình dò và khôi phục dữ liệu lớp 12.6.', error);
  }

  await import('./main.jsx');
  class126RecoveryModule?.announceClass126Recovery?.(class126RecoveryResult);
  assignedSchoolClassModule?.installAssignedSchoolClassSync?.();
  import('./schoolClassBootstrap.jsx').catch((error) => {
    console.error('[SchoolClassRegistry] Không thể tải danh mục 27 lớp.', error);
  });
  import('./conductExportReports.js').catch((error) => {
    console.error('[ConductExportReports] Không thể tải tính năng xuất báo cáo rèn luyện.', error);
  });
  import('./conductCurrentWeekExport.js').catch((error) => {
    console.error('[ConductCurrentWeekExport] Không thể tải tính năng xuất đến tuần hiện tại.', error);
  });
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
