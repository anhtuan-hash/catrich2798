import './main.jsx';

const MAX_WAIT_MS = 20000;
const STARTED_AT = Date.now();
let externalAppsLoaded = false;

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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadExternalAppsAfterMainShell, { once: true });
} else {
  loadExternalAppsAfterMainShell();
}
