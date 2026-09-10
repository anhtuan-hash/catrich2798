import './styles/AttendanceCompactTimeSettings.css';
import { ATTENDANCE_PERMISSION_ITEMS } from './utils/permissions.js';

const INSTALL_KEY = '__besAttendanceConfigurationTabInstalled';
const CONFIG_TAB = {
  id: 'attendance:config',
  tab: 'config',
  type: 'attendance',
  section: 'attendance',
  title: 'Configuration',
  titleVi: 'Cấu hình',
  desc: 'Configure the teacher attendance time window.',
  descVi: 'Cấu hình khung giờ giáo viên được phép thao tác điểm danh.',
};

let observer = null;
let renderQueued = false;

// This module loads before main.jsx. Extending the mutable attendance registry here means
// GlobalAttendanceNavigationTab renders the button itself through React. Because config has no
// grantable permission entry and canAccessAttendanceView() only bypasses permissions for Admin,
// the tab remains Admin-only without changing the public permission model.
if (!ATTENDANCE_PERMISSION_ITEMS.some((item) => item.tab === CONFIG_TAB.tab)) {
  ATTENDANCE_PERMISSION_ITEMS.push(CONFIG_TAB);
}

function isConfigurationViewActive(tabs) {
  const active = tabs?.querySelector('.attendance-tabs > button.is-active');
  return Boolean(active && String(active.textContent || '').trim().includes('Cấu hình'));
}

function renderConfigurationWorkspace() {
  renderQueued = false;
  const tabs = document.querySelector('.attendance-tabs');
  const content = document.querySelector('.attendance-content');
  const panel = document.querySelector('.bes-attendance-time-settings');
  if (!tabs || !content || !panel) return;

  const active = isConfigurationViewActive(tabs);
  panel.classList.remove('is-compact-popover');
  panel.classList.toggle('is-config-workspace', active);
  panel.removeAttribute('role');
  panel.removeAttribute('aria-label');
  panel.hidden = !active;

  if (active && panel.parentElement !== content) content.appendChild(panel);
}

function queueRender() {
  if (renderQueued || typeof window === 'undefined') return;
  renderQueued = true;
  window.requestAnimationFrame(renderConfigurationWorkspace);
}

export function installAttendanceCompactTimeSettings() {
  if (typeof window === 'undefined' || window[INSTALL_KEY]) return;
  window[INSTALL_KEY] = true;

  const start = () => {
    if (!document.body || observer) return;
    observer = new MutationObserver(() => queueRender());
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'hidden'],
    });
    queueRender();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}

installAttendanceCompactTimeSettings();
