function clean(value) {
  return String(value ?? '').trim();
}

export function summarizeSupportState(alerts = [], cases = [], now = new Date()) {
  const students = new Set();
  for (const row of [...alerts, ...cases]) {
    const ref = clean(row?.student_ref || row?.studentRef);
    if (ref) students.add(ref);
  }
  const nowMs = new Date(now).getTime();
  return {
    monitoredStudents: students.size,
    newAlerts: alerts.filter((row) => row?.status === 'NEW').length,
    activeCases: cases.filter((row) => ['NEW', 'REVIEWING', 'ACTIVE', 'FOLLOW_UP'].includes(row?.status)).length,
    followUpDue: cases.filter((row) => {
      if (!row?.follow_up_at || ['CLOSED', 'NO_ACTION_REQUIRED'].includes(row?.status)) return false;
      const due = new Date(row.follow_up_at).getTime();
      return Number.isFinite(due) && due <= nowMs;
    }).length,
    resolvedCases: cases.filter((row) => row?.status === 'RESOLVED').length,
    closedCases: cases.filter((row) => row?.status === 'CLOSED').length,
  };
}

export function filterSupportAlerts(alerts = [], filters = {}) {
  const status = clean(filters.status).toUpperCase();
  const className = clean(filters.className).toLowerCase();
  const alertType = clean(filters.alertType).toLowerCase();
  const studentRef = clean(filters.studentRef).toLowerCase();
  return alerts.filter((row) => {
    if (status && clean(row?.status).toUpperCase() !== status) return false;
    if (className && clean(row?.source_class_name || row?.class_name).toLowerCase() !== className) return false;
    if (alertType && clean(row?.alert_type).toLowerCase() !== alertType) return false;
    if (studentRef && clean(row?.student_ref).toLowerCase() !== studentRef) return false;
    return true;
  });
}
