const HOME_SHELL_SELECTOR = ".metro-clean-system[data-route='home']";
const HOME_CONTENT_SELECTOR = '.bha-home, .eh5-home';
const WEEKLY_ROOT_ID = 'bes-weekly-practice-root';
const GAP_PX = 28;

let frame = 0;
let observedHome = null;
let resizeObserver = null;

function readAppliedOffset(root) {
  const value = Number(root?.dataset?.homeFlowOffset || 0);
  return Number.isFinite(value) ? value : 0;
}

function clearOffset(root) {
  if (!root) return;
  root.style.removeProperty('margin-top');
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
  const weeklyRoot = document.getElementById(WEEKLY_ROOT_ID);
  const home = shell?.querySelector(HOME_CONTENT_SELECTOR) || null;

  if (!shell || !home || !weeklyRoot) {
    observeHome(null);
    if (weeklyRoot) clearOffset(weeklyRoot);
    return;
  }

  observeHome(home);

  const appliedOffset = readAppliedOffset(weeklyRoot);
  const weeklyRect = weeklyRoot.getBoundingClientRect();
  const homeRect = home.getBoundingClientRect();
  const naturalWeeklyTop = weeklyRect.top - appliedOffset;
  const requiredOffset = Math.max(0, Math.ceil(homeRect.bottom + GAP_PX - naturalWeeklyTop));

  if (Math.abs(requiredOffset - appliedOffset) <= 1) return;

  weeklyRoot.dataset.homeFlowOffset = String(requiredOffset);
  weeklyRoot.style.setProperty('margin-top', `${requiredOffset}px`, 'important');
  weeklyRoot.style.setProperty('position', 'relative', 'important');
  weeklyRoot.style.setProperty('clear', 'both', 'important');
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
  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('resize', scheduleSync, { passive: true });
  window.addEventListener('hashchange', scheduleSync);
  window.addEventListener('pageshow', scheduleSync);
  document.fonts?.ready?.then(scheduleSync).catch(() => {});

  scheduleSync();
  window.setTimeout(scheduleSync, 250);
  window.setTimeout(scheduleSync, 1000);
}

installHomeWeeklyPracticeFlowFix();
