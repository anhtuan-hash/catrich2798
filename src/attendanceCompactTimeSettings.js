import './styles/AttendanceCompactTimeSettings.css';

const INSTALL_KEY = '__besAttendanceCompactTimeSettingsInstalled';
export const ATTENDANCE_COMPACT_TIME_TRIGGER_CLASS = 'bes-attendance-time-trigger';

const CLOCK_ICON = '<svg class="attendance-icon bes-attendance-time-trigger-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8Zm1-13h-2v6l5.25 3.15 1-1.64L13 12Z"></path></svg>';

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
  trigger.classList.toggle('is-active', adminSettingsPopoverOpen);
  const expanded = adminSettingsPopoverOpen ? 'true' : 'false';
  if (trigger.getAttribute('aria-expanded') !== expanded) trigger.setAttribute('aria-expanded', expanded);
  const title = `${enabled ? 'Đang bật' : 'Đang tắt'} giới hạn giờ giáo viên · ${windowLabel}`;
  if (trigger.getAttribute('title') !== title) trigger.setAttribute('title', title);
  const time = trigger.querySelector('.bes-attendance-time-trigger-window');
  if (time && time.textContent !== windowLabel) time.textContent = windowLabel;
}

function createTrigger() {
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = ATTENDANCE_COMPACT_TIME_TRIGGER_CLASS;
  trigger.setAttribute('aria-label', 'Cài đặt giờ điểm danh của giáo viên');
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.innerHTML = `${CLOCK_ICON}<span class="bes-attendance-time-trigger-label">Giờ GV</span><small class="bes-attendance-time-trigger-window">--:--–--:--</small><i class="bes-attendance-time-trigger-dot" aria-hidden="true"></i>`;
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
