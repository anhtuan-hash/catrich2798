export const POST_CONFIRM_EDIT_WINDOW_MS = 30 * 60 * 1000;

function validDate(value) {
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

export function evaluatePostConfirmEditAccess({
  session = null,
  currentUserId = '',
  isAdmin = false,
  hasReportPermission = false,
  hasQuickPermission = false,
  now = new Date(),
} = {}) {
  if (!session || session.session_status !== 'completed') {
    return { allowed: false, reason: 'not_completed', bypass: false, remainingMs: 0, expiresAt: '' };
  }

  const checkedAt = validDate(session.checked_at);
  if (!checkedAt) {
    return { allowed: false, reason: 'invalid_checked_at', bypass: false, remainingMs: 0, expiresAt: '' };
  }

  const expiresAtMs = checkedAt.getTime() + POST_CONFIRM_EDIT_WINDOW_MS;
  const expiresAt = new Date(expiresAtMs).toISOString();
  const nowDate = validDate(now) || new Date();
  const remainingMs = Math.max(0, expiresAtMs - nowDate.getTime());

  if (isAdmin) {
    return { allowed: true, reason: 'admin_bypass', bypass: true, remainingMs, expiresAt };
  }
  if (hasReportPermission) {
    return { allowed: true, reason: 'report_bypass', bypass: true, remainingMs, expiresAt };
  }
  if (!hasQuickPermission) {
    return { allowed: false, reason: 'missing_permission', bypass: false, remainingMs, expiresAt };
  }
  if (!currentUserId || String(session.checked_by || '') !== String(currentUserId)) {
    return { allowed: false, reason: 'not_session_teacher', bypass: false, remainingMs, expiresAt };
  }

  const allowed = nowDate.getTime() <= expiresAtMs;
  return {
    allowed,
    reason: allowed ? 'within_edit_window' : 'edit_window_expired',
    bypass: false,
    remainingMs,
    expiresAt,
  };
}

export function formatPostConfirmRemaining(remainingMs) {
  const ms = Math.max(0, Number(remainingMs) || 0);
  if (ms <= 0) return '0 phút';
  const minutes = Math.ceil(ms / 60_000);
  return `${minutes} phút`;
}

export function postConfirmAccessReasonVi(result = {}) {
  switch (result.reason) {
    case 'admin_bypass': return 'Admin được phép điều chỉnh điểm danh sau khi chốt.';
    case 'report_bypass': return 'Tài khoản có quyền Báo cáo được phép điều chỉnh điểm danh sau khi chốt.';
    case 'within_edit_window': return `Còn ${formatPostConfirmRemaining(result.remainingMs)} để điều chỉnh.`;
    case 'edit_window_expired': return 'Đã khóa chỉnh sửa sau 30 phút kể từ lúc chốt.';
    case 'not_session_teacher': return 'Chỉ giáo viên đã chốt buổi điểm danh này mới được điều chỉnh trong 30 phút.';
    case 'missing_permission': return 'Tài khoản không có quyền Điểm danh nhanh.';
    case 'invalid_checked_at': return 'Không xác định được thời điểm chốt buổi điểm danh.';
    case 'not_completed': return 'Chỉ buổi đã điểm danh mới có thể điều chỉnh.';
    default: return result.allowed ? 'Được phép điều chỉnh điểm danh.' : 'Không thể điều chỉnh điểm danh lúc này.';
  }
}
