import './styles/AttendanceCompactTimeSettings.css';

const INSTALL_KEY = '__besAttendanceCompactTimeSettingsInstalled';
export const ATTENDANCE_COMPACT_TIME_TRIGGER_CLASS = 'bes-attendance-time-trigger';
const CONFIG_TAB_ID = 'bes-attendance-time-config-tab';
const CONFIG_PANEL_ID = 'bes-attendance-time-config-panel';

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
  trigger.tabIndex = configOpen ? 0 : -1;
  const title = `${enabled ? 'Đang bật' : 'Đang tắt'} giới hạn giờ giáo viên · ${windowLabel}`;
  if (trigger.getAttribute('title') !== title) trigger.setAttribute('title', title);
}

function createTrigger() {
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.id = CONFIG_TAB_ID;
  trigger.className = ATTENDANCE_COMPACT_TIME_TRIGGER_CLASS;
  trigger.setAttribute('role', 'tab');
  trigger.setAttribute('aria-label', 'Cấu hình giờ điểm danh của giáo viên');
  trigger.setAttribute('aria-controls', CONFIG_PANEL_ID);
  trigger.setAttribute('aria-selected', 'false');
  trigger.innerHTML = '<span class="bes-attendance-time-trigger-icon" aria-hidden="true">⚙</span><b>Cấu hình</b>';
  trigger.addEventListener('click', () => {
    if (configOpen) return;
    configOpen = true;
    queueRender();
  });
  return trigger;
}

function closeConfigView() {
  if (!configOpen) return;
  configOpen = false;
  queueRender();
}

function renderCompactTimeSettings() {
  renderQueued = false;
  const tabs = document.querySelector('.attendance-tabs');
  if (!tabs) return;

  const shell = tabs.closest('.attendance-shell');
  const content = shell?.querySelector('.attendance-content');
  const panel = shell?.querySelector('.bes-attendance-time-settings');
  let trigger = tabs.querySelector(`.${ATTENDANCE_COMPACT_TIME_TRIGGER_CLASS}`);

  if (!panel || !content) {
    trigger?.remove();
    tabs.classList.remove('is-time-config-open');
    content?.classList.remove('is-time-config-open');
    configOpen = false;
    return;
  }

  if (!trigger) {
    trigger = createTrigger();
    tabs.appendChild(trigger);
  }

  if (panel.parentElement !== content) content.prepend(panel);
  panel.classList.add('is-config-view');
  panel.id = CONFIG_PANEL_ID;
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('aria-labelledby', CONFIG_TAB_ID);
  panel.hidden = !configOpen;

  tabs.classList.toggle('is-time-config-open', configOpen);
  content.classList.toggle('is-time-config-open', configOpen);
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
      closeConfigView();
    }, true);
    queueRender();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}

installAttendanceCompactTimeSettings();
