import { getRuntimeClient } from './services/runtime/core.js';
import { isExtraClassScheduledOnDate, roomForExtraClass } from './utils/extraClassSchedule2026.js';
import { matchesAttendanceRoomFilter, sortAttendanceRoomLabels } from './utils/attendanceDailyRoomFilter.js';
import './components/attendance/AttendanceDailyOverview.css';

const CLASS_COLUMNS = 'id,class_type,class_name,subject,teacher_name,active,room,time_range,grade_level,source_key';
const SESSION_COLUMNS = 'id,class_id,class_name,subject,teacher_name,attendance_date,checked_at,total_students,present_count,absent_count,session_status,lesson_periods,cancellation_reason,teaching_room,teaching_time_range';
const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const HOST_ATTRIBUTE = 'data-attendance-daily-status-root';
const MODE_ATTRIBUTE = 'data-attendance-daily-mode';

let calendarMode = 'class';
let dailyAttendanceDate = vietnamDateString();
let dailyRoomFilter = 'all';
let dailyOverviewSnapshot = null;
let requestToken = 0;
let observer = null;
let scanQueued = false;

function vietnamDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VIETNAM_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const map = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function formatDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}

function fold(value) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function classTypeLabel(classRow) {
  if (classRow?.class_type === 'gifted') return 'Bồi dưỡng HSG';
  if (classRow?.class_type === 'remedial') return 'Phụ đạo';
  return 'Lớp bổ trợ';
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

function waitFor(resolveValue, timeout = 3000) {
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
      window.setTimeout(probe, 60);
    };
    probe();
  });
}

function findAttendanceTab(label) {
  const wanted = fold(label);
  return [...document.querySelectorAll('.attendance-tabs button')]
    .find((button) => fold(button.textContent).includes(wanted)) || null;
}

async function openQuickAttendance(classRow) {
  const quickTab = findAttendanceTab('Điểm danh nhanh');
  if (!quickTab) return;
  quickTab.click();

  const quickLayout = await waitFor(() => document.querySelector('.attendance-quick-layout'));
  if (!quickLayout) return;

  const searchInput = quickLayout.querySelector('.att-m3-class-search input');
  if (searchInput && searchInput.value) setControlledValue(searchInput, '');

  const allSubjectButton = [...quickLayout.querySelectorAll('.att-m3-subject-hub button')]
    .find((button) => fold(button.textContent).startsWith('tat ca'));
  allSubjectButton?.click();

  const dateInput = quickLayout.querySelector('.attendance-session-controls input[type="date"]');
  if (dateInput) setControlledValue(dateInput, dailyAttendanceDate);

  const classButton = await waitFor(() => [...document.querySelectorAll('.attendance-class-list > div:last-child > button')]
    .find((button) => fold(button.querySelector('.attendance-class-name-row b')?.textContent) === fold(classRow.class_name)));
  classButton?.click();
}

async function openHistoryFallback(classRow) {
  const historyTab = findAttendanceTab('Lịch sử');
  if (!historyTab) return;
  historyTab.click();
  const historyList = await waitFor(() => document.querySelector('.attendance-history-items'));
  if (!historyList) return;
  const targetDate = formatDate(dailyAttendanceDate);
  const row = [...historyList.querySelectorAll('button')].find((button) => {
    const text = fold(button.textContent);
    return text.includes(fold(classRow.class_name)) && text.includes(fold(targetDate));
  });
  row?.click();
}

async function openExistingAttendance(layout, classRow) {
  setCalendarMode(layout, 'class');
  const toolbar = layout.querySelector('.attendance-calendar-toolbar');
  const classSelect = toolbar?.querySelector('select');
  const monthInput = toolbar?.querySelector('input[type="month"]');
  if (classSelect) setControlledValue(classSelect, String(classRow.id));
  if (monthInput) setControlledValue(monthInput, dailyAttendanceDate.slice(0, 7));

  const dayNumber = String(Number(dailyAttendanceDate.slice(-2)));
  const dayButton = await waitFor(() => [...layout.querySelectorAll('.attendance-calendar-day')].find((button) => {
    const dateText = button.querySelector('.attendance-calendar-date')?.textContent?.trim();
    return dateText === dayNumber && !button.disabled;
  }), 3600);

  if (dayButton) {
    dayButton.click();
    return;
  }
  await openHistoryFallback(classRow);
}

