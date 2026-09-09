import './styles/AttendanceCompactTimeSettings.css';

const INSTALL_KEY = '__besAttendanceCompactTimeSettingsInstalled';
export const ATTENDANCE_COMPACT_TIME_TRIGGER_CLASS = 'bes-attendance-time-trigger';

let adminSettingsPopoverOpen = false;
let observer = null;
let renderQueued = false;

function clockLabel(value, fallback = '--:--') {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return fallback;
  return `${String(Number(match[1])).padStart(2, '0')}:${match[2]}`;
}

function readWindowLabel(panel) {
  const start = clockLabel(panel?.querySelector('.bes-attendance-time-start')?.value);
  const end = clockLabel(panel?.querySelector('.bes-attendance-time-end')?.value);
  return `${start}–${end}`;
}

function renderTrigger(trigger, panel) {
  const enabled = Boolean(panel?.querySelector('.bes-attendance-time-enabled')?.checked);
  const windowLabel = readWindowLabel(panel);
  trigger.classList.toggle('is-enabled', enabled);
  trigger.classList.toggle('is-open', adminSettingsPopoverOpen);
  const expanded = adminSettingsPopoverOpen ? 'true' : 'false';
  if (trigger.getAttribute('aria-expanded') !== expanded) trigger.setAttribute('aria-expanded', expanded);
  const title = `${enabled ? 'Đang bật' : 'Đang tắt'} giới hạn giờ giáo viên · ${windowLabel}`;
  if (trigger.getAttribute('title') !== title) trigger.setAttribute('title', title);
  const time = trigger.querySelector('small');
  if (time && time.textContent !== windowLabel) time.textContent = windowLabel;
}

function createTrigger() {
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = ATTENDANCE_COMPACT_TIME_TRIGGER_CLASS;
  trigger.setAttribute('aria-label', 'Cài đặt giờ điểm danh của giáo viên');
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.innerHTML = '<span class="bes-attendance-time-trigger-icon" aria-hidden="true">⏱</span><b>Giờ GV</b><small>--:--–--:--</small><i class="bes-attendance-time-trigger-dot" aria-hidden="true"></i>';
  trigger.addEventListener('click', (event) => {
    event.stopPropagation();
    adminSettingsPopoverOpen = !adminSettingsPopoverOpen;
    queueRender();
  });
  return trigger;
}

function closePopover() {
  if (!adminSettingsPopoverOpen) return;
  adminSettingsPopoverOpen = false;
  queueRender();
}

function renderCompactTimeSettings() {
  renderQueued = false;
  const tabs = document.querySelector('.attendance-tabs');
  const panel = document.querySelector('.bes-attendance-time-settings');
  if (!tabs) return;

  let trigger = tabs.querySelector(`.${ATTENDANCE_COMPACT_TIME_TRIGGER_CLASS}`);
  if (!panel) {
    trigger?.remove();
    adminSettingsPopoverOpen = false;
    return;
  }

  if (!trigger) {
    trigger = createTrigger();
    tabs.appendChild(trigger);
  }

  if (panel.parentElement !== tabs) tabs.appendChild(panel);
  panel.classList.add('is-compact-popover');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Cài đặt giờ điểm danh của giáo viên');
  panel.hidden = !adminSettingsPopoverOpen;
  renderTrigger(trigger, panel);
}

function queueRender() {
  if (renderQueued || typeof window === 'undefined') return;
  renderQueued = true;
  window.requestAnimationFrame(renderCompactTimeSettings);
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
      attributeFilter: ['checked', 'value', 'class'],
    });

    document.addEventListener('input', (event) => {
      if (event.target?.closest?.('.bes-attendance-time-settings')) queueRender();
    }, true);
    document.addEventListener('change', (event) => {
      if (event.target?.closest?.('.bes-attendance-time-settings')) queueRender();
    }, true);
    document.addEventListener('click', (event) => {
      if (!adminSettingsPopoverOpen) return;
      const target = event.target;
      if (target?.closest?.('.bes-attendance-time-settings, .bes-attendance-time-trigger')) return;
      closePopover();
    }, true);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closePopover();
    });
    queueRender();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}

installAttendanceCompactTimeSettings();
