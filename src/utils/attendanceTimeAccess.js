export const ATTENDANCE_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export function parseClockTime(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = match[3] === undefined ? 0 : Number(match[3]);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;
  if (!Number.isInteger(second) || second < 0 || second > 59) return null;
  return hour * 60 + minute + (second / 60);
}

function vietnamClockSeconds(dateValue = new Date()) {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ATTENDANCE_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const map = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return Number(map.hour) * 3600 + Number(map.minute) * 60 + Number(map.second);
}

function normalizedClockLabel(value) {
  const text = String(value || '').trim();
  const match = text.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return text;
  return `${String(Number(match[1])).padStart(2, '0')}:${match[2]}`;
}

export function attendanceWindowLabel(startTime, endTime) {
  return `${normalizedClockLabel(startTime)}–${normalizedClockLabel(endTime)}`;
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
  startTime = '',
  endTime = '',
  now = new Date(),
} = {}) {
  if (isAdmin) return { allowed: true, reason: 'admin_bypass', bypass: true };
  if (hasReportPermission) return { allowed: true, reason: 'report_bypass', bypass: true };
  if (!hasQuickPermission) return { allowed: false, reason: 'missing_permission', bypass: false };
  if (!restrictionEnabled) return { allowed: true, reason: 'restriction_disabled', bypass: false };
  if (!isAssigned) return { allowed: false, reason: 'unassigned', bypass: false };

  const startMinutes = parseClockTime(startTime);
  const endMinutes = parseClockTime(endTime);
  if (startMinutes === null || endMinutes === null || startMinutes === endMinutes) {
    return { allowed: false, reason: 'invalid_time', bypass: false };
  }

  const nowSeconds = vietnamClockSeconds(now);
  if (nowSeconds === null) return { allowed: false, reason: 'invalid_now', bypass: false };
  const startSeconds = Math.round(startMinutes * 60);
  const endSeconds = Math.round(endMinutes * 60);
  const overnight = endSeconds < startSeconds;
  const inWindow = overnight
    ? nowSeconds >= startSeconds || nowSeconds <= endSeconds
    : nowSeconds >= startSeconds && nowSeconds <= endSeconds;
  const windowLabel = attendanceWindowLabel(startTime, endTime);

  if (!inWindow) {
    return {
      allowed: false,
      reason: 'outside_time',
      bypass: false,
      startTime,
      endTime,
      windowLabel,
      overnight,
    };
  }

  return {
    allowed: true,
    reason: 'within_window',
    bypass: false,
    startTime,
    endTime,
    windowLabel,
    overnight,
  };
}

export function attendanceAccessReasonVi(result = {}) {
  switch (result.reason) {
    case 'unassigned': return 'Bạn không nằm trong phân công của lớp này.';
    case 'invalid_time': return 'Khung giờ điểm danh chưa hợp lệ. Admin cần kiểm tra giờ bắt đầu và giờ kết thúc.';
    case 'outside_time': return `Giáo viên chỉ được thao tác điểm danh trong khung giờ ${result.windowLabel || 'Admin đã quy định'}.`;
    case 'missing_permission': return 'Tài khoản chưa có quyền Điểm danh nhanh.';
    case 'invalid_now': return 'Không thể xác định thời gian hiện tại theo múi giờ Việt Nam.';
    default: return result.allowed ? 'Được phép thao tác điểm danh.' : 'Không thể thao tác điểm danh lúc này.';
  }
}
