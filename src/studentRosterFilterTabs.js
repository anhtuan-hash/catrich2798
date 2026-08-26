const ROOT_CLASS = 'bes-roster-filter-tabs';
const STYLE_ID = 'bes-roster-filter-tabs-style';

const FILTERS = [
  { value: 'active', label: 'Đang học' },
  { value: 'inactive', label: 'Đã lưu trữ / chuyển lớp' },
  { value: 'deleted', label: 'Đã xóa' },
];

function safeText(value) {
  return String(value ?? '').trim();
}

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .${ROOT_CLASS} {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 0 0 16px;
      padding: 10px;
      border: 1px solid rgba(26, 115, 232, .16);
      border-radius: 16px;
      background: rgba(248, 250, 255, .92);
    }

    .${ROOT_CLASS} button {
      min-height: 40px;
      padding: 0 16px;
      border: 1px solid #c7d2e3;
      border-radius: 999px;
      background: #fff;
      color: #3c4043;
      font: inherit;
      font-weight: 800;
      cursor: pointer;
      transition: background .16s ease, border-color .16s ease, color .16s ease, box-shadow .16s ease;
    }

    .${ROOT_CLASS} button:hover {
      border-color: #8ab4f8;
      background: #f4f8ff;
    }

    .${ROOT_CLASS} button.is-active {
      border-color: #1a73e8;
      background: #d2e3fc;
      color: #174ea6;
      box-shadow: inset 0 0 0 1px rgba(26, 115, 232, .12);
    }

    .${ROOT_CLASS} small {
      flex: 1 0 100%;
      color: #5f6368;
      font-size: 12px;
      line-height: 1.45;
    }

    @media (max-width: 640px) {
      .${ROOT_CLASS} {
        display: grid;
        grid-template-columns: 1fr;
      }

      .${ROOT_CLASS} button {
        width: 100%;
      }
    }
  `;
  document.head.appendChild(style);
}

function rosterPanel() {
  return [...document.querySelectorAll('.hr-panel')].find((panel) => (
    safeText(panel.querySelector(':scope > .hr-panel-head h2')?.textContent) === 'Danh sách lớp'
  )) || null;
}

function filterSelect(panel) {
  return panel?.querySelector('.hr-filter-row select') || null;
}

function updateActiveState(root, value) {
  root.querySelectorAll('button[data-roster-filter]').forEach((button) => {
    const active = button.dataset.rosterFilter === value;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function chooseFilter(panel, value) {
  const select = filterSelect(panel);
  if (!select) return;
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
  const root = panel.querySelector(`.${ROOT_CLASS}`);
  if (root) updateActiveState(root, value);
  window.setTimeout(() => {
    panel.querySelector('.hr-table-wrap, .hr-empty-state')?.scrollIntoView({ behavior: 'auto', block: 'nearest' });
  }, 40);
}

function ensureFilterTabs() {
  injectStyle();
  const panel = rosterPanel();
  if (!panel) return;
  const select = filterSelect(panel);
  if (!select) return;

  let root = panel.querySelector(`.${ROOT_CLASS}`);
  if (!root) {
    root = document.createElement('div');
    root.className = ROOT_CLASS;
    root.setAttribute('role', 'group');
    root.setAttribute('aria-label', 'Lọc danh sách học sinh');

    FILTERS.forEach((item) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.rosterFilter = item.value;
      button.textContent = item.label;
      button.addEventListener('click', () => chooseFilter(panel, item.value));
      root.appendChild(button);
    });

    const help = document.createElement('small');
    help.textContent = 'Chọn “Đã lưu trữ / chuyển lớp” để xem 27 hồ sơ cũ đang được giữ lại nhằm bảo toàn điểm, rèn luyện và điểm danh.';
    root.appendChild(help);

    const head = panel.querySelector(':scope > .hr-panel-head');
    head?.insertAdjacentElement('afterend', root);
  }

  updateActiveState(root, select.value || 'active');

  if (select.dataset.besRosterTabsBound !== 'true') {
    select.dataset.besRosterTabsBound = 'true';
    select.addEventListener('change', () => updateActiveState(root, select.value || 'active'));
  }
}

let scheduled = false;
function scheduleEnsure() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    ensureFilterTabs();
  });
}

const observer = new MutationObserver((mutations) => {
  const relevant = mutations.some((mutation) => (
    [...mutation.addedNodes].some((node) => node.nodeType === 1)
  ));
  if (relevant) scheduleEnsure();
});
observer.observe(document.documentElement, { childList: true, subtree: true });

window.addEventListener('hashchange', scheduleEnsure);
window.addEventListener('bes-homeroom-store-updated', scheduleEnsure);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scheduleEnsure, { once: true });
} else {
  scheduleEnsure();
}