function statusForSession(session) {
  if (session?.session_status === 'cancelled') return 'cancelled';
  if (session?.session_status === 'completed') return 'completed';
  return 'missing';
}

function statusLabel(status) {
  if (status === 'completed') return 'Đã điểm danh';
  if (status === 'cancelled') return 'Đã hủy';
  return 'Chưa điểm danh';
}

function displayedRoomForClass(classRow, session) {
  return String(session?.teaching_room || roomForExtraClass(classRow) || classRow?.room || '').trim();
}

function renderLoading(overview) {
  overview.innerHTML = '<div class="attendance-daily-overview__empty">Đang tải trạng thái điểm danh theo ngày…</div>';
}

function renderError(overview, message) {
  overview.innerHTML = `<div class="attendance-daily-overview__empty">${escapeHtml(message || 'Không thể tải trạng thái điểm danh theo ngày.')}</div>`;
}

function syncRoomFilterOptions(layout, scheduledClasses, dailySessionsByClass) {
  const roomSelect = layout.querySelector('.attendance-calendar-mode-bar__room select');
  if (!roomSelect) return;
  const roomOptions = sortAttendanceRoomLabels(scheduledClasses.map((classRow) => (
    displayedRoomForClass(classRow, dailySessionsByClass.get(String(classRow.id)))
  )));
  if (dailyRoomFilter !== 'all' && !roomOptions.some((room) => matchesAttendanceRoomFilter(room, dailyRoomFilter))) {
    dailyRoomFilter = 'all';
  }
  roomSelect.innerHTML = `<option value="all">Tất cả phòng</option>${roomOptions.map((room) => `<option value="${escapeHtml(room)}">${escapeHtml(room)}</option>`).join('')}`;
  roomSelect.value = dailyRoomFilter;
}

