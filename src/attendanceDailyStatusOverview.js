import { getRuntimeClient } from './services/runtime/core.js';
import { isExtraClassScheduledOnDate, roomForExtraClass } from './utils/extraClassSchedule2026.js';
import {
  attendanceFloorForRoom,
  matchesAttendanceRoomFilter,
  sortAttendanceRoomLabels,
  sortAttendanceRowsByRoomRoute,
} from './utils/attendanceDailyRoomFilter.js';
import './components/attendance/AttendanceDailyOverview.css';

const CLASS_COLUMNS = 'id,class_type,class_name,subject,teacher_name,active,room,time_range,grade_level,source_key';
const SESSION_COLUMNS = 'id,class_id,class_name,subject,teacher_name,attendance_date,checked_at,total_students,present_count,absent_count,session_status,lesson_periods,cancellation_reason,teaching_room,teaching_time_range';
const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const HOST_ATTRIBUTE = 'data-attendance-daily-status-root';
const VIEW_ATTRIBUTE = 'data-attendance-daily-only';

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

function renameCalendarTab() {
  const button = findAttendanceTab('Lịch tháng') || findAttendanceTab('Lịch điểm danh');
  if (!button || fold(button.textContent) === fold('Lịch điểm danh')) return;
  const textNode = [...button.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
  if (textNode) textNode.textContent = 'Lịch điểm danh';
  else button.append(document.createTextNode('Lịch điểm danh'));
  button.setAttribute('aria-label', 'Lịch điểm danh');
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

async function openHistoryAttendance(classRow) {
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

function syncRoomFilterChips(layout, scheduledClasses, dailySessionsByClass) {
  const roomChips = layout.querySelector('.attendance-calendar-room-chips');
  if (!roomChips) return;
  const roomOptions = sortAttendanceRoomLabels(scheduledClasses.map((classRow) => (
    displayedRoomForClass(classRow, dailySessionsByClass.get(String(classRow.id)))
  )));
  if (dailyRoomFilter !== 'all' && !roomOptions.some((room) => matchesAttendanceRoomFilter(room, dailyRoomFilter))) {
    dailyRoomFilter = 'all';
  }
  const chip = (value, label) => {
    const active = matchesAttendanceRoomFilter(value, dailyRoomFilter) && (dailyRoomFilter === 'all' ? value === 'all' : true);
    const floor = value === 'all' ? null : attendanceFloorForRoom(value);
    const floorAttribute = floor ? ` data-floor="${floor}"` : '';
    return `<button type="button" class="attendance-calendar-room-chip ${active ? 'is-active' : ''}" data-room-filter="${escapeHtml(value)}"${floorAttribute} aria-pressed="${active ? 'true' : 'false'}">${escapeHtml(label)}</button>`;
  };
  roomChips.innerHTML = `${chip('all', 'Tất cả phòng')}${roomOptions.map((room) => chip(room, room)).join('')}`;
}

function renderDailyRows(layout, overview, classes, sessions) {
  const dailySessionsByClass = new Map();
  sessions.forEach((session) => {
    const key = String(session.class_id);
    const current = dailySessionsByClass.get(key);
    if (!current || String(session.checked_at || '') >= String(current.checked_at || '')) dailySessionsByClass.set(key, session);
  });

  const scheduledClasses = classes.filter((classRow) => isExtraClassScheduledOnDate(classRow, dailyAttendanceDate));
  syncRoomFilterChips(layout, scheduledClasses, dailySessionsByClass);
  const visibleClasses = sortAttendanceRowsByRoomRoute(
    scheduledClasses.filter((classRow) => matchesAttendanceRoomFilter(
      displayedRoomForClass(classRow, dailySessionsByClass.get(String(classRow.id))),
      dailyRoomFilter,
    )),
    (classRow) => displayedRoomForClass(classRow, dailySessionsByClass.get(String(classRow.id))),
  );
  const completedCount = visibleClasses.filter((classRow) => statusForSession(dailySessionsByClass.get(String(classRow.id))) === 'completed').length;
  const cancelledCount = visibleClasses.filter((classRow) => statusForSession(dailySessionsByClass.get(String(classRow.id))) === 'cancelled').length;
  const missingCount = Math.max(0, visibleClasses.length - completedCount - cancelledCount);

  const metrics = `
    <div class="attendance-daily-overview__summary is-compact" aria-label="Tóm tắt điểm danh">
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

  const floorCounts = new Map();
  visibleClasses.forEach((classRow) => {
    const session = dailySessionsByClass.get(String(classRow.id));
    const floor = attendanceFloorForRoom(displayedRoomForClass(classRow, session));
    if (floor) floorCounts.set(floor, (floorCounts.get(floor) || 0) + 1);
  });

  let previousFloor = null;
  const rows = visibleClasses.map((classRow) => {
    const session = dailySessionsByClass.get(String(classRow.id));
    const status = statusForSession(session);
    const teacher = status === 'completed' ? (session?.teacher_name || classRow.teacher_name || 'Chưa ghi giáo viên') : (classRow.teacher_name || 'Chưa phân công GV');
    const room = displayedRoomForClass(classRow, session) || 'Chưa ghi phòng';
    const floor = attendanceFloorForRoom(room);
    const timeRange = session?.teaching_time_range || classRow.time_range || 'Chưa ghi giờ';
    const attendanceMeta = status === 'completed'
      ? `${Number(session?.present_count || 0)}/${Number(session?.total_students || 0)} có mặt · ${String(session?.lesson_periods || 1).replace('.', ',')} tiết`
      : status === 'cancelled'
        ? `${session?.cancellation_reason || 'Buổi học đã hủy'} · 0 tiết`
        : 'Có lịch nhưng chưa chốt';
    const floorAttribute = floor ? ` data-floor="${floor}"` : '';
    const showFloorSeparator = dailyRoomFilter === 'all' && floor && floor !== previousFloor;
    if (floor) previousFloor = floor;
    const floorSeparator = showFloorSeparator
      ? `<div class="attendance-daily-floor-group" data-floor="${floor}"><strong>Lầu ${floor}</strong><span>${floorCounts.get(floor) || 0} lớp</span></div>`
      : '';

    return `${floorSeparator}
      <button type="button" class="attendance-daily-class-row is-${status}" data-class-id="${escapeHtml(classRow.id)}"${floorAttribute}>
        <span class="attendance-daily-class-row__class"><b>${escapeHtml(classRow.class_name)}</b><small>${escapeHtml(classTypeLabel(classRow))} · ${escapeHtml(classRow.subject || 'Chưa ghi môn')}</small></span>
        <span class="attendance-daily-class-row__teacher"><b>${escapeHtml(teacher)}</b></span>
        <span class="attendance-daily-class-row__meta is-room"${floorAttribute}><b>${escapeHtml(room)}</b><small>${floor ? `Lầu ${floor}` : 'Phòng học'}</small></span>
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
        await openHistoryAttendance(classRow);
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
      if (overview.isConnected) loadDailyOverview(layout, overview);
    }, 260);
    return;
  }

  try {
    const [classResult, sessionResult] = await Promise.all([
      client.from('bes_extra_classes').select(CLASS_COLUMNS).eq('active', true).order('class_name', { ascending: true }),
      client.from('bes_extra_attendance_sessions').select(SESSION_COLUMNS).eq('attendance_date', dailyAttendanceDate).order('checked_at', { ascending: true }),
    ]);
    if (token !== requestToken || !overview.isConnected) return;
    const firstError = classResult.error || sessionResult.error;
    if (firstError) throw firstError;
    dailyOverviewSnapshot = { classes: classResult.data || [], sessions: sessionResult.data || [] };
    renderDailyRows(layout, overview, dailyOverviewSnapshot.classes, dailyOverviewSnapshot.sessions);
  } catch (error) {
    if (token !== requestToken || !overview.isConnected) return;
    renderError(overview, error?.message || 'Không thể tải trạng thái điểm danh theo ngày.');
  }
}

