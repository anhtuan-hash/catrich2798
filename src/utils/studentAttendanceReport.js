// Pure, read-only aggregations for the student attendance report.
// Only confirmed attendance records contribute to the denominator.
const safe = (value) => String(value ?? '').trim();
const fold = (value) => safe(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLocaleLowerCase('vi');
const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

export function studentIdentity(record) {
  const code = fold(record.student_code);
  if (code) return 'code:' + code;
  const name = fold(record.student_full_name);
  const schoolClass = fold(record.school_class_name);
  if (name && schoolClass) return 'name-class:' + name + '|' + schoolClass;
  // Do not merge anonymous or ambiguous identities across unrelated groups.
  return 'member:' + safe(record.class_id) + ':' + safe(record.member_id || record.member_key || record.id);
}

export function attendanceAlert(row, { goodAt = 90, warningAt = 80, unexcusedAt = 2, lateAt = 3 } = {}) {
  const pct = row.totalPeriods > 0 ? (row.presentPeriods / row.totalPeriods) * 100 : null;
  if (pct === null) return 'unknown';
  if (pct < warningAt || row.unexcusedCount >= unexcusedAt) return 'danger';
  if (pct < goodAt || row.lateCount >= lateAt) return 'watch';
  return 'good';
}

function emptyStudent(record, key) {
  return {
    key, studentCode: safe(record.student_code), name: safe(record.student_full_name) || 'Chưa ghi họ tên',
    schoolClass: safe(record.school_class_name), classIds: new Set(), subjects: new Set(),
    types: new Set(), sessionCount: 0, presentCount: 0, absentCount: 0, lateCount: 0,
    excusedCount: 0, unexcusedCount: 0, totalPeriods: 0, presentPeriods: 0, absentPeriods: 0,
    details: [], subjectMap: new Map(), monthMap: new Map(),
  };
}

export function buildStudentAttendanceReport({
  sessions = [], records = [], activityType = 'all', classId = 'all',
  schoolClass = 'all', grade = 'all', subject = 'all', teacher = 'all', search = '',
  alert = 'all', thresholds = {},
} = {}) {
  const sessionMap = new Map();
  (Array.isArray(sessions) ? sessions : []).forEach((session) => {
    const status = safe(session.session_status || session.status).toLowerCase();
    if (status !== 'completed' && status !== 'confirmed') return;
    const kind = safe(session.class_type);
    if (activityType !== 'all' && kind !== (activityType === 'enrichment' ? 'gifted' : activityType)) return;
    if (classId !== 'all' && safe(session.class_id) !== safe(classId)) return;
    if (subject !== 'all' && fold(session.subject) !== fold(subject)) return;
    if (teacher !== 'all' && fold(session.teacher_name) !== fold(teacher)) return;
    const periods = Number(session.lesson_periods);
    if (!Number.isFinite(periods) || periods <= 0) return;
    sessionMap.set(safe(session.id), { ...session, periods });
  });

  // One definitive attendance status per student and session, even if a record is repeated.
  const definitive = new Map();
  (Array.isArray(records) ? records : []).forEach((record) => {
    const session = sessionMap.get(safe(record.session_id));
    const status = safe(record.status).toLowerCase();
    if (!session || !['present', 'late', 'tardy', 'absent'].includes(status)) return;
    const identity = studentIdentity(record);
    const key = safe(record.session_id) + '|' + identity;
    const existing = definitive.get(key);
    const updatedAt = safe(record.recorded_at);
    if (!existing || updatedAt >= safe(existing.recorded_at)) definitive.set(key, record);
  });

  // Some older roll calls omit student codes while newer roll calls contain them.
  // Reconcile an uncoded full-name + school-class pair to a coded identity only
  // when exactly one distinct code occurs for that pair in the selected data.
  const knownCodes = new Map();
  definitive.forEach((record) => {
    const code = fold(record.student_code);
    const name = fold(record.student_full_name);
    const school = fold(record.school_class_name);
    if (!code || !name || !school) return;
    const key = name + '|' + school;
    if (!knownCodes.has(key)) knownCodes.set(key, new Set());
    knownCodes.get(key).add(code);
  });
  function resolvedIdentity(record) {
    const code = fold(record.student_code);
    if (code) return 'code:' + code;
    const name = fold(record.student_full_name);
    const school = fold(record.school_class_name);
    const codes = knownCodes.get(name + '|' + school);
    return codes?.size === 1 ? 'code:' + [...codes][0] : studentIdentity(record);
  }

  const grouped = new Map();
  definitive.forEach((record) => {
    const school = safe(record.school_class_name);
    if (schoolClass !== 'all' && fold(school) !== fold(schoolClass)) return;
    if (grade !== 'all' && !new RegExp('^' + grade + '(?:\\D|$)').test(school)) return;
    const session = sessionMap.get(safe(record.session_id));
    const key = resolvedIdentity(record);
    let row = grouped.get(key);
    if (!row) {
      row = emptyStudent(record, key);
      grouped.set(key, row);
    }
    if (!row.studentCode && record.student_code) row.studentCode = safe(record.student_code);
    if (!row.schoolClass && school) row.schoolClass = school;
    const present = ['present', 'late', 'tardy'].includes(safe(record.status).toLowerCase());
    const late = ['late', 'tardy'].includes(safe(record.status).toLowerCase());
    const periods = session.periods;
    row.totalPeriods += periods;
    row.presentPeriods += present ? periods : 0;
    row.absentPeriods += present ? 0 : periods;
    row.sessionCount += 1;
    row.presentCount += Number(present);
    row.absentCount += Number(!present);
    row.lateCount += Number(late);
    const absenceReason = safe(record.absence_reason_code).toLowerCase();
    row.excusedCount += Number(!present && ['excused', 'sick', 'family'].includes(absenceReason));
    row.unexcusedCount += Number(!present && absenceReason === 'unexcused');
    row.classIds.add(safe(session.class_id));
    row.types.add(safe(session.class_type));
    const course = safe(session.subject) || 'Chưa ghi môn';
    row.subjects.add(course);
    const detail = {
      sessionId: safe(session.id), date: safe(session.attendance_date).slice(0, 10),
      classId: safe(session.class_id), className: safe(session.class_name),
      activityType: safe(session.class_type), subject: course, teacher: safe(session.teacher_name),
      room: safe(session.teaching_room), timeRange: safe(session.teaching_time_range),
      periods, status: present ? (late ? 'late' : 'present') : 'absent',
      absenceReason, absenceNote: safe(record.absence_note),
    };
    row.details.push(detail);
    const sub = row.subjectMap.get(course) || { subject: course, total: 0, present: 0, absent: 0 };
    sub.total += periods;
    sub.present += present ? periods : 0;
    sub.absent += present ? 0 : periods;
    row.subjectMap.set(course, sub);
    const month = detail.date.slice(0, 7);
    const trend = row.monthMap.get(month) || { month, total: 0, present: 0 };
    trend.total += periods;
    trend.present += present ? periods : 0;
    row.monthMap.set(month, trend);
  });

  const q = fold(search);
  const students = [...grouped.values()].map((row) => ({
    ...row,
    totalPeriods: round(row.totalPeriods), presentPeriods: round(row.presentPeriods),
    absentPeriods: round(row.absentPeriods),
    subjects: [...row.subjects].sort((a, b) => a.localeCompare(b, 'vi')),
    types: [...row.types],
    classCount: row.classIds.size,
    rate: row.totalPeriods ? row.presentPeriods / row.totalPeriods : null,
    alert: attendanceAlert(row, thresholds),
    subjectRows: [...row.subjectMap.values()].map((s) => ({
      ...s, total: round(s.total), present: round(s.present), absent: round(s.absent),
    })).sort((a, b) => a.subject.localeCompare(b.subject, 'vi')),
    monthRows: [...row.monthMap.values()].sort((a, b) => a.month.localeCompare(b.month)),
    details: row.details.sort((a, b) => b.date.localeCompare(a.date) || a.subject.localeCompare(b.subject, 'vi')),
  })).filter((row) => (alert === 'all' || row.alert === alert)
    && (!q || fold([row.name, row.studentCode, row.schoolClass, ...row.subjects].join(' ')).includes(q)))
    .sort((a, b) => (a.rate ?? -1) - (b.rate ?? -1) || a.name.localeCompare(b.name, 'vi'));

  const totals = students.reduce((sum, row) => ({
    students: sum.students + 1, totalPeriods: sum.totalPeriods + row.totalPeriods,
    presentPeriods: sum.presentPeriods + row.presentPeriods, absentPeriods: sum.absentPeriods + row.absentPeriods,
    atRisk: sum.atRisk + Number(row.alert === 'danger' || row.alert === 'watch'),
  }), { students: 0, totalPeriods: 0, presentPeriods: 0, absentPeriods: 0, atRisk: 0 });
  totals.totalPeriods = round(totals.totalPeriods);
  totals.presentPeriods = round(totals.presentPeriods);
  totals.absentPeriods = round(totals.absentPeriods);
  totals.rate = totals.totalPeriods ? totals.presentPeriods / totals.totalPeriods : null;
  return { students, totals, eligibleSessions: sessionMap.size, detailedRecords: definitive.size };
}
