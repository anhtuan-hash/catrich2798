function text(value) { return String(value ?? '').trim(); }
function dateText(value) { return text(value).slice(0, 10); }
function integer(value) { const n = Number(value); return Number.isFinite(n) ? n : 0; }

export function normalizeSupplementalActivity(row = {}) {
  const kind = text(row.kind || row.supplementalKind || row.supplemental_kind).toLowerCase() === 'recurring' ? 'recurring' : 'adhoc';
  const start = text(row.startTime || row.start_time);
  const end = text(row.endTime || row.end_time);
  return {
    id: text(row.id),
    source: 'supplemental',
    activityType: 'supplemental',
    title: text(row.title || row.groupName || row.group_name || row.subject || 'Học bổ sung'),
    subject: text(row.subject),
    teacherName: text(row.teacherName || row.teacher_name),
    date: dateText(row.date || row.attendanceDate || row.attendance_date),
    timeRange: text(row.timeRange || row.time_range || (start && end ? `${start}–${end}` : '')),
    room: text(row.room || row.teachingRoom || row.teaching_room),
    participantCount: integer(row.participantCount ?? row.participant_count ?? row.totalStudents ?? row.total_students),
    status: text(row.status || row.sessionStatus || row.session_status || 'scheduled'),
    supplementalKind: kind,
  };
}

export function normalizeExtraClassActivity(row = {}) {
  const type = text(row.activityType || row.activity_type || row.classType || row.class_type).toLowerCase();
  const activityType = type === 'enrichment' || type === 'gifted' ? 'enrichment' : 'remedial';
  return {
    id: text(row.id),
    source: 'extra',
    activityType,
    title: text(row.title || row.className || row.class_name),
    subject: text(row.subject),
    teacherName: text(row.teacherName || row.teacher_name),
    date: dateText(row.date || row.attendanceDate || row.attendance_date),
    timeRange: text(row.timeRange || row.time_range || row.teachingTimeRange || row.teaching_time_range),
    room: text(row.room || row.teachingRoom || row.teaching_room),
    participantCount: integer(row.participantCount ?? row.participant_count ?? row.totalStudents ?? row.total_students),
    status: text(row.status || row.sessionStatus || row.session_status),
    supplementalKind: '',
  };
}

export function normalizeAttendanceActivity(row = {}) {
  const source = text(row.source).toLowerCase();
  const type = text(row.activityType || row.activity_type).toLowerCase();
  return source === 'supplemental' || type === 'supplemental'
    ? normalizeSupplementalActivity(row)
    : normalizeExtraClassActivity(row);
}

export function filterAttendanceActivities(rows = [], activityType = 'all') {
  const wanted = text(activityType || 'all').toLowerCase();
  const normalized = (Array.isArray(rows) ? rows : []).map(normalizeAttendanceActivity);
  return wanted === 'all' ? normalized : normalized.filter((row) => row.activityType === wanted);
}