function hideLegacyMonthlyView(layout) {
  layout.setAttribute(VIEW_ATTRIBUTE, 'true');
  [
    '.attendance-calendar-toolbar',
    '.attendance-calendar-weekdays',
    '.attendance-calendar-grid',
  ].forEach((selector) => {
    layout.querySelectorAll(selector).forEach((element) => {
      element.hidden = true;
      element.setAttribute('aria-hidden', 'true');
    });
  });
  layout.querySelectorAll('.attendance-loading').forEach((element) => {
    if (!element.closest(`[${HOST_ATTRIBUTE}]`)) {
      element.hidden = true;
      element.setAttribute('aria-hidden', 'true');
    }
  });
}

function installDailyOverview(layout) {
  if (!layout) return;
  hideLegacyMonthlyView(layout);
  if (layout.querySelector(`[${HOST_ATTRIBUTE}]`)) return;

  const host = document.createElement('section');
  host.setAttribute(HOST_ATTRIBUTE, 'true');
  host.className = 'attendance-daily-overview-host';
  host.innerHTML = `
    <div class="attendance-daily-compact-toolbar" style="grid-template-columns:minmax(0,1fr) 150px">
      <div class="attendance-calendar-room-filter" aria-label="Lọc theo phòng học">
        <div class="attendance-calendar-room-chips" role="group" aria-label="Phòng học"><button type="button" class="attendance-calendar-room-chip is-active" data-room-filter="all" aria-pressed="true">Tất cả phòng</button></div>
      </div>
      <label class="attendance-calendar-mode-bar__date">
        <span class="sr-only">Ngày điểm danh</span>
        <input type="date" aria-label="Ngày điểm danh" max="${vietnamDateString()}" value="${escapeHtml(dailyAttendanceDate)}" />
      </label>
    </div>
    <div class="attendance-daily-overview" aria-live="polite"></div>`;

  layout.prepend(host);

  const roomChips = host.querySelector('.attendance-calendar-room-chips');
  roomChips?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-room-filter]');
    if (!button || !roomChips.contains(button)) return;
    dailyRoomFilter = button.dataset.roomFilter || 'all';
    const overview = host.querySelector('.attendance-daily-overview');
    if (overview && dailyOverviewSnapshot) {
      renderDailyRows(layout, overview, dailyOverviewSnapshot.classes, dailyOverviewSnapshot.sessions);
    }
  });

  const dateInput = host.querySelector('input[type="date"]');
  dateInput?.addEventListener('change', () => {
    if (!dateInput.value) return;
    dailyAttendanceDate = dateInput.value;
    dailyOverviewSnapshot = null;
    const overview = host.querySelector('.attendance-daily-overview');
    if (overview) loadDailyOverview(layout, overview);
  });

  const overview = host.querySelector('.attendance-daily-overview');
  if (overview) loadDailyOverview(layout, overview);
}

function scanAttendanceCalendar() {
  scanQueued = false;
  renameCalendarTab();
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
