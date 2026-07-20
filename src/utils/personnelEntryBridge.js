const PERSONNEL_PATH = '/nhan-su/index.html';
const PERSONNEL_HASHES = new Set(['#/personnel', '#/nhan-su', '#/staff']);

function goPersonnel(event) {
  event?.preventDefault?.();
  window.location.assign(PERSONNEL_PATH);
}

function makeLink(className, label) {
  const a = document.createElement('a');
  a.className = className;
  a.href = PERSONNEL_PATH;
  a.innerHTML = `<span class="brian-personnel-entry-icon">♙</span><span>${label}</span>`;
  a.addEventListener('click', goPersonnel);
  return a;
}

function installNavigationEntry() {
  if (document.querySelector('[data-brian-personnel-entry="nav"]')) return;
  const candidates = [
    '.option-two-nav-left', '.option-two-navigation', '.option-two-nav',
    '.app-nav', '.main-navigation', 'nav[aria-label]', 'header nav'
  ];
  const nav = candidates.map((selector) => document.querySelector(selector)).find(Boolean);
  if (!nav) return;
  const link = makeLink('brian-personnel-nav-entry', 'Nhân sự');
  link.dataset.brianPersonnelEntry = 'nav';
  nav.appendChild(link);
}

function installAppsCard() {
  if (!location.hash.includes('/apps')) return;
  if (document.querySelector('[data-brian-personnel-entry="card"]')) return;
  const candidates = ['.apps-grid', '.app-grid', '.launcher-grid', '[data-app-grid]', '.tool-grid', '.home-app-grid'];
  const grid = candidates.map((selector) => document.querySelector(selector)).find(Boolean);
  if (!grid) return;
  const card = document.createElement('a');
  card.href = PERSONNEL_PATH;
  card.className = 'brian-personnel-app-card';
  card.dataset.brianPersonnelEntry = 'card';
  card.innerHTML = `<span class="brian-personnel-card-icon">♙</span><span class="brian-personnel-card-copy"><strong>Nhân sự</strong><small>Quản lý đội ngũ Tổ Tiếng Anh</small><em>12 giáo viên · 2 yêu cầu chờ duyệt</em></span><span class="brian-personnel-card-arrow">→</span>`;
  card.addEventListener('click', goPersonnel);
  grid.prepend(card);
}

function installFloatingFallback() {
  if (document.querySelector('[data-brian-personnel-entry="floating"]')) return;
  const a = makeLink('brian-personnel-floating-entry', 'Nhân sự');
  a.dataset.brianPersonnelEntry = 'floating';
  document.body.appendChild(a);
}

function syncEntries() {
  if (PERSONNEL_HASHES.has(location.hash)) return goPersonnel();
  installNavigationEntry();
  installAppsCard();
  if (!document.querySelector('[data-brian-personnel-entry="nav"]')) installFloatingFallback();
  else document.querySelector('[data-brian-personnel-entry="floating"]')?.remove();
}

export function installPersonnelEntryBridge() {
  if (window.__BRIAN_PERSONNEL_ENTRY_INSTALLED__) return;
  window.__BRIAN_PERSONNEL_ENTRY_INSTALLED__ = true;
  const run = () => { syncEntries(); setTimeout(syncEntries, 900); setTimeout(syncEntries, 2400); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
  window.addEventListener('hashchange', run);
}
