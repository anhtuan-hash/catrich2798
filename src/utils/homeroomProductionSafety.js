function text(value, fallback = '') {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

export const ATTENDANCE_LOCK_ERROR = 'attendance-session-locked';
export const ATTENDANCE_UNLOCK_ERROR = 'attendance-unlock-requires-correction';

export function getAttendanceLockViolation(previousWorkspace, nextWorkspace) {
  const previous = previousWorkspace && typeof previousWorkspace === 'object' ? previousWorkspace : {};
  const next = nextWorkspace && typeof nextWorkspace === 'object' ? nextWorkspace : {};
  const locks = previous.attendanceLocks && typeof previous.attendanceLocks === 'object'
    ? previous.attendanceLocks
    : {};

  for (const [sessionKey, lock] of Object.entries(locks)) {
    if (!lock?.locked) continue;

    const nextLock = next.attendanceLocks?.[sessionKey];
    const attendanceChanged = !sameJson(previous.attendance?.[sessionKey], next.attendance?.[sessionKey]);
    const sessionChanged = !sameJson(previous.attendanceSessions?.[sessionKey], next.attendanceSessions?.[sessionKey]);

    if (nextLock?.locked) {
      if (attendanceChanged || sessionChanged) {
        return {
          code: ATTENDANCE_LOCK_ERROR,
          sessionKey,
          message: 'Phiên điểm danh đã chốt nên không thể sửa dữ liệu trực tiếp. Hãy tạo yêu cầu chỉnh sửa trước.',
        };
      }
      continue;
    }

    const correction = (next.correctionRequests || []).find((request) => (
      text(request?.sessionKey) === sessionKey
      && text(request?.reason)
      && ['pending', 'approved'].includes(text(request?.status, 'pending'))
    ));

    if (!correction) {
      return {
        code: ATTENDANCE_UNLOCK_ERROR,
        sessionKey,
        message: 'Muốn mở khóa phiên điểm danh phải có yêu cầu chỉnh sửa kèm lý do.',
      };
    }

    if (attendanceChanged || sessionChanged) {
      return {
        code: ATTENDANCE_LOCK_ERROR,
        sessionKey,
        message: 'Mở khóa và sửa dữ liệu phải là hai thao tác riêng. Hãy mở khóa hợp lệ trước rồi mới chỉnh điểm danh.',
      };
    }
  }

  return null;
}

export function stripRetiredRestoreFields(workspace) {
  if (!workspace || typeof workspace !== 'object') return workspace;
  const {
    learning,
    learningTab,
    legacyLearning,
    portalLegacy,
    legacyPortal,
    ...safe
  } = workspace;
  return safe;
}
