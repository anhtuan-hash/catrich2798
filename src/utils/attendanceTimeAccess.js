export const ATTENDANCE_TIME_ZONE = 'Asia/Ho_Chi_Minh';

function normalizeRangeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[–—−]/g, '-')
    .replace(/\b(?:đến|den|to)\b/g, '-')
    .replace(/\s+/g, ' ');
}

function clockValue(hourRaw, minuteRaw) {
  const hour = Number(hourRaw);
  const minute = minuteRaw === undefined || minuteRaw === '' ? 0 : Number(minuteRaw);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

export function parseAttendanceTimeRange(value) {
  const normalized = normalizeRangeText(value);
  if (!normalized) return null;

  const match = normalized.match(/^(\d{1,2})\s*(?:[:hg]\s*(\d{1,2}))?\s*-\s*(\d{1,2})\s*(?:[:hg]\s*(\d{1,2}))?$/i);
  if (!match) return null;

  const startMinutes = clockValue(match[1], match[2]);
  const endMinutes = clockValue(match[3], match[4]);
  if (startMinutes === null || endMinutes === null) return null;

  return {
    startMinutes,
    endMinutes,
    overnight: endMinutes < startMinutes,
  };
}

function vietnamClockParts(dateValue = new Date()) {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ATTENDANCE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const map = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return {
    date: `${map.year}-${map.month}-${map.day}`,
    seconds: Number(map.hour) * 3600 + Number(map.minute) * 60 + Number(map.second),
  };
}

function shiftIsoDate(dateValue, amount) {
  const match = String(dateValue || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  date.setUTCDate(date.getUTCDate() + amount);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function weekdayOfIsoDate(dateValue) {
  const match = String(dateValue || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (Number.isNaN(date.getTime())) return null;
  return date.getUTCDay();
}

export function parseSchoolWeekdays(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))].sort((a, b) => a - b);
  }
  const values = String(value || '').split(',').map((token) => token.trim()).filter(Boolean).flatMap((token) => {
    const folded = token.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (folded === 'cn' || folded === 'chu nhat' || folded === 'chunhat') return [0];
    const schoolDay = Number(token);
    return Number.isInteger(schoolDay) && schoolDay >= 2 && schoolDay <= 7 ? [schoolDay - 1] : [];
  });
  return [...new Set(values)].sort((a, b) => a - b);
}

export function isAssignedAttendanceTeacher({ profile = {}, classRow = {}, classTeachers = [] } = {}) {
  const profileId = String(profile.id || '').trim();
  const email = String(profile.email || '').trim().toLowerCase();
  const name = String(profile.full_name || profile.name || '').trim().toLowerCase();
  if (!profileId && !email && !name) return false;

  const rowMatches = (row) => {
    const teacherId = String(row?.teacher_id || '').trim();
    const teacherEmail = String(row?.teacher_email || '').trim().toLowerCase();
    const teacherName = String(row?.teacher_name || '').trim().toLowerCase();
    return Boolean(
      (profileId && teacherId && teacherId === profileId)
      || (email && teacherEmail && teacherEmail === email)
      || (name && teacherName && teacherName === name)
    );
  };

  if (classTeachers.some(rowMatches)) return true;
  if (rowMatches(classRow)) return true;

  return String(classRow?.teacher_name || '')
    .split(',')
    .map((teacherName) => teacherName.trim().toLowerCase())
    .filter(Boolean)
    .some((teacherName) => Boolean(name && teacherName === name));
}

export function evaluateAttendanceTimeAccess({
  restrictionEnabled = false,
  isAdmin = false,
  hasReportPermission = false,
  hasQuickPermission = false,
  isAssigned = false,
  timeRange = '',
  attendanceDate = '',
  weekdays = '',
  now = new Date(),
} = {}) {
  if (isAdmin) return { allowed: true, reason: 'admin_bypass', bypass: true };
  if (hasReportPermission) return { allowed: true, reason: 'report_bypass', bypass: true };
  if (!hasQuickPermission) return { allowed: false, reason: 'missing_permission', bypass: false };
  if (!restrictionEnabled) return { allowed: true, reason: 'restriction_disabled', bypass: false };
  if (!isAssigned) return { allowed: false, reason: 'unassigned', bypass: false };

  const parsed = parseAttendanceTimeRange(timeRange);
  if (!parsed) return { allowed: false, reason: 'invalid_time', bypass: false };

  const clock = vietnamClockParts(now);
  if (!clock) return { allowed: false, reason: 'invalid_now', bypass: false };
  const startSeconds = parsed.startMinutes * 60;
  const endSeconds = parsed.endMinutes * 60;
  let inWindow = false;
  let expectedSessionDate = clock.date;

  if (parsed.overnight) {
    if (clock.seconds >= startSeconds) {
      inWindow = true;
      expectedSessionDate = clock.date;
    } else if (clock.seconds <= endSeconds) {
      inWindow = true;
      expectedSessionDate = shiftIsoDate(clock.date, -1);
    }
  } else {
    inWindow = clock.seconds >= startSeconds && clock.seconds <= endSeconds;
  }

  if (!inWindow) {
    return { allowed: false, reason: 'outside_time', bypass: false, timeRange, expectedSessionDate };
  }
  if (String(attendanceDate || '') !== expectedSessionDate) {
    return { allowed: false, reason: 'wrong_session_date', bypass: false, timeRange, expectedSessionDate };
  }

  const allowedWeekdays = parseSchoolWeekdays(weekdays);
  const sessionWeekday = weekdayOfIsoDate(attendanceDate);
  if (allowedWeekdays.length && sessionWeekday !== null && !allowedWeekdays.includes(sessionWeekday)) {
    return { allowed: false, reason: 'off_schedule', bypass: false, timeRange, expectedSessionDate };
  }

  return { allowed: true, reason: 'within_window', bypass: false, timeRange, expectedSessionDate };
}

export function attendanceAccessReasonVi(result = {}) {
  switch (result.reason) {
    case 'unassigned': return 'Bạn không nằm trong phân công của lớp này.';
    case 'invalid_time': return 'Lớp chưa có khung giờ hợp lệ. Admin cần cập nhật thời gian học trước khi bật giới hạn.';
    case 'outside_time': return `Chỉ được thao tác điểm danh trong khung giờ ${result.timeRange || 'đã cấu hình'} của lớp.`;
    case 'wrong_session_date': return 'Giáo viên chỉ được thao tác đúng ngày của buổi học đang diễn ra.';
    case 'off_schedule': return 'Hôm nay không phải ngày học đã cấu hình của lớp.';
    case 'missing_permission': return 'Tài khoản chưa có quyền Điểm danh nhanh.';
    case 'invalid_now': return 'Không thể xác định thời gian hiện tại theo múi giờ Việt Nam.';
    default: return result.allowed ? 'Được phép thao tác điểm danh.' : 'Không thể thao tác điểm danh lúc này.';
  }
}