function renderDailyRows(layout, overview, classes, sessions) {
  const dailySessionsByClass = new Map();
  sessions.forEach((session) => {
    const key = String(session.class_id);
    const current = dailySessionsByClass.get(key);
    if (!current || String(session.checked_at || '') >= String(current.checked_at || '')) dailySessionsByClass.set(key, session);
  });

  const scheduledClasses = classes.filter((classRow) => isExtraClassScheduledOnDate(classRow, dailyAttendanceDate));
  syncRoomFilterOptions(layout, scheduledClasses, dailySessionsByClass);
  const visibleClasses = scheduledClasses.filter((classRow) => matchesAttendanceRoomFilter(
    displayedRoomForClass(classRow, dailySessionsByClass.get(String(classRow.id))),
    dailyRoomFilter,
  ));
  const completedCount = visibleClasses.filter((classRow) => statusForSession(dailySessionsByClass.get(String(classRow.id))) === 'completed').length;
  const cancelledCount = visibleClasses.filter((classRow) => statusForSession(dailySessionsByClass.get(String(classRow.id))) === 'cancelled').length;
  const missingCount = Math.max(0, visibleClasses.length - completedCount - cancelledCount);

  const metrics = `
    <div class="attendance-daily-overview__summary">
      <article class="attendance-daily-overview__metric"><span>Có lịch</span><b>${visibleClasses.length}</b></article>
      <article class="attendance-daily-overview__metric is-completed"><span>Đã điểm danh</span><b>${completedCount}</b></article>
      <article class="attendance-daily-overview__metric is-missing"><span>Chưa điểm danh</span><b>${missingCount}</b></article>
      <article class="attendance-daily-overview__metric is-cancelled"><span>Đã hủy</span><b>${cancelledCount}</b></article>
    </div>`;

  if (!scheduledClasses.length) {
    overview.innerHTML = `${metrics}<div class="attendance-daily-overview__empty">Không có lớp nào theo lịch vào ngày ${escapeHtml(formatDate(dailyAttendanceDate))}.</div>`;
    return;
  }

  if (!visibleClasses.length) {
    overview.innerHTML = `${metrics}<div class="attendance-daily-overview__empty">Không có lớp nào ở phòng ${escapeHtml(dailyRoomFilter)} trong ngày ${escapeHtml(formatDate(dailyAttendanceDate))}.</div>`;
    return;
  }

  const rows = visibleClasses.map((classRow) => {
    const session = dailySessionsByClass.get(String(classRow.id));
    const status = statusForSession(session);
    const teacher = status === 'completed' ? (session?.teacher_name || classRow.teacher_name || 'Chưa ghi giáo viên') : (classRow.teacher_name || 'Chưa phân công GV');
    const room = displayedRoomForClass(classRow, session) || 'Chưa ghi phòng';
    const timeRange = session?.teaching_time_range || classRow.time_range || 'Chưa ghi giờ';
    const attendanceMeta = status === 'completed'
      ? `${Number(session?.present_count || 0)}/${Number(session?.total_students || 0)} có mặt · ${String(session?.lesson_periods || 1).replace('.', ',')} tiết`
      : status === 'cancelled'
        ? `${session?.cancellation_reason || 'Buổi học đã hủy'} · 0 tiết`
        : 'Có lịch học nhưng chưa chốt điểm danh';

    return `
      <button type="button" class="attendance-daily-class-row is-${status}" data-class-id="${escapeHtml(classRow.id)}">
        <span class="attendance-daily-class-row__class"><b>${escapeHtml(classRow.class_name)}</b><small>${escapeHtml(classTypeLabel(classRow))} · ${escapeHtml(classRow.subject || 'Chưa ghi môn')}</small></span>
        <span class="attendance-daily-class-row__teacher"><b>${escapeHtml(teacher)}</b><small>Giáo viên</small></span>
        <span class="attendance-daily-class-row__meta"><b>${escapeHtml(room)}</b><small>Phòng học</small></span>
        <span class="attendance-daily-class-row__meta is-time"><b>${escapeHtml(timeRange)}</b><small>${escapeHtml(attendanceMeta)}</small></span>
        <span class="attendance-daily-class-row__status is-${status}">${statusLabel(status)}</span>
      </button>`;
  }).join('');

  overview.innerHTML = `${metrics}<div class="attendance-daily-overview__list">${rows}</div>`;
  overview.querySelectorAll('.attendance-daily-class-row').forEach((button) => {
    button.addEventListener('click', async () => {
      const classRow = visibleClasses.find((row) => String(row.id) === String(button.dataset.classId));
      if (!classRow) return;
      const session = dailySessionsByClass.get(String(classRow.id));
      if (session?.session_status === 'completed' || session?.session_status === 'cancelled') {
        await openExistingAttendance(layout, classRow);
      } else {
        await openQuickAttendance(classRow);
      }
    });
  });
}

async function loadDailyOverview(layout, overview) {
  const token = ++requestToken;
  renderLoading(overview);
  const client = getRuntimeClient();
  if (!client) {
    window.setTimeout(() => {
      if (overview.isConnected && calendarMode === 'daily') loadDailyOverview(layout, overview);
    }, 260);
    return;
  }

  try {
    const [classResult, sessionResult] = await Promise.all([
      client.from('bes_extra_classes').select(CLASS_COLUMNS).eq('active', true).order('class_name', { ascending: true }),
      client.from('bes_extra_attendance_sessions').select(SESSION_COLUMNS).eq('attendance_date', dailyAttendanceDate).order('checked_at', { ascending: true }),
    ]);
    if (token !== requestToken || !overview.isConnected || calendarMode !== 'daily') return;
    const firstError = classResult.error || sessionResult.error;
    if (firstError) throw firstError;
    dailyOverviewSnapshot = { classes: classResult.data || [], sessions: sessionResult.data || [] };
    renderDailyRows(layout, overview, dailyOverviewSnapshot.classes, dailyOverviewSnapshot.sessions);
  } catch (error) {
    if (token !== requestToken || !overview.isConnected) return;
    renderError(overview, error?.message || 'Không thể tải trạng thái điểm danh theo ngày.');
  }
}

