import './styles/AttendanceCompactTimeSettings.css';

const INSTALL_KEY = '__besAttendanceCompactTimeSettingsInstalled';
export const ATTENDANCE_COMPACT_TIME_TRIGGER_CLASS = 'bes-attendance-time-trigger';

let configOpen = false;
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
  trigger.classList.toggle('is-active', configOpen);
  trigger.classList.toggle('is-enabled', enabled);
  trigger.setAttribute('aria-selected', configOpen ? 'true' : 'false');
  const title = `${enabled ? 'Đang bật' : 'Đang tắt'} giới hạn giờ giáo viên · ${windowLabel}`;
  if (trigger.getAttribute('title') !== title) trigger.setAttribute('title', title);
}

function createTrigger() {
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = ATTENDANCE_COMPACT_TIME_TRIGGER_CLASS;
  trigger.setAttribute('aria-label', 'Cấu hình giờ điểm danh của giáo viên');
  trigger.setAttribute('aria-selected', 'false');
  trigger.innerHTML = '<span class="bes-attendance-time-trigger-icon" aria-hidden="true">⏱</span><b>Cấu hình</b>';
  trigger.addEventListener('click', (event) => {
    event.stopPropagation();
    configOpen = true;
    queueRender();
  });
  return trigger;
}

function deactivateNativeTabs(tabs) {
  if (!configOpen || !tabs) return;
  tabs.querySelectorAll(`:scope > button:not(.${ATTENDANCE_COMPACT_TIME_TRIGGER_CLASS})`).forEach((button) => {
    if (button.classList.contains('is-active')) button.classList.remove('is-active');
  });
}

function renderCompactTimeSettings() {
  renderQueued = false;
  const tabs = document.querySelector('.attendance-tabs');
  const panel = document.querySelector('.bes-attendance-time-settings');
  const content = document.querySelector('.attendance-content');
  if (!tabs) return;

  let trigger = tabs.querySelector(`.${ATTENDANCE_COMPACT_TIME_TRIGGER_CLASS}`);
  if (!panel || !content) {
    trigger?.remove();
    content?.classList.remove('is-time-config-open');
    configOpen = false;
    return;
  }

  if (!trigger) {
    trigger = createTrigger();
    tabs.appendChild(trigger);
  }

  if (panel.parentElement !== content) content.appendChild(panel);
  panel.classList.add('is-config-view');
  panel.removeAttribute('role');
  panel.setAttribute('aria-label', 'Cấu hình giờ điểm danh của giáo viên');
  panel.hidden = !configOpen;
  content.classList.toggle('is-time-config-open', configOpen);
  deactivateNativeTabs(tabs);
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
      attributeFilter: ['checked', 'value', 'class', 'hidden'],
    });

    document.addEventListener('input', (event) => {
      if (event.target?.closest?.('.bes-attendance-time-settings')) queueRender();
    }, true);
    document.addEventListener('change', (event) => {
      if (event.target?.closest?.('.bes-attendance-time-settings')) queueRender();
    }, true);
    document.addEventListener('click', (event) => {
      const tabButton = event.target?.closest?.('.attendance-tabs > button');
      if (!tabButton || tabButton.classList.contains(ATTENDANCE_COMPACT_TIME_TRIGGER_CLASS)) return;
      if (!configOpen) return;
      configOpen = false;
      queueRender();
    }, true);
    queueRender();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}

installAttendanceCompactTimeSettings();
