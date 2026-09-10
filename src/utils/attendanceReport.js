import { groupAttendanceChangesBySession } from './attendanceAuditActors.js';

const ABSENCE_REASON_LABELS = Object.freeze({
  excused: 'Có phép',
  unexcused: 'Không phép',
  sick: 'Ốm',
  family: 'Việc gia đình',
  other: 'Khác',
  unspecified: 'Chưa ghi lý do',
});

function normalizeSession(session) {
  const status = session?.session_status === 'cancelled' ? 'cancelled' : 'completed';
  const rawPeriods = Number(session?.lesson_periods);
  const lessonPeriods = status === 'cancelled' ? 0 : (Number.isFinite(rawPeriods) ? rawPeriods : 1);
  return {
    ...session,
    class_type: String(session?.class_type || ''),
    session_status: status,
    lesson_periods: lessonPeriods,
    cancellation_reason: String(session?.cancellation_reason || ''),
    teaching_room: String(session?.teaching_room || ''),
    teaching_time_range: String(session?.teaching_time_range || ''),
    checked_by_name: String(session?.checked_by_name || ''),
    total_students: Number(session?.total_students || 0),
    present_count: Number(session?.present_count || 0),
    absent_count: Number(session?.absent_count || 0),
  };
}

function sameText(a, b) {
  return String(a || '').trim().localeCompare(String(b || '').trim(), 'vi', { sensitivity: 'base' }) === 0;
}

function roundHalf(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 2) / 2;
}

function matchesPeriod(session, mode, month, date) {
  const attendanceDate = String(session?.attendance_date || '');
  if (mode === 'day') return !date || attendanceDate === date;
  return !month || attendanceDate.slice(0, 7) === month;
}

export function absenceReasonLabel(code) {
  return ABSENCE_REASON_LABELS[String(code || '').trim()] || ABSENCE_REASON_LABELS.unspecified;
}

