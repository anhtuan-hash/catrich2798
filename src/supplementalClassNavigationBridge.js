const INSTALL_KEY = '__besSupplementalClassNavigationBridgeInstalled';

function nextFrame(callback) {
  requestAnimationFrame(() => requestAnimationFrame(callback));
}

function openFilteredHistory(event) {
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
    });
  });
}

function install() {
  if (window[INSTALL_KEY]) return;
  window[INSTALL_KEY] = true;
  window.addEventListener('bes-supplemental-open-history', openFilteredHistory);
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') install();
