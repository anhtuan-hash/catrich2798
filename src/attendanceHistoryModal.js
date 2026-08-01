const STYLE_ID = 'bes-attendance-history-modal-style';
const BACKDROP_ID = 'bes-attendance-history-backdrop';
const PANEL_CLASS = 'bes-attendance-history-modal-card';
const OPEN_CLASS = 'is-open';

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .${PANEL_CLASS}{position:relative;min-height:0!important;overflow:hidden;border:1px solid rgba(26,115,232,.18)!important;background:var(--surface,#fff)!important;box-shadow:0 10px 28px rgba(32,33,36,.08)!important}
    .${PANEL_CLASS}:not(.${OPEN_CLASS}){padding-bottom:14px!important}
    .${PANEL_CLASS}:not(.${OPEN_CLASS})>:not(.hr-panel-head){display:none!important}
    .${PANEL_CLASS}:not(.${OPEN_CLASS}) .hr-panel-head{margin-bottom:0!important;cursor:pointer}
    .bes-attendance-history-summary{display:block;margin-top:5px;color:var(--text-muted,#667085);font-size:12px;font-style:normal;font-weight:600}
    .bes-attendance-history-open,.bes-attendance-history-close{min-height:38px;padding:0 16px;border:1px solid #aac4f7;border-radius:999px;background:#e8f0fe;color:#174ea6;font:inherit;font-weight:800;cursor:pointer;white-space:nowrap}
    .bes-attendance-history-open:hover,.bes-attendance-history-close:hover{background:#d2e3fc}
    .bes-attendance-history-close{display:none;width:40px;min-width:40px;padding:0;border-color:rgba(95,99,104,.25);background:var(--surface-soft,#f1f3f4);color:var(--text,#202124);font-size:20px;line-height:1}
    .${PANEL_CLASS}.${OPEN_CLASS}{position:fixed!important;z-index:100002!important;top:50%!important;left:50%!important;width:min(920px,calc(100vw - 32px))!important;max-width:920px!important;max-height:min(86vh,820px)!important;margin:0!important;padding:18px!important;transform:translate(-50%,-50%)!important;border-radius:22px!important;box-shadow:0 28px 90px rgba(15,23,42,.32)!important;overflow:hidden!important}
    .${PANEL_CLASS}.${OPEN_CLASS} .hr-panel-head{position:sticky;top:0;z-index:2;margin:-18px -18px 14px!important;padding:18px;border-bottom:1px solid rgba(95,99,104,.16);background:var(--surface,#fff)}
    .${PANEL_CLASS}.${OPEN_CLASS} .bes-attendance-history-open{display:none}
    .${PANEL_CLASS}.${OPEN_CLASS} .bes-attendance-history-close{display:inline-grid;place-items:center}
    .${PANEL_CLASS}.${OPEN_CLASS} .hr-history-list{display:grid!important;max-height:54vh;overflow-y:auto;overscroll-behavior:contain;padding-right:6px;scrollbar-gutter:stable}
    .${PANEL_CLASS}.${OPEN_CLASS} .hr-correction-list{display:block!important;max-height:22vh;overflow-y:auto;margin-top:14px}
    .${PANEL_CLASS}.${OPEN_CLASS}>.hr-muted{display:block!important;padding:26px 10px;text-align:center}
    #${BACKDROP_ID}{position:fixed;z-index:100001;inset:0;border:0;background:rgba(15,23,42,.52);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}
    html.bes-attendance-history-modal-open,html.bes-attendance-history-modal-open body{overflow:hidden!important}
    @media(max-width:640px){.${PANEL_CLASS}.${OPEN_CLASS}{top:auto!important;bottom:0!important;left:0!important;width:100vw!important;max-width:none!important;max-height:92vh!important;padding:14px!important;transform:none!important;border-radius:22px 22px 0 0!important}.${PANEL_CLASS}.${OPEN_CLASS} .hr-panel-head{margin:-14px -14px 12px!important;padding:14px}}
  `;
  document.head.appendChild(style);
}

function findHistoryPanel() {
  return [...document.querySelectorAll('.hr-panel')].find((panel) => (
    panel.querySelector(':scope > .hr-panel-head h2')?.textContent?.trim() === 'Lịch sử chuyên cần'
  )) || null;
}

function summaryText(panel) {
  const sessions = panel.querySelectorAll('.hr-history-list > button').length;
  const pending = [...panel.querySelectorAll('.hr-correction-list article')]
    .filter((item) => item.textContent?.toLowerCase().includes('pending')).length;
  return `${sessions} phiên gần nhất${pending ? ` · ${pending} yêu cầu đang chờ xử lý` : ''}`;
}

function refreshSummary(panel) {
  const summary = panel.querySelector('.bes-attendance-history-summary');
  if (!summary) return;
  const next = summaryText(panel);
  if (summary.textContent !== next) summary.textContent = next;
}

function closeModal(panel, focusTrigger = true) {
  if (!panel?.classList.contains(OPEN_CLASS)) return;
  panel.classList.remove(OPEN_CLASS);
  panel.removeAttribute('role');
  panel.removeAttribute('aria-modal');
  document.documentElement.classList.remove('bes-attendance-history-modal-open');
  document.getElementById(BACKDROP_ID)?.remove();
  if (focusTrigger) panel.querySelector('.bes-attendance-history-open')?.focus();
}

function openModal(panel) {
  if (!panel || panel.classList.contains(OPEN_CLASS)) return;
  document.querySelectorAll(`.${PANEL_CLASS}.${OPEN_CLASS}`).forEach((item) => closeModal(item, false));
  const backdrop = document.createElement('button');
  backdrop.id = BACKDROP_ID;
  backdrop.type = 'button';
  backdrop.tabIndex = -1;
  backdrop.setAttribute('aria-label', 'Đóng lịch sử chuyên cần');
  backdrop.addEventListener('click', () => closeModal(panel));
  document.body.appendChild(backdrop);
  refreshSummary(panel);
  panel.classList.add(OPEN_CLASS);
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'Lịch sử chuyên cần');
  document.documentElement.classList.add('bes-attendance-history-modal-open');
  requestAnimationFrame(() => panel.querySelector('.bes-attendance-history-close')?.focus());
}

function enhance(panel) {
  if (!panel || panel.dataset.attendanceHistoryModal === 'ready') return;
  panel.dataset.attendanceHistoryModal = 'ready';
  panel.classList.add(PANEL_CLASS);

  const head = panel.querySelector(':scope > .hr-panel-head');
  const copy = head?.querySelector(':scope > div');
  if (!head || !copy) return;

  const summary = document.createElement('em');
  summary.className = 'bes-attendance-history-summary';
  copy.appendChild(summary);

  const actions = document.createElement('div');
  actions.className = 'hr-head-actions bes-attendance-history-actions';

  const openButton = document.createElement('button');
  openButton.type = 'button';
  openButton.className = 'bes-attendance-history-open';
  openButton.textContent = 'Mở lịch sử';
  openButton.addEventListener('click', (event) => {
    event.stopPropagation();
    openModal(panel);
  });

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'bes-attendance-history-close';
  closeButton.setAttribute('aria-label', 'Đóng');
  closeButton.textContent = '×';
  closeButton.addEventListener('click', (event) => {
    event.stopPropagation();
    closeModal(panel);
  });

  actions.append(openButton, closeButton);
  head.appendChild(actions);
  refreshSummary(panel);

  head.addEventListener('click', (event) => {
    if (event.target.closest('button,input,select,textarea,a')) return;
    if (!panel.classList.contains(OPEN_CLASS)) openModal(panel);
  });

  panel.addEventListener('click', (event) => {
    const item = event.target.closest('.hr-history-list > button');
    if (!item) return;
    setTimeout(() => {
      closeModal(panel, false);
      document.querySelector('.hr-attendance-lock')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  });
}

let scheduled = false;
function scheduleEnhance() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    injectStyle();
    enhance(findHistoryPanel());
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  const panel = document.querySelector(`.${PANEL_CLASS}.${OPEN_CLASS}`);
  if (panel) closeModal(panel);
});

const observer = new MutationObserver(() => {
  const panel = findHistoryPanel();
  if (panel && panel.dataset.attendanceHistoryModal !== 'ready') scheduleEnhance();
});
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('hashchange', scheduleEnhance);
window.addEventListener('bes-homeroom-store-updated', () => {
  const panel = findHistoryPanel();
  if (panel?.dataset.attendanceHistoryModal === 'ready') refreshSummary(panel);
  else scheduleEnhance();
});

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleEnhance, { once: true });
else scheduleEnhance();
