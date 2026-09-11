import fs from 'node:fs';

const componentPath = 'src/components/GlobalAttendanceNavigationTab.jsx';
const bootstrapPath = 'src/supplementalAttendanceReportingBootstrap.js';

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Patch target not found: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`Patch target is not unique: ${label}`);
  return source.slice(0, first) + after + source.slice(first + before.length);
}

function replaceRegexOnce(source, regex, after, label) {
  const matches = [...source.matchAll(new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`))];
  if (matches.length !== 1) throw new Error(`Patch target count ${matches.length} for: ${label}`);
  return source.replace(regex, after);
}

const helperBlock = [
  'function isSupplementalHistorySession(session) {',
  "  return session?.attendance_source === 'supplemental' || session?.class_type === 'supplemental';",
  '}',
  '',
  'function historyClassTypeLabel(session) {',
  "  return isSupplementalHistorySession(session) ? 'Học bổ sung' : extraClassTypeLabel(session?.class_type);",
  '}',
  '',
  'function normalizeSupplementalHistorySessions(rows = []) {',
  '  return (Array.isArray(rows) ? rows : []).map((row) => {',
  "    const sourceId = String(row?.id || '');",
  '    const participants = Array.isArray(row?.participants) ? row.participants : [];',
  '    const tardyCount = Number(row?.tardyCount || 0);',
  '    const presentCount = Number(row?.presentCount || 0);',
  '    return {',
  "      id: 'supplemental:' + sourceId,",
  "      class_id: row?.groupId ? 'supplemental-group:' + row.groupId : '',",
  "      class_type: 'supplemental',",
  "      class_name: row?.groupName || row?.title || 'Học bổ sung',",
  "      subject: row?.subject || '',",
  '      teacher_id: null,',
  "      teacher_name: row?.teacherName || '',",
  "      teacher_email: '',",
  "      attendance_date: row?.date || '',",
  '      checked_at: row?.attendanceConfirmedAt || null,',
  '      checked_by: null,',
  "      checked_by_name: row?.checkedByName || '',",
  '      total_students: Number(row?.totalStudents || participants.length || 0),',
  '      present_count: presentCount + tardyCount,',
  '      absent_count: Number(row?.absentCount || 0),',
  '      tardy_count: tardyCount,',
  "      note: row?.sessionNote || '',",
  "      session_status: row?.status === 'cancelled' ? 'cancelled' : 'completed',",
  '      lesson_periods: null,',
  "      cancellation_reason: row?.cancellationReason || '',",
  "      teaching_room: row?.room || '',",
  "      teaching_time_range: row?.timeRange || '',",
  "      proof_path: row?.proofPath || '',",
  '      created_at: null,',
  "      attendance_source: 'supplemental',",
  '      supplemental_session_id: sourceId,',
  '      history_records: participants.map((participant, index) => ({',
  "        id: 'supplemental-record:' + sourceId + ':' + (participant?.studentId || index),",
  "        session_id: 'supplemental:' + sourceId,",
  "        class_id: row?.groupId ? 'supplemental-group:' + row.groupId : '',",
  '        member_id: participant?.studentId || null,',
  "        member_key: participant?.canonicalStudentKey || '',",
  "        student_code: participant?.studentCode || '',",
  "        student_full_name: participant?.fullName || '',",
  "        school_class_name: participant?.schoolClassName || '',",
  "        status: participant?.status === 'tardy' ? ATTENDANCE_STATUS.LATE : normalizeAttendanceStatus(participant?.status, participant?.status !== 'absent'),",
  '        recorded_at: null,',
  "        absence_reason_code: participant?.absenceReasonCode || '',",
  "        absence_note: participant?.absenceNote || '',",
  '      })),',
  '    };',
  '  });',
  '}',
].join('\n');

let component = fs.readFileSync(componentPath, 'utf8');

if (!component.includes('const [supplementalHistorySessions, setSupplementalHistorySessions]')) {
  component = replaceOnce(
    component,
    "import { filterAndSortAttendanceHistory } from '../utils/attendanceHistoryFilters.js';\n",
    "import { filterAndSortAttendanceHistory } from '../utils/attendanceHistoryFilters.js';\nimport { canManageSupplementalLearning } from '../supplementalAccess.js';\n",
    'supplemental access import',
  );

  component = replaceOnce(
    component,
    '\n\nexport default function GlobalAttendanceNavigationTab({ currentUser }) {',
    '\n\n' + helperBlock + '\n\nexport default function GlobalAttendanceNavigationTab({ currentUser }) {',
    'supplemental history helpers',
  );

  component = replaceOnce(
    component,
    '  const [sessions, setSessions] = useState([]);\n  const [records, setRecords] = useState([]);',
    '  const [sessions, setSessions] = useState([]);\n  const [supplementalHistorySessions, setSupplementalHistorySessions] = useState([]);\n  const [records, setRecords] = useState([]);',
    'supplemental history state',
  );

  component = replaceOnce(
    component,
    '  const allowed = Boolean(currentUser?.id && (isAttendanceAdmin || hasAnyAttendanceAccess(currentUser)));\n',
    '  const allowed = Boolean(currentUser?.id && (isAttendanceAdmin || hasAnyAttendanceAccess(currentUser)));\n  const canSeeSupplementalHistory = canManageSupplementalLearning(runtime);\n',
    'supplemental visibility rule',
  );

  component = replaceOnce(
    component,
    [
      '    try {',
      '      const [classResult, memberResult, classTeacherResult, sessionResult] = await Promise.all([',
      "        client.from('bes_extra_classes').select(CLASS_COLUMNS).order('class_name', { ascending: true }),",
      "        client.from('bes_extra_class_members').select(MEMBER_COLUMNS).order('student_full_name', { ascending: true }),",
      "        client.from('bes_extra_class_teachers').select(CLASS_TEACHER_COLUMNS).order('position', { ascending: true }),",
      "        client.from('bes_extra_attendance_sessions').select(SESSION_COLUMNS).order('checked_at', { ascending: false }).limit(400),",
      '      ]);',
      '      const firstError = classResult.error || memberResult.error || classTeacherResult.error || sessionResult.error;',
    ].join('\n'),
    [
      '    try {',
      "      const supplementalHistoryPromise = canSeeSupplementalHistory && canAccessAttendanceView('history')",
      "        ? client.rpc('bes_list_supplemental_history', { p_from: '2000-01-01', p_to: today, p_query: '' })",
      '        : Promise.resolve({ data: [], error: null });',
      '      const [classResult, memberResult, classTeacherResult, sessionResult, supplementalHistoryResult] = await Promise.all([',
      "        client.from('bes_extra_classes').select(CLASS_COLUMNS).order('class_name', { ascending: true }),",
      "        client.from('bes_extra_class_members').select(MEMBER_COLUMNS).order('student_full_name', { ascending: true }),",
      "        client.from('bes_extra_class_teachers').select(CLASS_TEACHER_COLUMNS).order('position', { ascending: true }),",
      "        client.from('bes_extra_attendance_sessions').select(SESSION_COLUMNS).order('checked_at', { ascending: false }).limit(400),",
      '        supplementalHistoryPromise,',
      '      ]);',
      '      const firstError = classResult.error || memberResult.error || classTeacherResult.error || sessionResult.error || supplementalHistoryResult.error;',
    ].join('\n'),
    'load supplemental history',
  );

  component = replaceOnce(
    component,
    '      setClassTeachers(classTeacherResult.data || []);\n      setSessions(sessionResult.data || []);\n',
    '      setClassTeachers(classTeacherResult.data || []);\n      setSessions(sessionResult.data || []);\n      setSupplementalHistorySessions(normalizeSupplementalHistorySessions(supplementalHistoryResult.data || []));\n',
    'store supplemental history',
  );

  component = replaceRegexOnce(
    component,
    /  async function loadSessionRecords\(sessionId\) \{[\s\S]*?\n  \}\n\n/,
    [
      '  function loadSupplementalSessionRecords(session) {',
      '    if (!session || !isSupplementalHistorySession(session)) return;',
      '    setSelectedSessionId(session.id);',
      "    setError('');",
      '    setRecords(Array.isArray(session.history_records) ? session.history_records : []);',
      '  }',
      '',
      '  async function loadSessionRecords(sessionId) {',
      '    if (!client || !sessionId) return;',
      '    const supplementalSession = supplementalHistorySessions.find((session) => String(session.id) === String(sessionId));',
      '    if (supplementalSession) {',
      '      loadSupplementalSessionRecords(supplementalSession);',
      '      return;',
      '    }',
      '    setSelectedSessionId(sessionId);',
      "    setError('');",
      "    const { data, error: recordError } = await client.from('bes_extra_attendance_records').select(RECORD_COLUMNS).eq('session_id', sessionId).order('student_full_name', { ascending: true });",
      '    if (recordError) setError(recordError.message);',
      '    else setRecords(data || []);',
      '  }',
      '',
    ].join('\n'),
    'source-aware session detail',
  );

  component = replaceOnce(
    component,
    '  async function deleteAttendanceSession(session) {\n    if (!session || busy || !client || !canDeleteAttendanceHistory) return;',
    '  async function deleteAttendanceSession(session) {\n    if (!session || busy || !client || !canDeleteAttendanceHistory || isSupplementalHistorySession(session)) return;',
    'source-aware single delete',
  );

  component = replaceOnce(
    component,
    '  function toggleHistoryBulkSelection(sessionId) {\n    const key = String(sessionId);',
    '  function toggleHistoryBulkSelection(sessionId) {\n    const target = [...sessions, ...supplementalHistorySessions].find((session) => String(session.id) === String(sessionId));\n    if (isSupplementalHistorySession(target)) return;\n    const key = String(sessionId);',
    'source-aware bulk selection',
  );

  component = replaceOnce(
    component,
    '    const filteredIds = filteredHistory.map((session) => session.id);',
    '    const filteredIds = filteredHistory.filter((session) => !isSupplementalHistorySession(session)).map((session) => session.id);',
    'bulk select legacy sessions only',
  );

  component = replaceOnce(
    component,
    [
      '  const filteredHistory = useMemo(() => filterAndSortAttendanceHistory(sessions, {',
      '    query: historyQuery,',
      '    type: historyType,',
      '    dateFrom: historyDateFrom,',
      '    dateTo: historyDateTo,',
      '    sort: historySort,',
      '    getTeacher: teacherForSession,',
      '  }), [sessions, historyQuery, historyType, historyDateFrom, historyDateTo, historySort, classTeachers]);',
    ].join('\n'),
    [
      '  const combinedHistorySessions = useMemo(() => [...sessions, ...supplementalHistorySessions], [sessions, supplementalHistorySessions]);',
      '  const filteredHistory = useMemo(() => filterAndSortAttendanceHistory(combinedHistorySessions, {',
      '    query: historyQuery,',
      '    type: historyType,',
      '    dateFrom: historyDateFrom,',
      '    dateTo: historyDateTo,',
      '    sort: historySort,',
      '    getTeacher: teacherForSession,',
      '  }), [combinedHistorySessions, historyQuery, historyType, historyDateFrom, historyDateTo, historySort, classTeachers]);',
    ].join('\n'),
    'combine history sources',
  );

  component = replaceOnce(
    component,
    '  const selectedSession = sessions.find((session) => String(session.id) === String(selectedSessionId)) || calendarSessions.find((session) => String(session.id) === String(selectedSessionId));',
    '  const selectedSession = combinedHistorySessions.find((session) => String(session.id) === String(selectedSessionId)) || calendarSessions.find((session) => String(session.id) === String(selectedSessionId));',
    'selected history session from combined source',
  );

  component = replaceOnce(
    component,
    '<label><span>Loại lớp</span><select value={historyType} onChange={(event) => setHistoryType(event.target.value)}><option value="all">Tất cả loại lớp</option><option value="remedial">Phụ đạo</option><option value="gifted">Bồi dưỡng HSG</option></select></label>',
    '<label><span>Loại lớp</span><select value={historyType} onChange={(event) => setHistoryType(event.target.value)}><option value="all">Tất cả loại lớp</option><option value="remedial">Phụ đạo</option><option value="gifted">Bồi dưỡng HSG</option>{canSeeSupplementalHistory ? <option value="supplemental">Học bổ sung</option> : null}</select></label>',
    'native supplemental history filter',
  );

  component = component.replaceAll('extraClassTypeLabel(session.class_type)', 'historyClassTypeLabel(session)');
  component = component.replaceAll('extraClassTypeLabel(selectedSession.class_type)', 'historyClassTypeLabel(selectedSession)');

  component = replaceOnce(
    component,
    "{canAccessAttendanceView('report') ? <button type=\"button\" className=\"ahv3__report-button\"",
    "{canAccessAttendanceView('report') && !isSupplementalHistorySession(selectedSession) ? <button type=\"button\" className=\"ahv3__report-button\"",
    'hide legacy report action for supplemental',
  );

  component = replaceOnce(
    component,
    '{canDeleteAttendanceHistory ? <button type="button" className="ahv3__delete-button"',
    '{canDeleteAttendanceHistory && !isSupplementalHistorySession(selectedSession) ? <button type="button" className="ahv3__delete-button"',
    'hide legacy delete action for supplemental',
  );

  fs.writeFileSync(componentPath, component);
}

let bootstrap = fs.readFileSync(bootstrapPath, 'utf8');
if (!bootstrap.includes("activityType === 'supplemental' ? 'supplemental'")) {
  bootstrap = replaceOnce(
    bootstrap,
    "  const mapped = activityType === 'enrichment' ? 'gifted' : activityType === 'remedial' ? 'remedial' : 'all';",
    "  const mapped = activityType === 'enrichment' ? 'gifted' : activityType === 'remedial' ? 'remedial' : activityType === 'supplemental' ? 'supplemental' : 'all';",
    'top history filter mapping',
  );

  bootstrap = replaceRegexOnce(
    bootstrap,
    /    if \(activeTab === 'history'\) \{[\s\S]*?\n    \} else if \(activeTab === 'report'\) \{/,
    [
      "    if (activeTab === 'history') {",
      '      syncLegacyHistoryFilter(filter);',
      '      closePanel();',
      '      return;',
      "    } else if (activeTab === 'report') {",
    ].join('\n'),
    'use native history surface for all history types',
  );

  fs.writeFileSync(bootstrapPath, bootstrap);
}

console.log('Applied native supplemental attendance history integration.');