function setCalendarMode(layout, mode) {
  calendarMode = mode === 'daily' ? 'daily' : 'class';
  layout.setAttribute(MODE_ATTRIBUTE, calendarMode);
  const host = layout.querySelector(`[${HOST_ATTRIBUTE}]`);
  if (!host) return;
  host.querySelectorAll('.attendance-calendar-mode-switch button').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.mode === calendarMode);
    button.setAttribute('aria-pressed', button.dataset.mode === calendarMode ? 'true' : 'false');
  });
  const dateField = host.querySelector('.attendance-calendar-mode-bar__date');
  if (dateField) dateField.hidden = calendarMode !== 'daily';
  const roomField = host.querySelector('.attendance-calendar-mode-bar__room');
  if (roomField) roomField.hidden = calendarMode !== 'daily';
  const overview = host.querySelector('.attendance-daily-overview');
  if (!overview) return;
  overview.hidden = calendarMode !== 'daily';
  if (calendarMode === 'daily') loadDailyOverview(layout, overview);
  else requestToken += 1;
}

function installDailyOverview(layout) {
  if (!layout || layout.querySelector(`[${HOST_ATTRIBUTE}]`)) return;
  const host = document.createElement('section');
  host.setAttribute(HOST_ATTRIBUTE, 'true');
  host.className = 'attendance-daily-overview-host';
  host.innerHTML = `
    <div class="attendance-calendar-mode-bar">
      <div class="attendance-calendar-mode-switch" role="group" aria-label="Kiểu xem lịch điểm danh">
        <button type="button" data-mode="class">Theo lớp</button>
        <button type="button" data-mode="daily">Theo ngày</button>
      </div>
      <label class="attendance-calendar-mode-bar__room">
        <span>Phòng học</span>
        <select aria-label="Lọc theo phòng học"><option value="all">Tất cả phòng</option></select>
      </label>
      <label class="attendance-calendar-mode-bar__date">
        <span>Ngày</span>
        <input type="date" max="${vietnamDateString()}" value="${escapeHtml(dailyAttendanceDate)}" />
      </label>
    </div>
    <div class="attendance-daily-overview" aria-live="polite"></div>`;

  const toolbar = layout.querySelector('.attendance-calendar-toolbar');
  if (toolbar?.nextSibling) layout.insertBefore(host, toolbar.nextSibling);
  else layout.appendChild(host);

  host.querySelectorAll('.attendance-calendar-mode-switch button').forEach((button) => {
    button.addEventListener('click', () => setCalendarMode(layout, button.dataset.mode));
  });

  const roomSelect = host.querySelector('.attendance-calendar-mode-bar__room select');
  roomSelect?.addEventListener('change', () => {
    dailyRoomFilter = roomSelect.value || 'all';
    const overview = host.querySelector('.attendance-daily-overview');
    if (calendarMode === 'daily' && overview && dailyOverviewSnapshot) {
      renderDailyRows(layout, overview, dailyOverviewSnapshot.classes, dailyOverviewSnapshot.sessions);
    }
  });

  const dateInput = host.querySelector('input[type="date"]');
  dateInput?.addEventListener('change', () => {
    if (!dateInput.value) return;
    dailyAttendanceDate = dateInput.value;
    dailyOverviewSnapshot = null;
    const overview = host.querySelector('.attendance-daily-overview');
    if (calendarMode === 'daily' && overview) loadDailyOverview(layout, overview);
  });

  setCalendarMode(layout, calendarMode);
}

function scanAttendanceCalendar() {
  scanQueued = false;
  document.querySelectorAll('.attendance-calendar-layout').forEach((layout) => installDailyOverview(layout));
}

function scheduleScan() {
  if (scanQueued) return;
  scanQueued = true;
  queueMicrotask(scanAttendanceCalendar);
}

function startDailyAttendanceOverview() {
  if (observer || typeof document === 'undefined') return;
  scanAttendanceCalendar();
  observer = new MutationObserver(scheduleScan);
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startDailyAttendanceOverview, { once: true });
} else {
  startDailyAttendanceOverview();
}
