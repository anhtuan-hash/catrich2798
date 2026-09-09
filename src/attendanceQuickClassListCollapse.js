import './styles/AttendanceQuickClassListCollapse.css';

export const ATTENDANCE_CLASS_LIST_COLLAPSE_KEY = 'bes:attendance:quick:class-list-collapsed';
const INSTALL_KEY = '__besAttendanceQuickClassListCollapseInstalled';
const MOBILE_QUERY = '(max-width: 820px)';

let classListCollapsed = false;
let observer = null;
let renderQueued = false;

function safeReadPreference() {
  if (typeof window === 'undefined') return false;
  try {
    const saved = window.localStorage.getItem(ATTENDANCE_CLASS_LIST_COLLAPSE_KEY);
    if (saved === '1') return true;
    if (saved === '0') return false;
  } catch {
    // Storage can be blocked in private/restricted browser contexts.
  }
  return Boolean(window.matchMedia?.(MOBILE_QUERY)?.matches);
}

function safeWritePreference(collapsed) {
  try {
    window.localStorage.setItem(ATTENDANCE_CLASS_LIST_COLLAPSE_KEY, collapsed ? '1' : '0');
  } catch {
    // The UI still works for this session when storage is unavailable.
  }
}

function setCollapsed(nextCollapsed) {
  classListCollapsed = Boolean(nextCollapsed);
  safeWritePreference(classListCollapsed);
  queueRender();
}

function createCollapseButton() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'attendance-class-list-toggle';
  button.setAttribute('aria-label', 'Ẩn danh sách lớp');
  button.setAttribute('title', 'Ẩn danh sách lớp để mở rộng màn hình điểm danh');
  button.innerHTML = '<span aria-hidden="true">‹</span>';
  button.addEventListener('click', () => setCollapsed(true));
  return button;
}

function createRestoreButton() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'attendance-class-list-restore';
  button.setAttribute('aria-label', 'Mở danh sách lớp');
  button.setAttribute('title', 'Mở lại danh sách lớp đang hoạt động');
  button.innerHTML = '<span aria-hidden="true">›</span><b>Danh sách lớp</b>';
  button.addEventListener('click', () => setCollapsed(false));
  return button;
}

function renderCollapseState() {
  renderQueued = false;
  const layout = document.querySelector('.attendance-quick-layout');
  if (!layout) return;

  layout.classList.toggle('is-class-list-collapsed', classListCollapsed);

  const classList = layout.querySelector(':scope > .attendance-class-list');
  const rollcall = layout.querySelector(':scope > .attendance-rollcall');

  if (classList) {
    classList.setAttribute('aria-hidden', classListCollapsed ? 'true' : 'false');
    const header = classList.querySelector(':scope > header');
    if (header && !header.querySelector('.attendance-class-list-toggle')) {
      header.appendChild(createCollapseButton());
    }
  }

  if (rollcall) {
    let restore = rollcall.querySelector(':scope > .attendance-class-list-restore');
    if (!restore) {
      restore = createRestoreButton();
      rollcall.appendChild(restore);
    }
    restore.hidden = !classListCollapsed;
  }
}

function queueRender() {
  if (renderQueued || typeof window === 'undefined') return;
  renderQueued = true;
  window.requestAnimationFrame(renderCollapseState);
}

export function installAttendanceQuickClassListCollapse() {
  if (typeof window === 'undefined' || window[INSTALL_KEY]) return;
  window[INSTALL_KEY] = true;
  classListCollapsed = safeReadPreference();

  const start = () => {
    if (!document.body || observer) return;
    observer = new MutationObserver(() => queueRender());
    observer.observe(document.body, { childList: true, subtree: true });
    queueRender();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}

installAttendanceQuickClassListCollapse();
