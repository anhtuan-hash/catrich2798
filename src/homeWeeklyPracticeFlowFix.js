const HOME_SHELL_SELECTOR = ".metro-clean-system[data-route='home']";
const HOME_CONTENT_SELECTOR = '.bha-home, .eh5-home';
const WEEKLY_ROOT_ID = 'bes-weekly-practice-root';

let frame = 0;
let observedHome = null;
let resizeObserver = null;
let measuredMain = null;

function clearMainMeasurement(main) {
  if (!main) return;
  main.style.removeProperty('min-height');
  main.style.removeProperty('max-height');
  main.style.removeProperty('height');
  main.style.removeProperty('overflow');
  main.style.removeProperty('contain');
  delete main.dataset.homeMeasuredHeight;
}

function clearLegacyOffset(root) {
  if (!root) return;
  root.style.removeProperty('margin-top');
  root.style.removeProperty('position');
  root.style.removeProperty('clear');
  delete root.dataset.homeFlowOffset;
}

function observeHome(home) {
  if (observedHome === home) return;
  resizeObserver?.disconnect();
  observedHome = home || null;
  if (!home || typeof ResizeObserver === 'undefined') return;
  resizeObserver = new ResizeObserver(scheduleSync);
  resizeObserver.observe(home);
}

function syncFlow() {
  frame = 0;
  const shell = document.querySelector(HOME_SHELL_SELECTOR);
  const main = shell?.querySelector(':scope > main.wp8-page-stage') || shell?.querySelector('main.wp8-page-stage');
  const home = main?.querySelector(HOME_CONTENT_SELECTOR) || null;
  const weeklyRoot = document.getElementById(WEEKLY_ROOT_ID);

  clearLegacyOffset(weeklyRoot);

  if (!shell || !main || !home) {
    observeHome(null);
    if (measuredMain && measuredMain !== main) clearMainMeasurement(measuredMain);
    measuredMain = main || null;
    return;
  }

  if (measuredMain && measuredMain !== main) clearMainMeasurement(measuredMain);
  measuredMain = main;
  observeHome(home);

  main.style.setProperty('height', 'auto', 'important');
  main.style.setProperty('max-height', 'none', 'important');
  main.style.setProperty('overflow', 'visible', 'important');
  main.style.setProperty('contain', 'none', 'important');

  const mainRect = main.getBoundingClientRect();
  const homeRect = home.getBoundingClientRect();
  const visualBottom = Math.max(homeRect.bottom, homeRect.top + home.scrollHeight);
  const requiredHeight = Math.max(0, Math.ceil(visualBottom - mainRect.top));
  const currentHeight = Number(main.dataset.homeMeasuredHeight || 0);

  if (Math.abs(requiredHeight - currentHeight) > 1) {
    main.dataset.homeMeasuredHeight = String(requiredHeight);
    main.style.setProperty('min-height', `${requiredHeight}px`, 'important');
  }

  const footer = shell.querySelector(':scope > .signature-footer-collapsible, :scope > footer.signature-footer-collapsible');
  if (footer) {
    footer.style.setProperty('position', 'relative', 'important');
    footer.style.setProperty('clear', 'both', 'important');
    footer.style.setProperty('z-index', '2', 'important');
  }
}

function scheduleSync() {
  if (frame) cancelAnimationFrame(frame);
  frame = requestAnimationFrame(syncFlow);
}

function installHomeWeeklyPracticeFlowFix() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__brianHomeWeeklyPracticeFlowFixInstalled) return;
  window.__brianHomeWeeklyPracticeFlowFixInstalled = true;

  const observer = new MutationObserver(scheduleSync);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });

  window.addEventListener('resize', scheduleSync, { passive: true });
  window.addEventListener('hashchange', scheduleSync);
  window.addEventListener('pageshow', scheduleSync);
  window.addEventListener('load', scheduleSync);
  document.fonts?.ready?.then(scheduleSync).catch(() => {});

  scheduleSync();
  window.setTimeout(scheduleSync, 120);
  window.setTimeout(scheduleSync, 500);
  window.setTimeout(scheduleSync, 1400);
}

installHomeWeeklyPracticeFlowFix();
