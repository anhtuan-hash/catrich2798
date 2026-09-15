function asDate(value) {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
  const date = new Date(value || 0);
  return Number.isFinite(date.getTime()) ? date : null;
}

function upper(value) {
  return String(value || '').trim().toUpperCase();
}

export function isActionOverdue(action = {}, now = new Date()) {
  const status = upper(action.status);
  if (['DONE', 'CANCELLED'].includes(status)) return false;
  const due = asDate(action.due_at || action.dueAt);
  const reference = asDate(now);
  return Boolean(due && reference && due.getTime() < reference.getTime());
}

export function isCaseFollowUpDue(caseRow = {}, now = new Date()) {
  const status = upper(caseRow.status);
  if (!['ACTIVE', 'FOLLOW_UP'].includes(status)) return false;
  const due = asDate(caseRow.follow_up_at || caseRow.followUpAt);
  const reference = asDate(now);
  return Boolean(due && reference && due.getTime() <= reference.getTime());
}

export function isAlertReviewOverdue(alert = {}, now = new Date(), reviewHours = 48) {
  const status = upper(alert.status);
  if (!['NEW', 'REVIEWING'].includes(status)) return false;
  const started = asDate(alert.first_triggered_at || alert.firstTriggeredAt || alert.created_at || alert.createdAt);
  const reference = asDate(now);
  const hours = Math.max(1, Math.min(24 * 30, Number(reviewHours) || 48));
  return Boolean(started && reference && reference.getTime() - started.getTime() >= hours * 60 * 60 * 1000);
}

const TEMPLATE_MESSAGES = Object.freeze({
  ACTION_OVERDUE: 'Một hoạt động hỗ trợ đã quá hạn và cần được giáo viên kiểm tra.',
  CASE_FOLLOW_UP_DUE: 'Một hồ sơ hỗ trợ đã đến hạn theo dõi tiếp.',
  ALERT_REVIEW_OVERDUE: 'Một cảnh báo Student Support đã quá thời hạn xem xét.',
});

export function buildStudentSupportNotification(input = {}) {
  const type = upper(input.type);
  const message = TEMPLATE_MESSAGES[type];
  if (!message) throw new Error('Loại thông báo Student Support không hợp lệ.');
  return {
    title: 'Student Support',
    message,
    target: String(input.target || '#/student-support'),
    category: 'work',
    source: 'student-support',
    priority: 'normal',
  };
}

export function emitStudentSupportNotification(input = {}) {
  const detail = buildStudentSupportNotification(input);
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('bes-global-notification', { detail }));
  }
  return detail;
}
