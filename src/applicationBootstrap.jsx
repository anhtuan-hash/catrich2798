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

  await import('./main.jsx');
  import('./schoolClassBootstrap.jsx').catch((error) => {
    console.error('[SchoolClassRegistry] Không thể tải danh mục 27 lớp.', error);
  });
  import('./conductExportReports.js').catch((error) => {
    console.error('[ConductExportReports] Không thể tải tính năng xuất báo cáo rèn luyện.', error);
  });
  import('./conductCurrentWeekExport.js').catch((error) => {
    console.error('[ConductCurrentWeekExport] Không thể tải tính năng xuất đến tuần hiện tại.', error);
  });
  import('./attendanceHistoryModal.js').catch((error) => {
    console.error('[AttendanceHistoryModal] Không thể tải modal lịch sử chuyên cần.', error);
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