export function buildAttendanceReport({
  sessions = [],
  records = [],
  changes = [],
  classes = [],
  mode = 'month',
  month = '',
  date = '',
  classId = 'all',
  teacherName = 'all',
} = {}) {
  const normalized = sessions.map(normalizeSession);
  const filteredSessions = normalized
    .filter((session) => matchesPeriod(session, mode, month, date))
    .filter((session) => classId === 'all' || String(session.class_id) === String(classId))
    .filter((session) => teacherName === 'all' || (session.session_status === 'completed' && sameText(session.teacher_name, teacherName)))
    .sort((a, b) => String(a.attendance_date || '').localeCompare(String(b.attendance_date || '')) || String(a.class_name || '').localeCompare(String(b.class_name || ''), 'vi'));

  const completed = filteredSessions.filter((session) => session.session_status === 'completed');
  const cancelled = filteredSessions.filter((session) => session.session_status === 'cancelled');
  const completedIds = new Set(completed.map((session) => String(session.id)));
  const lateCountBySession = new Map();
  records.forEach((record) => {
    const sessionId = String(record?.session_id || '');
    if (record?.status !== 'late' || !completedIds.has(sessionId)) return;
    lateCountBySession.set(sessionId, (lateCountBySession.get(sessionId) || 0) + 1);
  });
  const lateInstances = [...lateCountBySession.values()].reduce((sum, count) => sum + count, 0);
  const presentInstances = completed.reduce((sum, session) => sum + session.present_count, 0);
  const absentInstances = completed.reduce((sum, session) => sum + session.absent_count, 0);
  const attendanceDenominator = presentInstances + absentInstances;

  const teacherMap = new Map();
  completed.forEach((session) => {
    const teacher = String(session.teacher_name || 'Chưa ghi giáo viên').trim() || 'Chưa ghi giáo viên';
    const key = teacher.toLocaleLowerCase('vi');
    const row = teacherMap.get(key) || {
      teacher_name: teacher,
      completed_sessions: 0,
      total_periods: 0,
      class_ids: new Set(),
      present_instances: 0,
      late_instances: 0,
      absent_instances: 0,
    };
    row.completed_sessions += 1;
    row.total_periods += session.lesson_periods;
    row.class_ids.add(String(session.class_id));
    row.present_instances += session.present_count;
    row.late_instances += lateCountBySession.get(String(session.id)) || 0;
    row.absent_instances += session.absent_count;
    teacherMap.set(key, row);
  });

  const teacherRows = [...teacherMap.values()]
    .map((row) => ({
      teacher_name: row.teacher_name,
      completed_sessions: row.completed_sessions,
      total_periods: roundHalf(row.total_periods),
      distinct_classes: row.class_ids.size,
      present_instances: row.present_instances,
      late_instances: row.late_instances,
      absent_instances: row.absent_instances,
      attendance_rate: row.present_instances + row.absent_instances
        ? row.present_instances / (row.present_instances + row.absent_instances)
        : 0,
    }))
    .sort((a, b) => b.total_periods - a.total_periods || a.teacher_name.localeCompare(b.teacher_name, 'vi'));

  const classMap = new Map(classes.map((item) => [String(item.id), item]));
  const auditBySession = groupAttendanceChangesBySession(changes);
  const sessionRows = filteredSessions.map((session) => {
    const classRow = classMap.get(String(session.class_id));
    const denominator = session.present_count + session.absent_count;
    const audit = auditBySession.get(String(session.id)) || { events: [], change_count: 0, latest_changed_by_name: '', latest_changed_at: '' };
    return {
      id: session.id,
      attendance_date: session.attendance_date,
      class_id: session.class_id,
      class_type: session.class_type || classRow?.class_type || '',
      class_name: session.class_name || classRow?.class_name || '',
      subject: session.subject || classRow?.subject || '',
      teaching_room: session.teaching_room,
      teaching_time_range: session.teaching_time_range,
      teacher_name: session.session_status === 'cancelled' ? '' : String(session.teacher_name || ''),
      checked_by_name: String(session.checked_by_name || ''),
      latest_changed_by_name: audit.latest_changed_by_name,
      latest_changed_at: audit.latest_changed_at,
      change_count: audit.change_count,
      change_history: audit.events,
      session_status: session.session_status,
      lesson_periods: session.lesson_periods,
      total_students: session.session_status === 'cancelled' ? null : session.total_students,
      present_count: session.session_status === 'cancelled' ? null : session.present_count,
      late_count: session.session_status === 'cancelled' ? null : (lateCountBySession.get(String(session.id)) || 0),
      absent_count: session.session_status === 'cancelled' ? null : session.absent_count,
      attendance_rate: session.session_status === 'cancelled' || !denominator ? null : session.present_count / denominator,
      note: session.session_status === 'cancelled' ? session.cancellation_reason : String(session.note || ''),
      cancellation_reason: session.cancellation_reason,
      checked_at: session.checked_at,
    };
  });

  const sessionById = new Map(completed.map((session) => [String(session.id), session]));
  const absenceRows = records
    .filter((record) => record.status === 'absent' && completedIds.has(String(record.session_id)))
    .map((record) => {
      const session = sessionById.get(String(record.session_id));
      const classRow = classMap.get(String(session?.class_id || record?.class_id || ''));
      const reasonCode = String(record?.absence_reason_code || '').trim() || 'unspecified';
      const audit = auditBySession.get(String(record.session_id)) || {};
      return {
        session_id: record.session_id,
        session_status: 'completed',
        attendance_date: session?.attendance_date || '',
        class_id: session?.class_id || record?.class_id || '',
        class_type: session?.class_type || classRow?.class_type || '',
        class_name: session?.class_name || classRow?.class_name || '',
        subject: session?.subject || classRow?.subject || '',
        teaching_room: session?.teaching_room || '',
        teaching_time_range: session?.teaching_time_range || '',
        checked_at: session?.checked_at || '',
        teacher_name: session?.teacher_name || '',
        checked_by_name: session?.checked_by_name || '',
        latest_changed_by_name: audit.latest_changed_by_name || '',
        latest_changed_at: audit.latest_changed_at || '',
        student_code: record.student_code || '',
        student_full_name: record.student_full_name || '',
        school_class_name: record.school_class_name || '',
        reason_code: reasonCode,
        reason_label: absenceReasonLabel(reasonCode),
        absence_note: String(record?.absence_note || ''),
      };
    })
    .sort((a, b) => String(a.attendance_date || '').localeCompare(String(b.attendance_date || '')) || a.student_full_name.localeCompare(b.student_full_name, 'vi'));

  return {
    mode: mode === 'day' ? 'day' : 'month',
    filteredSessions,
    metrics: {
      completedSessions: completed.length,
      cancelledSessions: cancelled.length,
      totalPeriods: roundHalf(completed.reduce((sum, session) => sum + session.lesson_periods, 0)),
      presentInstances,
      lateInstances,
      absentInstances,
      attendanceRate: attendanceDenominator ? presentInstances / attendanceDenominator : 0,
    },
    teacherRows,
    sessionRows,
    absenceRows,
  };
}

export function buildAttendanceMonthlyReport(args = {}) {
  return buildAttendanceReport({ ...args, mode: 'month' });
}

export function uniqueReportTeachers(sessions = [], month = '', { mode = 'month', date = '' } = {}) {
  const names = new Map();
  sessions.map(normalizeSession)
    .filter((session) => session.session_status === 'completed')
    .filter((session) => matchesPeriod(session, mode, month, date))
    .forEach((session) => {
      const name = String(session.teacher_name || '').trim();
      if (name) names.set(name.toLocaleLowerCase('vi'), name);
    });
  return [...names.values()].sort((a, b) => a.localeCompare(b, 'vi'));
}
