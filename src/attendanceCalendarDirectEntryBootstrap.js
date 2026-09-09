import './styles/AttendanceCalendarDirectEntry.css';

const INSTALL_KEY = '__besAttendanceCalendarDirectEntryInstalled';
const HIDDEN_QUICK_ATTRIBUTE = 'data-bes-hidden-quick-tab';
const CALENDAR_TAB_ATTRIBUTE = 'data-bes-calendar-entry-tab';
const DETAIL_ATTRIBUTE = 'data-bes-calendar-class-detail';
const DAILY_ROOT_SELECTOR = '[data-attendance-daily-status-root]';
const BACK_BUTTON_CLASS = 'bes-attendance-calendar-back';

let observer = null;
let scanQueued = false;
const initializedShells = new WeakSet();

function text(value) {
  return String(value ?? '').trim();
}

function fold(value) {
  return text(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function findAttendanceTab(label, shell = document) {
  const wanted = fold(label);
  return [...shell.querySelectorAll('.attendance-tabs button')]
    .find((button) => fold(button.textContent).includes(wanted)) || null;
}

function markAttendanceTabs(shell) {
  const quickTab = findAttendanceTab('Điểm danh nhanh', shell);
  const calendarTab = findAttendanceTab('Lịch điểm danh', shell) || findAttendanceTab('Lịch tháng', shell);

  if (quickTab) quickTab.setAttribute(HIDDEN_QUICK_ATTRIBUTE, 'true');
  if (calendarTab) calendarTab.setAttribute(CALENDAR_TAB_ATTRIBUTE, 'true');

  return { quickTab, calendarTab };
}

function setControlledValue(element, value) {
  if (!element) return;
  const prototype = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
  if (descriptor?.set) descriptor.set.call(element, value);
  else element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function waitFor(resolveValue, timeout = 3500) {
  const startedAt = Date.now();
  return new Promise((resolve) => {
    const probe = () => {
      const value = resolveValue();
      if (value) {
        resolve(value);
        return;
      }
      if (Date.now() - startedAt >= timeout) {
        resolve(null);
        return;
      }
      window.setTimeout(probe, 50);
    };
    probe();
  });
}

function calendarDateForRow(row, shell) {
  const dateInput = shell.querySelector(`${DAILY_ROOT_SELECTOR} input[type="date"]`)
    || shell.querySelector('.attendance-daily-compact-toolbar input[type="date"]');
  return text(dateInput?.value);
}

function classNameForRow(row) {
  return text(row.querySelector('.attendance-daily-class-row__class b')?.textContent);
}

function findQuickClassButton(quickLayout, classId, className) {
  const buttons = [...quickLayout.querySelectorAll('.attendance-class-list > div:last-child > button')];
  const wantedId = text(classId);
  const wantedName = fold(className);
  return buttons.find((button) => {
    const buttonId = text(
      button.getAttribute('data-bes-attendance-class-id')
        || button.dataset?.besAttendanceClassId,
    );
    if (wantedId && buttonId && buttonId === wantedId) return true;
    return wantedName && fold(button.querySelector('.attendance-class-name-row b')?.textContent) === wantedName;
  }) || null;
}

function exitCalendarClassDetail(shell) {
  if (!shell) return;
  const { calendarTab } = markAttendanceTabs(shell);
  shell.removeAttribute(DETAIL_ATTRIBUTE);
  shell.querySelector(`.${BACK_BUTTON_CLASS}`)?.remove();
  calendarTab?.classList.remove('bes-calendar-detail-active');
  calendarTab?.click();
}

function syncBackButton(shell, detailActive) {
  let button = shell.querySelector(`.${BACK_BUTTON_CLASS}`);
  if (!detailActive) {
    button?.remove();
    return;
  }

  const rollcall = shell.querySelector('.attendance-rollcall');
  if (!rollcall) return;
  if (!button) {
    button = document.createElement('button');
    button.type = 'button';
    button.className = BACK_BUTTON_CLASS;
    button.setAttribute('aria-label', 'Quay lại lịch điểm danh');
    button.innerHTML = '<span aria-hidden="true">←</span><b>Quay lại lịch điểm danh</b>';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      exitCalendarClassDetail(shell);
    });
  }

  const rollcallHead = rollcall.querySelector('.attendance-rollcall-head');
  if (button.parentElement !== rollcall || (rollcallHead && button.nextElementSibling !== rollcallHead)) {
    rollcall.insertBefore(button, rollcallHead || rollcall.firstChild);
  }
}

function syncDetailState(shell) {
  if (!shell?.isConnected) return;
  const { quickTab, calendarTab } = markAttendanceTabs(shell);
  const quickLayout = shell.querySelector('.attendance-quick-layout');

  if (!quickLayout && shell.hasAttribute(DETAIL_ATTRIBUTE)) {
    shell.removeAttribute(DETAIL_ATTRIBUTE);
  }

  const detailActive = Boolean(shell.hasAttribute(DETAIL_ATTRIBUTE) && quickLayout);
  calendarTab?.classList.toggle('bes-calendar-detail-active', detailActive);
  syncBackButton(shell, detailActive);

  if (!initializedShells.has(shell) && quickTab && calendarTab) {
    initializedShells.add(shell);
    if (quickTab.classList.contains('is-active') && !detailActive) {
      queueMicrotask(() => {
        if (!shell.isConnected || shell.hasAttribute(DETAIL_ATTRIBUTE)) return;
        const currentTabs = markAttendanceTabs(shell);
        if (currentTabs.quickTab?.classList.contains('is-active')) currentTabs.calendarTab?.click();
      });
    }
  }
}

async function openClassFromCalendar(row) {
  const shell = row.closest('.attendance-shell');
  if (!shell) return;

  const { quickTab, calendarTab } = markAttendanceTabs(shell);
  if (!quickTab) return;

  const classId = text(row.dataset?.classId);
  const className = classNameForRow(row);
  const attendanceDate = calendarDateForRow(row, shell);
  if ((!classId && !className) || !attendanceDate) return;

  shell.setAttribute(DETAIL_ATTRIBUTE, 'true');
  calendarTab?.classList.add('bes-calendar-detail-active');
  quickTab.click();

  const quickLayout = await waitFor(() => shell.querySelector('.attendance-quick-layout'));
  if (!quickLayout) {
    shell.removeAttribute(DETAIL_ATTRIBUTE);
    calendarTab?.classList.remove('bes-calendar-detail-active');
    calendarTab?.click();
    return;
  }

  const searchInput = quickLayout.querySelector('.att-m3-class-search input');
  if (searchInput && searchInput.value) setControlledValue(searchInput, '');

  const allSubjectButton = [...quickLayout.querySelectorAll('.att-m3-subject-hub button')]
    .find((button) => fold(button.textContent).startsWith('tat ca'));
  allSubjectButton?.click();

  const dateInput = quickLayout.querySelector('.attendance-session-controls input[type="date"]');
  if (dateInput && dateInput.value !== attendanceDate) setControlledValue(dateInput, attendanceDate);

  const classButton = await waitFor(() => findQuickClassButton(quickLayout, classId, className));
  if (!classButton) {
    shell.removeAttribute(DETAIL_ATTRIBUTE);
    calendarTab?.classList.remove('bes-calendar-detail-active');
    calendarTab?.click();
    return;
  }

  classButton.click();
  syncDetailState(shell);
  shell.querySelector('.attendance-rollcall')?.scrollTo?.({ top: 0, behavior: 'instant' });
}

function onCapturedClick(event) {
  const row = event.target?.closest?.('.attendance-daily-class-row');
  if (row && row.closest(DAILY_ROOT_SELECTOR)) {
    event.preventDefault();
    event.stopImmediatePropagation();
    void openClassFromCalendar(row);
    return;
  }

  const calendarTab = event.target?.closest?.(`[${CALENDAR_TAB_ATTRIBUTE}]`);
  if (calendarTab) {
    const shell = calendarTab.closest('.attendance-shell');
    shell?.removeAttribute(DETAIL_ATTRIBUTE);
    shell?.querySelector(`.${BACK_BUTTON_CLASS}`)?.remove();
    calendarTab.classList.remove('bes-calendar-detail-active');
  }
}

function scanAttendanceShells() {
  scanQueued = false;
  document.querySelectorAll('.attendance-shell').forEach((shell) => syncDetailState(shell));
}

function queueScan() {
  if (scanQueued) return;
  scanQueued = true;
  queueMicrotask(scanAttendanceShells);
}

function startAttendanceCalendarDirectEntry() {
  if (observer || typeof document === 'undefined') return;
  document.addEventListener('click', onCapturedClick, { capture: true });
  scanAttendanceShells();
  observer = new MutationObserver(queueScan);
  observer.observe(document.body, { childList: true, subtree: true });
}

export function installAttendanceCalendarDirectEntry() {
  if (typeof window === 'undefined' || window[INSTALL_KEY]) return;
  window[INSTALL_KEY] = true;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startAttendanceCalendarDirectEntry, { once: true });
  } else {
    startAttendanceCalendarDirectEntry();
  }
}

installAttendanceCalendarDirectEntry();